import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { resetPasswordRateLimit, enforceLimit } from '@/lib/ratelimit';
import { getIp } from '@/lib/audit';
import { passwordSchema } from '@/lib/passwordPolicy';
import { hashResetToken } from '@/lib/resetToken';

const bodySchema = z.object({
  token: z
    .string()
    .min(32, 'Invalid reset link')
    .max(256, 'Invalid reset link'),
  password: passwordSchema,
});

export async function POST(req: Request) {
  // Defense-in-depth rate limit. Tokens are 2^256 random, so brute-forcing the
  // token is already infeasible — this caps the attempt rate anyway so we don't
  // burn CPU on bcrypt.hash() under a flood.
  const ip = getIp(req) ?? 'unknown';
  const { allowed, message } = await enforceLimit(
    resetPasswordRateLimit,
    ip,
    'Too many reset attempts. Please wait 15 minutes before trying again.',
  );
  if (!allowed) {
    return NextResponse.json({ error: message }, { status: 429 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid request' },
      { status: 400 },
    );
  }
  const { token, password } = parsed.data;

  // The DB stores sha256(rawToken), not the raw token. Hash the incoming
  // value and look it up by hash. See forgot-password/route.ts for rationale.
  const tokenHash = hashResetToken(token);
  const record = await prisma.passwordResetToken.findUnique({
    where: { token: tokenHash },
  });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return NextResponse.json(
      { error: 'This reset link is invalid or has expired' },
      { status: 400 },
    );
  }

  const hashed = await bcrypt.hash(password, 12);
  const now = new Date();

  // Claim the token and change the password in one transaction. The claim is
  // conditional on usedAt still being null, so two concurrent requests with
  // the same link cannot both succeed. Bumping passwordChangedAt invalidates
  // every JWT issued before the reset (see the jwt() callback in lib/auth.ts).
  const claimed = await prisma.$transaction(async (tx) => {
    const claim = await tx.passwordResetToken.updateMany({
      where: { id: record.id, usedAt: null, expiresAt: { gt: now } },
      data: { usedAt: now },
    });
    if (claim.count !== 1) return false;

    await tx.user.update({
      where: { id: record.userId },
      data: { password: hashed, passwordChangedAt: now },
    });
    // Any other outstanding links for this account are now pointless.
    await tx.passwordResetToken.deleteMany({
      where: { userId: record.userId, usedAt: null },
    });
    return true;
  });

  if (!claimed) {
    return NextResponse.json(
      { error: 'This reset link is invalid or has expired' },
      { status: 400 },
    );
  }

  return NextResponse.json({ success: true });
}

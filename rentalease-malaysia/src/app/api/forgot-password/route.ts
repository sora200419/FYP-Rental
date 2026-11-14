import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendPasswordResetEmail } from '@/lib/email';
import { forgotPasswordRateLimit, enforceLimit } from '@/lib/ratelimit';
import crypto from 'crypto';
import { hashResetToken } from '@/lib/resetToken';

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const email = body?.email;

  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  const normalisedEmail = email.toLowerCase().trim();

  // Rate limit by email — caps both the email-bombing surface (your Resend
  // bill) and the timing-based account-enumeration surface (an attacker can't
  // probe 10,000 emails per second to see which ones take longer because they
  // exist in the DB).
  const { allowed, message } = await enforceLimit(
    forgotPasswordRateLimit,
    normalisedEmail,
    'Too many reset requests. Please wait 15 minutes before trying again.',
  );
  if (!allowed) {
    return NextResponse.json({ error: message }, { status: 429 });
  }

  const user = await prisma.user.findUnique({ where: { email: normalisedEmail } });

  // Always return success to prevent email enumeration. Removed and suspended
  // accounts get no link either (they could not sign in with it).
  if (!user || user.deletedAt || user.isSuspended) {
    return NextResponse.json({ success: true });
  }

  // Invalidate any previous unused tokens for this user
  await prisma.passwordResetToken.deleteMany({
    where: { userId: user.id, usedAt: null },
  });

  // Generate a 32-byte random token (256 bits of entropy). The RAW token goes
  // in the email URL; only its SHA-256 hash is stored in the DB. See
  // hashResetToken() above for rationale.
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashResetToken(rawToken);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.passwordResetToken.create({
    data: { token: tokenHash, userId: user.id, expiresAt },
  });

  const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${rawToken}`;
  await sendPasswordResetEmail(user.email, resetUrl);

  return NextResponse.json({ success: true });
}

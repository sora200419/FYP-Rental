import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendPasswordResetEmail } from '@/lib/email';
import crypto from 'crypto';

export async function POST(req: Request) {
  const { email } = await req.json();

  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });

  // Always return success to prevent email enumeration
  if (!user) {
    return NextResponse.json({ success: true });
  }

  // Invalidate any previous unused tokens for this user
  await prisma.passwordResetToken.deleteMany({
    where: { userId: user.id, usedAt: null },
  });

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.passwordResetToken.create({
    data: { token, userId: user.id, expiresAt },
  });

  const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}`;
  await sendPasswordResetEmail(user.email, resetUrl);

  return NextResponse.json({ success: true });
}

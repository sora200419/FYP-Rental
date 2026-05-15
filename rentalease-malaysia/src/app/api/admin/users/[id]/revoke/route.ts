import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createNotification } from '@/lib/notifications';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  if (session.user.role !== 'ADMIN')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  let body: { reason?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
  const reason = body.reason?.trim();

  if (!reason)
    return NextResponse.json({ error: 'Revocation reason is required' }, { status: 400 });

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true, name: true, isVerified: true },
  });

  if (!user || user.role === 'ADMIN')
    return NextResponse.json({ error: 'User not found' }, { status: 404 });

  if (!user.isVerified)
    return NextResponse.json({ error: 'User is not currently verified' }, { status: 400 });

  await prisma.user.update({
    where: { id },
    data: { isVerified: false, kycRejectedReason: reason },
  });

  await createNotification(
    id,
    'ACCOUNT_VERIFICATION_REVOKED',
    'Identity verification revoked',
    `Your identity verification has been revoked by an admin. Reason: ${reason}. Please re-upload your documents for review.`,
    '/dashboard/profile',
  );

  return NextResponse.json({ message: 'Verification revoked' });
}

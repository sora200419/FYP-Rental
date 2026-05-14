import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createNotification } from '@/lib/notifications';
import { sendKycApprovedEmail } from '@/lib/email';

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;

  const submission = await prisma.kycSubmission.findUnique({
    where: { id },
    include: { user: { select: { id: true, name: true, email: true, role: true } } },
  });

  if (!submission) return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
  if (submission.status !== 'PENDING')
    return NextResponse.json({ error: 'Submission is not pending' }, { status: 409 });

  await prisma.$transaction([
    prisma.kycSubmission.update({
      where: { id },
      data: { status: 'APPROVED', reviewedById: session.user.id, reviewedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: submission.userId },
      data: { isVerified: true, kycRejectedReason: null },
    }),
  ]);

  sendKycApprovedEmail(submission.user.email, submission.user.name);

  await createNotification(
    submission.userId,
    'ACCOUNT_VERIFIED',
    'Identity verified',
    `Welcome, ${submission.user.name}! Your identity has been verified. You can now use all features on RentalEase.`,
    submission.user.role === 'LANDLORD' ? '/dashboard/landlord/properties' : '/dashboard/tenant',
  );

  return NextResponse.json({ message: 'KYC approved' });
}

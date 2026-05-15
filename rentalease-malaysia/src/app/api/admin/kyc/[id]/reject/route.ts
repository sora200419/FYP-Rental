import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createNotification } from '@/lib/notifications';
import { sendKycRejectedEmail } from '@/lib/email';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  let body: { reason?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
  const reason = body.reason?.trim();
  if (!reason)
    return NextResponse.json({ error: 'Rejection reason is required' }, { status: 400 });
  if (reason.length > 500)
    return NextResponse.json({ error: 'Rejection reason must be 500 characters or fewer' }, { status: 400 });

  const submission = await prisma.kycSubmission.findUnique({
    where: { id },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  if (!submission) return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
  if (submission.status !== 'PENDING')
    return NextResponse.json({ error: 'Submission is not pending' }, { status: 409 });

  await prisma.$transaction([
    prisma.kycSubmission.update({
      where: { id },
      data: { status: 'REJECTED', rejectedReason: reason, reviewedById: session.user.id, reviewedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: submission.userId },
      data: { kycRejectedReason: reason },
    }),
  ]);

  sendKycRejectedEmail(submission.user.email, submission.user.name, reason).catch((err) =>
    console.error('[kyc] rejection email failed:', err),
  );

  await createNotification(
    submission.userId,
    'ACCOUNT_KYC_REJECTED',
    'Identity verification rejected',
    `Your identity verification was not approved. Reason: ${reason}. Please resubmit with clearer photos.`,
    '/dashboard/kyc',
  );

  return NextResponse.json({ message: 'KYC rejected' });
}

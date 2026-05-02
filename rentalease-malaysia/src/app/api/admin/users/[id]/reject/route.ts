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
  const body = await request.json();
  const reason = (body.reason as string)?.trim();

  if (!reason)
    return NextResponse.json({ error: 'Rejection reason is required' }, { status: 400 });

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true, name: true },
  });

  if (!user || user.role === 'ADMIN')
    return NextResponse.json({ error: 'User not found' }, { status: 404 });

  await prisma.user.update({
    where: { id },
    data: { kycRejectedReason: reason },
  });

  await createNotification(
    id,
    'ACCOUNT_KYC_REJECTED',
    'Identity verification rejected',
    `Your identity verification could not be approved. Reason: ${reason}. Please update your IC number or re-upload a clearer photo of your IC, then your submission will be reviewed again.`,
    '/dashboard/profile',
  );

  return NextResponse.json({ message: 'KYC rejected' });
}

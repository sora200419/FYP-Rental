// src/app/api/payments/[id]/verify/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createNotification } from '@/lib/notifications';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'LANDLORD') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: paymentId } = await params;
  const body = await request.json();
  const { action, rejectionReason } = body; // action: 'APPROVE' | 'REJECT'

  if (!['APPROVE', 'REJECT'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  if (action === 'REJECT' && !rejectionReason?.trim()) {
    return NextResponse.json(
      { error: 'Please provide a reason for rejection' },
      { status: 400 },
    );
  }

  // Verify the payment belongs to this landlord's property
  const payment = await prisma.rentPayment.findUnique({
    where: { id: paymentId },
    include: {
      tenancy: {
        include: {
          tenant: { select: { id: true, name: true } },
          room: {
            include: {
              property: {
                select: { landlordId: true, address: true },
              },
            },
          },
        },
      },
    },
  });

  if (!payment) {
    return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
  }

  if (payment.tenancy.room.property.landlordId !== session.user.id) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  if (payment.status !== 'UNDER_REVIEW') {
    return NextResponse.json(
      { error: 'This payment is not awaiting verification' },
      { status: 409 },
    );
  }

  const tenantId = payment.tenancy.tenant.id;
  const propertyAddress = payment.tenancy.room.property.address;

  if (action === 'APPROVE') {
    await prisma.rentPayment.update({
      where: { id: paymentId },
      data: {
        status: 'PAID',
        paidDate: new Date(),
        rejectionReason: null,
      },
    });

    await createNotification(
      tenantId,
      'PAYMENT_APPROVED',
      'Payment approved',
      `Your payment for ${propertyAddress} has been approved.`,
      `/dashboard/tenant/payments`,
    );

    return NextResponse.json({ ok: true, status: 'PAID' });
  }

  // REJECT
  await prisma.rentPayment.update({
    where: { id: paymentId },
    data: {
      status: 'PENDING',
      rejectionReason,
    },
  });

  await createNotification(
    tenantId,
    'PAYMENT_REJECTED',
    'Payment proof rejected',
    `Your payment proof for ${propertyAddress} was rejected: ${rejectionReason}. Please re-upload.`,
    `/dashboard/tenant/payments`,
  );

  return NextResponse.json({ ok: true, status: 'PENDING' });
}

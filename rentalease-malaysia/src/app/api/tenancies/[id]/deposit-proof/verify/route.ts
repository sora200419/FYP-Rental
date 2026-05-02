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

  const { id: tenancyId } = await params;
  const body = await request.json();
  const { action, rejectionReason } = body as {
    action: string;
    rejectionReason?: string;
  };

  if (action !== 'APPROVE' && action !== 'REJECT') {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  const tenancy = await prisma.tenancy.findUnique({
    where: { id: tenancyId },
    include: {
      room: {
        include: {
          property: { select: { landlordId: true, address: true } },
        },
      },
      tenant: { select: { id: true, name: true } },
    },
  });

  if (!tenancy || tenancy.room.property.landlordId !== session.user.id) {
    return NextResponse.json({ error: 'Tenancy not found' }, { status: 404 });
  }

  if (tenancy.depositStatus !== 'UNDER_REVIEW') {
    return NextResponse.json(
      { error: 'Deposit is not under review' },
      { status: 409 },
    );
  }

  if (action === 'APPROVE') {
    await prisma.tenancy.update({
      where: { id: tenancyId },
      data: { depositStatus: 'PAID', depositRejectionReason: null },
    });

    await createNotification(
      tenancy.tenantId,
      'DEPOSIT_PROOF_APPROVED',
      'Deposit confirmed',
      `Your deposit payment for ${tenancy.room.property.address} has been confirmed by your landlord.`,
      `/dashboard/tenant/tenancy`,
    );
  } else {
    if (!rejectionReason || rejectionReason.trim().length < 10) {
      return NextResponse.json(
        { error: 'Rejection reason must be at least 10 characters' },
        { status: 400 },
      );
    }

    await prisma.tenancy.update({
      where: { id: tenancyId },
      data: {
        depositStatus: 'REJECTED',
        depositRejectionReason: rejectionReason.trim(),
      },
    });

    await createNotification(
      tenancy.tenantId,
      'DEPOSIT_PROOF_REJECTED',
      'Deposit proof rejected',
      `Your deposit proof for ${tenancy.room.property.address} was rejected. Reason: ${rejectionReason.trim()}`,
      `/dashboard/tenant/tenancy`,
    );
  }

  return NextResponse.json({ ok: true });
}

// src/app/api/agreements/[id]/finalize/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createNotification } from '@/lib/notifications';
import { sendAgreementReadyEmail } from '@/lib/email';

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'LANDLORD') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  // Verify the agreement exists and the landlord owns it
  const agreement = await prisma.agreement.findUnique({
    where: { id },
    include: {
      tenancy: {
        select: {
          status: true,
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

  if (!agreement) {
    return NextResponse.json({ error: 'Agreement not found' }, { status: 404 });
  }

  if (agreement.tenancy.room.property.landlordId !== session.user.id) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  if (!['DRAFT', 'NEGOTIATING'].includes(agreement.status)) {
    return NextResponse.json(
      { error: 'Agreement cannot be finalized from its current status' },
      { status: 409 },
    );
  }

  if (!['PENDING', 'ACTIVE'].includes(agreement.tenancy.status)) {
    return NextResponse.json(
      { error: 'Agreement cannot be finalized because the tenancy has ended' },
      { status: 409 },
    );
  }

  await prisma.agreement.update({
    where: { id },
    data: { status: 'FINALIZED' },
  });

  // Fetch tenant email for email notification
  const tenantUser = await prisma.user.findUnique({
    where: { id: agreement.tenancy.tenant.id },
    select: { email: true },
  });

  // Notify tenant to review and sign
  await createNotification(
    agreement.tenancy.tenant.id,
    'AGREEMENT_READY',
    'Your agreement is ready to review',
    `Your tenancy agreement for ${agreement.tenancy.room.property.address} has been finalized and is ready for your review and signature.`,
    `/dashboard/tenant/tenancy`,
  );

  // Send email (non-blocking)
  if (tenantUser) {
    sendAgreementReadyEmail(
      tenantUser.email,
      agreement.tenancy.tenant.name,
      agreement.tenancy.room.property.address,
      id,
    );
  }

  return NextResponse.json({ ok: true });
}

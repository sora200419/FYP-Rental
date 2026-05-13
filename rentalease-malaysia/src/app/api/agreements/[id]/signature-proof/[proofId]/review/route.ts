import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createNotification } from '@/lib/notifications';
import { buildAgreementEvent } from '@/lib/agreements/history';
import { buildRentScheduleEntries } from '@/lib/payments';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; proofId: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'LANDLORD') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id, proofId } = await params;
  const body = await request.json();
  const { action, rejectionReason } = body as {
    action: 'APPROVE' | 'REJECT';
    rejectionReason?: string;
  };

  if (action !== 'APPROVE' && action !== 'REJECT') {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  const agreement = await prisma.agreement.findUnique({
    where: { id },
    include: {
      tenancy: {
        include: {
          tenant: { select: { id: true, name: true } },
          room: {
            include: {
              property: { select: { landlordId: true, address: true } },
            },
          },
          agreementPreferences: { select: { rentDueDay: true } },
        },
      },
      signatureProofs: {
        where: { id: proofId },
        take: 1,
      },
    },
  });

  if (
    !agreement ||
    agreement.tenancy.room.property.landlordId !== session.user.id
  ) {
    return NextResponse.json({ error: 'Agreement not found' }, { status: 404 });
  }

  const proof = agreement.signatureProofs[0] ?? null;
  if (!proof) {
    return NextResponse.json({ error: 'Signature proof not found' }, { status: 404 });
  }

  if (action === 'APPROVE' && proof.status === 'APPROVED') {
    return NextResponse.json({ ok: true, status: 'SIGNED' });
  }

  if (proof.status !== 'UNDER_REVIEW') {
    return NextResponse.json(
      { error: 'This signature proof is no longer under review.' },
      { status: 409 },
    );
  }

  if (agreement.status !== 'PENDING_SIGNATURE_PROOF') {
    return NextResponse.json(
      { error: 'This agreement is not awaiting signature proof review.' },
      { status: 409 },
    );
  }

  if (action === 'REJECT') {
    const trimmedReason = rejectionReason?.trim() ?? '';
    if (trimmedReason.length < 10) {
      return NextResponse.json(
        { error: 'Rejection reason must be at least 10 characters.' },
        { status: 400 },
      );
    }

    await prisma.$transaction([
      prisma.agreementSignatureProof.update({
        where: { id: proofId },
        data: {
          status: 'REJECTED',
          rejectionReason: trimmedReason,
          reviewedById: session.user.id,
          reviewedAt: new Date(),
        },
      }),
      prisma.agreementEvent.create({
        data: buildAgreementEvent({
          agreementId: id,
          type: 'SIGNATURE_PROOF_REJECTED',
          actorRole: 'LANDLORD',
          actorUserId: session.user.id,
          summary: 'Landlord rejected the signed hard-copy proof and requested a re-upload.',
        }),
      }),
    ]);

    await createNotification(
      agreement.tenancy.tenantId,
      'AGREEMENT_SIGNATURE_PROOF_REJECTED',
      'Signed agreement copy rejected',
      `Your uploaded signed copy for ${agreement.tenancy.room.property.address} was rejected. Reason: ${trimmedReason}`,
      '/dashboard/tenant/tenancy',
    );

    return NextResponse.json({ ok: true, status: 'PENDING_SIGNATURE_PROOF' });
  }

  const scheduledPayments = buildRentScheduleEntries(
    agreement.tenancyId,
    new Date(agreement.tenancy.startDate),
    new Date(agreement.tenancy.endDate),
    agreement.tenancy.monthlyRent,
    agreement.tenancy.agreementPreferences?.rentDueDay ?? null,
  );

  await prisma.$transaction(async (tx) => {
    await tx.agreementSignatureProof.update({
      where: { id: proofId },
      data: {
        status: 'APPROVED',
        rejectionReason: null,
        reviewedById: session.user.id,
        reviewedAt: new Date(),
      },
    });

    await tx.agreement.update({
      where: { id },
      data: { status: 'SIGNED' },
    });

    await tx.tenancy.update({
      where: { id: agreement.tenancyId },
      data: { status: 'ACTIVE' },
    });

    const existingPayments = await tx.rentPayment.count({
      where: { tenancyId: agreement.tenancyId },
    });
    if (existingPayments === 0 && scheduledPayments.length > 0) {
      await tx.rentPayment.createMany({ data: scheduledPayments });
    }

    await tx.agreementEvent.create({
      data: buildAgreementEvent({
        agreementId: id,
        type: 'SIGNATURE_PROOF_APPROVED',
        actorRole: 'LANDLORD',
        actorUserId: session.user.id,
        summary:
          'Landlord approved the signed hard-copy proof. The tenancy can now start.',
      }),
    });
  });

  await createNotification(
    agreement.tenancy.tenantId,
    'AGREEMENT_SIGNATURE_PROOF_APPROVED',
    'Agreement fully approved — tenancy is now active',
    `Your signed agreement for ${agreement.tenancy.room.property.address} has been approved by the landlord. The tenancy is now active and move-in can start.`,
    '/dashboard/tenant/tenancy',
  );

  return NextResponse.json({ ok: true, status: 'SIGNED' });
}

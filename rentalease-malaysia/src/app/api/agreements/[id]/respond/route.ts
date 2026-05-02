// src/app/api/agreements/[id]/respond/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createNotification } from '@/lib/notifications';
import { sendSystemMessage } from '@/lib/messages';
import { anchorHashToBlockchain } from '@/lib/blockchain';
import crypto from 'crypto';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'TENANT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { action, negotiationNotes } = body; // action: 'SIGN' | 'REQUEST_CHANGES'

  if (!['SIGN', 'REQUEST_CHANGES'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  if (action === 'REQUEST_CHANGES' && !negotiationNotes?.trim()) {
    return NextResponse.json(
      { error: 'Please describe the changes you are requesting' },
      { status: 400 },
    );
  }

  const agreement = await prisma.agreement.findUnique({
    where: { id },
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

  if (!agreement) {
    return NextResponse.json({ error: 'Agreement not found' }, { status: 404 });
  }

  if (agreement.tenancy.tenantId !== session.user.id) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  if (agreement.status !== 'FINALIZED') {
    return NextResponse.json(
      { error: 'This agreement is not in a state that can be responded to' },
      { status: 409 },
    );
  }

  const landlordId = agreement.tenancy.room.property.landlordId;
  const propertyAddress = agreement.tenancy.room.property.address;
  const tenantName = agreement.tenancy.tenant.name;

  // ── SIGN ──────────────────────────────────────────────────────────────────
  if (action === 'SIGN') {
    // Derive client IP for audit trail
    const forwarded = request.headers.get('x-forwarded-for');
    const signedByIp = forwarded ? forwarded.split(',')[0].trim() : 'unknown';

    // SHA-256 hash of the agreement content — this is the value that gets
    // anchored to the Sepolia testnet in a later phase.
    const contentHash = crypto
      .createHash('sha256')
      .update(agreement.rawContent)
      .digest('hex');

    // Generate monthly rent payment schedule for the tenancy duration
    const { startDate, endDate, monthlyRent } = agreement.tenancy;
    const payments: {
      dueDate: Date;
      amount: typeof monthlyRent;
      tenancyId: string;
    }[] = [];
    const cursor = new Date(startDate);
    while (cursor <= new Date(endDate)) {
      payments.push({
        dueDate: new Date(cursor),
        amount: monthlyRent,
        tenancyId: agreement.tenancyId,
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }

    await prisma.$transaction([
      prisma.agreement.update({
        where: { id },
        data: {
          status: 'SIGNED',
          contentHash,
          signedAt: new Date(),
          signedByIp,
          signedAcknowledged: true,
        },
      }),
      prisma.tenancy.update({
        where: { id: agreement.tenancyId },
        data: { status: 'ACTIVE' },
      }),
      prisma.rentPayment.createMany({ data: payments }),
    ]);

    await createNotification(
      landlordId,
      'AGREEMENT_SIGNED',
      'Agreement signed — tenancy is now active',
      `${tenantName} signed the tenancy agreement for ${propertyAddress}. The tenancy is now active.`,
      `/dashboard/landlord/tenancies/${agreement.tenancyId}`,
    );

    // Anchor the content hash to Sepolia — best-effort, must not block signing
    anchorHashToBlockchain(contentHash)
      .then((txHash) =>
        prisma.agreement.update({ where: { id }, data: { txHash } }),
      )
      .catch((err) => console.error('[Blockchain] Anchor failed:', err));

    return NextResponse.json({ ok: true, status: 'SIGNED' });
  }

  // ── REQUEST_CHANGES ────────────────────────────────────────────────────────
  await prisma.agreement.update({
    where: { id },
    data: {
      status: 'NEGOTIATING',
      negotiationNotes,
      negotiationRound: { increment: 1 },
    },
  });

  // Send a system message so the negotiation notes are visible in the
  // message thread alongside the conversation history
  await sendSystemMessage(
    agreement.tenancyId,
    session.user.id, // senderId — the tenant sending the note
    landlordId, // receiverId — the landlord who needs to see it
    `📝 Tenant requested agreement changes (Round ${agreement.negotiationRound + 1}):\n\n${negotiationNotes}`,
  );

  await createNotification(
    landlordId,
    'AGREEMENT_CHANGES_REQUESTED',
    'Tenant requested agreement changes',
    `${tenantName} requested changes to the agreement for ${propertyAddress}. Please review their notes and regenerate.`,
    `/dashboard/landlord/tenancies/${agreement.tenancyId}`,
  );

  return NextResponse.json({ ok: true, status: 'NEGOTIATING' });
}

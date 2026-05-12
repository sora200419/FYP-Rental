// src/app/api/agreements/[id]/respond/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  buildAgreementEvent,
  formatChangeRequestSummary,
  normalizeChangeRequest,
} from '@/lib/agreements/history';
import { createNotification } from '@/lib/notifications';
import { sendSystemMessage } from '@/lib/messages';
import { anchorHashToBlockchain } from '@/lib/blockchain';
import { sendAgreementSignedEmail } from '@/lib/email';
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
  const { action, negotiationNotes, signedAcknowledged, changeRequests } = body;

  if (!['SIGN', 'REQUEST_CHANGES'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  if (action === 'SIGN' && signedAcknowledged !== true) {
    return NextResponse.json(
      { error: 'Please acknowledge the agreement before signing.' },
      { status: 400 },
    );
  }

  const normalizedRequests =
    action === 'REQUEST_CHANGES' && Array.isArray(changeRequests)
      ? changeRequests
          .map((request) =>
            normalizeChangeRequest({
              category: String(request?.category ?? ''),
              requestedChange: String(request?.requestedChange ?? ''),
              reason: String(request?.reason ?? ''),
              note:
                request?.note === undefined || request?.note === null
                  ? null
                  : String(request.note),
            }),
          )
          .filter(
            (request) =>
              request.category &&
              request.requestedChange &&
              request.reason,
          )
      : [];

  if (action === 'REQUEST_CHANGES' && normalizedRequests.length === 0) {
    return NextResponse.json(
      { error: 'Add at least one structured change request before sending.' },
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
          // IMP-03: Fetch rentDueDay so the payment schedule uses the correct day of month
          agreementPreferences: { select: { rentDueDay: true } },
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

    // Generate monthly rent payment schedule using the wizard's rentDueDay (IMP-03).
    // Each due date is set to rentDueDay of each month, clamped to the last day of
    // the month for short months (e.g. day 31 in February → Feb 28/29).
    const { startDate, endDate, monthlyRent } = agreement.tenancy;
    const rentDueDay = agreement.tenancy.agreementPreferences?.rentDueDay ?? new Date(startDate).getDate();

    function dueDateForMonth(year: number, month: number): Date {
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      return new Date(year, month, Math.min(rentDueDay, daysInMonth));
    }

    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);

    // First due date: first occurrence of rentDueDay on or after startDate
    let year = startDateObj.getFullYear();
    let month = startDateObj.getMonth();
    let firstDue = dueDateForMonth(year, month);
    if (firstDue < startDateObj) {
      month += 1;
      if (month > 11) { month = 0; year += 1; }
      firstDue = dueDateForMonth(year, month);
    }

    const payments: { dueDate: Date; amount: typeof monthlyRent; tenancyId: string }[] = [];
    let curYear = firstDue.getFullYear();
    let curMonth = firstDue.getMonth();
    while (true) {
      const dueDate = dueDateForMonth(curYear, curMonth);
      if (dueDate > endDateObj) break;
      payments.push({ dueDate, amount: monthlyRent, tenancyId: agreement.tenancyId });
      curMonth += 1;
      if (curMonth > 11) { curMonth = 0; curYear += 1; }
    }

    await prisma.$transaction([
      prisma.agreement.update({
        where: { id },
        data: {
          status: 'SIGNED',
          contentHash,
          signedAt: new Date(),
          signedByIp,
          signedAcknowledged,
        },
      }),
      prisma.tenancy.update({
        where: { id: agreement.tenancyId },
        data: { status: 'ACTIVE' },
      }),
      prisma.rentPayment.createMany({ data: payments }),
      prisma.agreementEvent.create({
        data: buildAgreementEvent({
          agreementId: id,
          type: 'SIGNED',
          actorRole: 'TENANT',
          actorUserId: session.user.id,
          summary: 'Tenant signed the agreement electronically.',
        }),
      }),
    ]);

    await createNotification(
      landlordId,
      'AGREEMENT_SIGNED',
      'Agreement signed — tenancy is now active',
      `${tenantName} signed the tenancy agreement for ${propertyAddress}. The tenancy is now active.`,
      `/dashboard/landlord/tenancies/${agreement.tenancyId}`,
    );

    // Email landlord (non-blocking)
    const landlordUser = await prisma.user.findUnique({
      where: { id: landlordId },
      select: { email: true, name: true },
    });
    if (landlordUser) {
      sendAgreementSignedEmail(
        landlordUser.email,
        landlordUser.name,
        tenantName,
        propertyAddress,
        agreement.tenancyId,
      );
    }

    // Anchor the content hash to Sepolia — best-effort, must not block signing
    anchorHashToBlockchain(contentHash)
      .then((txHash) =>
        prisma.agreement.update({ where: { id }, data: { txHash } }),
      )
      .catch((err) => console.error('[Blockchain] Anchor failed:', err));

    return NextResponse.json({ ok: true, status: 'SIGNED' });
  }

  // ── REQUEST_CHANGES ────────────────────────────────────────────────────────
  const compiledNotes = formatChangeRequestSummary(
    normalizedRequests,
    typeof negotiationNotes === 'string' ? negotiationNotes : null,
  );

  await prisma.$transaction([
    prisma.agreement.update({
      where: { id },
      data: {
        status: 'NEGOTIATING',
        negotiationNotes: compiledNotes,
        negotiationRound: { increment: 1 },
      },
    }),
    prisma.agreementChangeRequest.createMany({
      data: normalizedRequests.map((changeRequest) => ({
        agreementId: id,
        category: changeRequest.category,
        requestedChange: changeRequest.requestedChange,
        reason: changeRequest.reason,
        note: changeRequest.note,
        createdByUserId: session.user.id,
      })),
    }),
    prisma.agreementEvent.create({
      data: buildAgreementEvent({
        agreementId: id,
        type: 'REQUESTED_CHANGES',
        actorRole: 'TENANT',
        actorUserId: session.user.id,
        summary: `Tenant requested ${normalizedRequests.length} structured agreement change(s).`,
      }),
    }),
  ]);

  // Send a system message so the negotiation notes are visible in the
  // message thread alongside the conversation history
  await sendSystemMessage(
    agreement.tenancyId,
    session.user.id, // senderId — the tenant sending the note
    landlordId, // receiverId — the landlord who needs to see it
    `📝 Tenant requested agreement changes (Round ${agreement.negotiationRound + 1}):\n\n${compiledNotes}`,
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

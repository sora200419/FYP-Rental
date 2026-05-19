// src/app/api/agreements/[id]/finalize/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  buildAgreementEvent,
  isFinalizeBlocked,
} from '@/lib/agreements/history';
import { createNotification } from '@/lib/notifications';
import { sendAgreementReadyEmail } from '@/lib/email';

const confirmedTermsSchema = z
  .object({
    startDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'startDate must be YYYY-MM-DD')
      .refine((s) => !isNaN(new Date(s).getTime()), 'startDate is not a valid calendar date'),
    endDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'endDate must be YYYY-MM-DD')
      .refine((s) => !isNaN(new Date(s).getTime()), 'endDate is not a valid calendar date'),
    monthlyRent: z.coerce
      .number()
      .positive('Monthly rent must be greater than 0'),
    depositAmount: z.coerce
      .number()
      .min(0, 'Deposit amount must be 0 or more'),
  })
  // String compare is safe — regex above guarantees YYYY-MM-DD, where lexical ordering equals chronological ordering.
  .refine((d) => d.endDate > d.startDate, {
    message: 'End date must be after start date',
    path: ['endDate'],
  });

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'LANDLORD') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const reviewedRedFlags = body?.reviewedRedFlags === true;

  const confirmedTermsResult = confirmedTermsSchema.safeParse(body?.confirmedTerms);
  if (!confirmedTermsResult.success) {
    return NextResponse.json(
      { error: confirmedTermsResult.error.issues[0]?.message ?? 'Invalid confirmedTerms' },
      { status: 400 },
    );
  }
  const { startDate, endDate, monthlyRent, depositAmount } = confirmedTermsResult.data;

  // Verify the agreement exists and the landlord owns it
  const agreement = await prisma.agreement.findUnique({
    where: { id },
    include: {
      changeRequests: {
        where: { status: 'PENDING' },
        select: { id: true },
      },
      tenancy: {
        select: {
          id: true,
          status: true,
          tenant: { select: { id: true, name: true, icNumber: true } },
          agreementPreferences: { select: { isComplete: true } },
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

  const checklist = isFinalizeBlocked({
    hasRawContent: agreement.rawContent.trim().length > 0,
    isWizardComplete: agreement.tenancy.agreementPreferences?.isComplete === true,
    hasReviewedRedFlags: reviewedRedFlags,
    unresolvedStructuredRequests: agreement.changeRequests.length,
    hasRequiredIdentityData: Boolean(agreement.tenancy.tenant.icNumber?.trim()),
    isFinalizableStatus: true,
  });

  if (checklist.blocked) {
    return NextResponse.json(
      {
        error: 'Agreement is not ready to finalize yet.',
        checklist,
      },
      { status: 409 },
    );
  }

  await prisma.$transaction([
    prisma.agreement.update({
      where: { id },
      data: { status: 'FINALIZED' },
    }),
    prisma.tenancy.update({
      where: { id: agreement.tenancy.id },
      data: {
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        monthlyRent,
        depositAmount,
      },
    }),
    prisma.agreementEvent.create({
      data: buildAgreementEvent({
        agreementId: id,
        type: 'FINALIZED',
        actorRole: 'LANDLORD',
        actorUserId: session.user.id,
        summary: 'Landlord finalized the agreement for tenant review.',
      }),
    }),
  ]);

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
      agreement.tenancy.tenant.name ?? 'Tenant',
      agreement.tenancy.room.property.address,
      id,
    ).catch(console.error);
  }

  return NextResponse.json({ ok: true, checklist });
}

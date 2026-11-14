import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { createNotification } from '@/lib/notifications';
import { sendInvitationEmail } from '@/lib/email';
import { getIp } from '@/lib/audit';
import { deleteUnstartedTenancy } from '@/lib/tenancyCancellation';
import { getUnstartedTenancyCancellationBlocker } from '@/lib/tenancyLifecycle';
import { tenantTenancyHref } from '@/lib/tenantLinks';

const editSchema = z
  .object({
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().min(1, 'End date is required'),
    monthlyRent: z.coerce
      .number()
      .positive('Monthly rent must be greater than 0'),
    depositAmount: z.coerce.number().min(0, 'Deposit must be 0 or more'),
    invitationEmail: z
      .string()
      .trim()
      .optional()
      .refine((value) => !value || z.email().safeParse(value).success, {
        message: 'Invitation email must be a valid email address',
      }),
  })
  .refine((data) => new Date(data.endDate) > new Date(data.startDate), {
    message: 'End date must be after start date',
    path: ['endDate'],
  });

// IMP-10: Single tenancy fetch endpoint
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const { id: tenancyId } = await params;

  const tenancy = await prisma.tenancy.findFirst({
    where: {
      id: tenancyId,
      OR: [
        { room: { property: { landlordId: session.user.id } } },
        { tenantId: session.user.id },
      ],
    },
    include: {
      tenant: { select: { id: true, name: true, email: true, phone: true } },
      room: {
        include: {
          property: { select: { id: true, address: true, city: true, state: true } },
        },
      },
      agreement: { select: { id: true, status: true } },
      rentPayments: {
        select: { id: true, status: true, dueDate: true, amount: true },
        orderBy: { dueDate: 'asc' },
      },
    },
  });

  if (!tenancy) return NextResponse.json({ error: 'Tenancy not found or access denied' }, { status: 404 });
  return NextResponse.json(tenancy);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  if (session.user.role !== 'LANDLORD')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id: tenancyId } = await params;

  // Authorization: landlord must own this tenancy via room → property chain
  const tenancy = await prisma.tenancy.findFirst({
    where: {
      id: tenancyId,
      room: { property: { landlordId: session.user.id } },
    },
    include: {
      room: {
        include: {
          property: {
            select: { address: true, city: true, landlordId: true },
          },
        },
      },
      tenant: {
        select: { id: true, name: true, email: true },
      },
      authorizedSignatoryUser: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  if (!tenancy)
    return NextResponse.json(
      { error: 'Tenancy not found or access denied' },
      { status: 404 },
    );

  // Only INVITED or PENDING tenancies can be edited.
  // ACTIVE means the agreement is signed — terms are locked permanently.
  if (!['INVITED', 'PENDING'].includes(tenancy.status)) {
    return NextResponse.json(
      {
        error:
          tenancy.status === 'ACTIVE'
            ? 'This tenancy is already active. Terms cannot be changed after the agreement is signed.'
            : 'Only invited or pending tenancies can be edited.',
      },
      { status: 409 },
    );
  }

  // Allow edits when agreement is in DRAFT or NEGOTIATING status.
  // Block once it is FINALIZED or signed in any form (BUG-06) — after the
  // tenant's digital signature the terms must match the signed text.
  const existingAgreement = await prisma.agreement.findUnique({
    where: { tenancyId },
    select: { id: true, status: true },
  });

  if (
    existingAgreement &&
    ['FINALIZED', 'PENDING_SIGNATURE_PROOF', 'SIGNED'].includes(existingAgreement.status)
  ) {
    return NextResponse.json(
      {
        error:
          'The agreement has already been finalised. Terms cannot be changed at this stage.',
      },
      { status: 409 },
    );
  }

  try {
    const body = await request.json();
    const data = editSchema.parse(body);

    const today = new Date().toISOString().split('T')[0];
    if (data.startDate < today) {
      return NextResponse.json(
        { error: 'Start date cannot be in the past' },
        { status: 400 },
      );
    }
    const normalizedInvitationEmail = data.invitationEmail?.toLowerCase() ?? null;
    let recipientUpdateData: Record<string, string | null> = {};
    let newRecipient:
      | { id: string; name: string | null; email: string | null }
      | null = null;

    if (normalizedInvitationEmail) {
      const currentRecipientEmail =
        tenancy.leasePartyType === 'CORPORATE'
          ? tenancy.authorizedSignatoryUser?.email?.toLowerCase() ??
            tenancy.tenant.email?.toLowerCase() ??
            null
          : tenancy.tenant.email?.toLowerCase() ?? null;

      if (tenancy.status !== 'INVITED' && normalizedInvitationEmail !== currentRecipientEmail) {
        return NextResponse.json(
          {
            error:
              'The invitation recipient can only be changed before the tenant accepts the invitation.',
          },
          { status: 409 },
        );
      }

      if (normalizedInvitationEmail !== currentRecipientEmail) {
        const replacementUser = await prisma.user.findUnique({
          where: { email: normalizedInvitationEmail },
          select: { id: true, name: true, email: true, role: true },
        });

        if (!replacementUser || replacementUser.role !== 'TENANT') {
          return NextResponse.json(
            { error: 'No tenant account found with that email address' },
            { status: 404 },
          );
        }

        newRecipient = replacementUser;
        recipientUpdateData =
          tenancy.leasePartyType === 'CORPORATE'
            ? {
                tenantId: replacementUser.id,
                authorizedSignatoryUserId: replacementUser.id,
                authorizedSignatoryName:
                  replacementUser.name ?? tenancy.authorizedSignatoryName ?? tenancy.tenant.name,
              }
            : { tenantId: replacementUser.id };
      }
    }

    const updated = await prisma.tenancy.update({
      where: { id: tenancyId },
      data: {
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        monthlyRent: data.monthlyRent,
        depositAmount: data.depositAmount,
        ...recipientUpdateData,
      },
      select: {
        id: true,
        startDate: true,
        endDate: true,
        monthlyRent: true,
        depositAmount: true,
        status: true,
        tenant: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (newRecipient?.id && newRecipient.email) {
      await createNotification(
        newRecipient.id,
        'INVITATION_RECEIVED',
        'Updated tenancy invitation',
        `You have received a tenancy invitation for ${tenancy.room.property.address}, ${tenancy.room.property.city}.`,
        tenantTenancyHref(tenancyId),
      );

      const landlordUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { name: true },
      });

      sendInvitationEmail(
        newRecipient.email,
        newRecipient.name ?? 'Tenant',
        `${tenancy.room.property.address}, ${tenancy.room.property.city}`,
        landlordUser?.name ?? 'Your landlord',
        tenancyId,
      ).catch(console.error);
    }

    return NextResponse.json(
      {
        message:
          newRecipient
            ? 'Tenancy invitation updated and resent successfully.'
            : 'Tenancy terms updated successfully.',
        tenancy: updated,
      },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 },
      );
    console.error('Edit tenancy error:', error);
    return NextResponse.json(
      { error: 'Failed to update tenancy.' },
      { status: 500 },
    );
  }
}

// DELETE /api/tenancies/[id]
// Landlord cancels an invitation, or a tenancy that has not started yet. Not
// allowed once the tenant has submitted the deposit or signed the agreement
// (getUnstartedTenancyCancellationBlocker); after that the tenancy has to
// run its course.
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  if (session.user.role !== 'LANDLORD')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const tenancy = await prisma.tenancy.findFirst({
    where: { id, room: { property: { landlordId: session.user.id } } },
    select: {
      status: true,
      depositStatus: true,
      tenantId: true,
      agreement: { select: { status: true } },
      room: { select: { label: true, property: { select: { address: true } } } },
    },
  });
  if (!tenancy) return NextResponse.json({ error: 'Tenancy not found' }, { status: 404 });

  const blocker = getUnstartedTenancyCancellationBlocker({
    tenancyStatus: tenancy.status,
    depositStatus: tenancy.depositStatus,
    agreementStatus: tenancy.agreement?.status,
  });
  if (blocker) return NextResponse.json({ error: blocker }, { status: 409 });

  await deleteUnstartedTenancy({
    tenancyId: id,
    actorId: session.user.id,
    action: 'TENANCY_CANCELLED',
    reason: 'CANCELLED_BY_LANDLORD',
    ipAddress: getIp(request),
  });

  await createNotification(
    tenancy.tenantId,
    'INVITATION_RESPONDED',
    tenancy.status === 'INVITED' ? 'Tenancy invitation cancelled' : 'Tenancy cancelled',
    `The landlord cancelled the tenancy for ${tenancy.room.label} at ${tenancy.room.property.address}.`,
    '/dashboard/tenant',
  );

  return NextResponse.json({ ok: true });
}

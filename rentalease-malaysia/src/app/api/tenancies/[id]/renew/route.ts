// POST /api/tenancies/[id]/renew
// Landlord creates a renewal tenancy for the same room and tenant,
// linked via renewalOfTenancyId. The new tenancy starts in INVITED state
// so the tenant must re-accept before an agreement is drafted.
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { syncRoomAvailability } from '@/lib/roomAvailability';
import { createNotification } from '@/lib/notifications';
import { z } from 'zod';
import { validateRenewalPeriod } from '@/lib/tenancyLifecycle';

const renewSchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  monthlyRent: z.number().positive(),
  depositAmount: z.number().min(0),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  if (session.user.role !== 'LANDLORD')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;

  const tenancy = await prisma.tenancy.findFirst({
    where: {
      id,
      room: { property: { landlordId: session.user.id } },
      status: { in: ['ACTIVE', 'EXPIRED'] },
    },
    select: {
      id: true,
      roomId: true,
      tenantId: true,
      endDate: true,
      leasePartyType: true,
      companyName: true,
      companyRegistrationNo: true,
      authorizedSignatoryName: true,
      authorizedSignatoryIC: true,
      authorizedSignatoryRole: true,
      authorizedSignatoryUserId: true,
    },
  });

  if (!tenancy) return NextResponse.json({ error: 'Tenancy not found or not eligible for renewal' }, { status: 404 });

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const parsed = renewSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const { startDate, endDate, monthlyRent, depositAmount } = parsed.data;

  const validationError = validateRenewalPeriod({
    currentEndDate: tenancy.endDate,
    startDate: new Date(startDate),
    endDate: new Date(endDate),
  });
  if (validationError)
    return NextResponse.json({ error: validationError }, { status: 400 });

  // Only one open renewal per tenancy, and the room must not be held by any
  // tenancy other than the one being renewed.
  const conflicting = await prisma.tenancy.findFirst({
    where: {
      roomId: tenancy.roomId,
      id: { not: tenancy.id },
      status: { in: ['INVITED', 'PENDING', 'ACTIVE'] },
    },
    select: { id: true },
  });
  if (conflicting)
    return NextResponse.json(
      { error: 'This room already has a pending renewal or another open tenancy.' },
      { status: 409 },
    );

  const renewal = await prisma.$transaction(async (tx) => {
    const created = await tx.tenancy.create({
      data: {
        roomId: tenancy.roomId,
        tenantId: tenancy.tenantId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        monthlyRent,
        depositAmount,
        status: 'INVITED',
        renewalOfTenancyId: tenancy.id,
        // Carry the lease party over so a corporate lease renews as corporate.
        leasePartyType: tenancy.leasePartyType,
        companyName: tenancy.companyName,
        companyRegistrationNo: tenancy.companyRegistrationNo,
        authorizedSignatoryName: tenancy.authorizedSignatoryName,
        authorizedSignatoryIC: tenancy.authorizedSignatoryIC,
        authorizedSignatoryRole: tenancy.authorizedSignatoryRole,
        authorizedSignatoryUserId: tenancy.authorizedSignatoryUserId,
      },
      select: { id: true },
    });
    await syncRoomAvailability(tx, tenancy.roomId);
    return created;
  });

  // Notify tenant of renewal invitation (non-blocking)
  createNotification(
    tenancy.tenantId,
    'INVITATION_RECEIVED',
    'Tenancy renewal offer',
    'Your landlord has offered to renew your tenancy. Review the new terms and accept or decline.',
    `/dashboard/tenant/tenancy`,
  );

  return NextResponse.json({ tenancyId: renewal.id }, { status: 201 });
}

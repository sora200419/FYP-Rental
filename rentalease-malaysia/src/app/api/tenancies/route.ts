import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendSystemMessage } from '@/lib/messages';
import { z } from 'zod';

const tenancySchema = z.object({
  // roomId replaces propertyId — authorization goes: room → property → landlordId
  roomId: z.string().min(1, 'Room is required'),
  tenantEmail: z.string().email('Invalid email address'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  monthlyRent: z.coerce
    .number()
    .positive('Monthly rent must be greater than 0'),
  depositAmount: z.coerce.number().min(0, 'Deposit amount must be 0 or more'),
});

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session)
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  if (session.user.role !== 'LANDLORD')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await request.json();
    const data = tenancySchema.parse(body);

    // ── Step 1: Verify the room belongs to this landlord ─────────────────────
    // Authorization chain: Room → Property → landlordId = session.user.id
    const room = await prisma.room.findFirst({
      where: {
        id: data.roomId,
        property: { landlordId: session.user.id },
      },
      include: {
        property: {
          select: { id: true, address: true, city: true, landlordId: true },
        },
      },
    });

    if (!room)
      return NextResponse.json(
        { error: 'Room not found or does not belong to you' },
        { status: 404 },
      );

    // ── Step 2: Room-level concurrency guard ─────────────────────────────────
    // Prevent double-booking the same room. INVITED, PENDING, and ACTIVE all
    // count as "occupied" — the previous tenancy must end before a new one starts.
    const existingRoomTenancy = await prisma.tenancy.findFirst({
      where: {
        roomId: data.roomId,
        status: { in: ['INVITED', 'PENDING', 'ACTIVE'] },
      },
    });

    if (existingRoomTenancy)
      return NextResponse.json(
        {
          error:
            'This room already has an active or pending tenancy. The previous tenancy must expire or be terminated before a new one can be created.',
        },
        { status: 409 },
      );

    // ── Step 3: Look up the tenant by email ───────────────────────────────────
    // The tenant must already have a registered TENANT account on RentalEase.
    const tenant = await prisma.user.findFirst({
      where: { email: data.tenantEmail, role: 'TENANT' },
      select: { id: true, name: true, email: true },
    });

    if (!tenant)
      return NextResponse.json(
        {
          error:
            'No tenant account found with this email. Please ask your tenant to register on RentalEase first.',
        },
        { status: 404 },
      );

    // ── Step 3.5: Tenant-level single-tenancy guard ───────────────────────────
    // A tenant can only be in one INVITED, PENDING, or ACTIVE tenancy at a time.
    // This prevents a tenant from receiving multiple invitations simultaneously
    // or being double-booked across different properties.
    //
    // We include INVITED (not just PENDING/ACTIVE) because if a tenant already
    // has a pending invitation from landlord A, landlord B shouldn't be able to
    // send another one. If we only blocked on PENDING/ACTIVE, a tenant could
    // hold two simultaneous INVITED tenancies, accept both, and end up with two
    // PENDING tenancies — which violates the one-tenancy-at-a-time rule.
    const tenantExistingTenancy = await prisma.tenancy.findFirst({
      where: {
        tenantId: tenant.id,
        status: { in: ['INVITED', 'PENDING', 'ACTIVE'] },
      },
    });

    if (tenantExistingTenancy)
      return NextResponse.json(
        {
          error:
            'This tenant already has an active or pending tenancy. A tenant can only be linked to one tenancy at a time.',
        },
        { status: 409 },
      );

    // ── Step 4: Validate date range ───────────────────────────────────────────
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);

    if (end <= start)
      return NextResponse.json(
        { error: 'End date must be after the start date' },
        { status: 400 },
      );

    // ── Step 5: Create the tenancy with INVITED status ────────────────────────
    // INVITED is the initial state — the tenant must explicitly accept the
    // invitation before the landlord can proceed to generate an agreement.
    // This ensures no tenant is silently bound to a tenancy without consent.
    const tenancy = await prisma.tenancy.create({
      data: {
        roomId: data.roomId,
        tenantId: tenant.id,
        startDate: start,
        endDate: end,
        monthlyRent: data.monthlyRent,
        depositAmount: data.depositAmount,
        status: 'INVITED',
      },
      select: {
        id: true,
        startDate: true,
        endDate: true,
        monthlyRent: true,
        depositAmount: true,
        status: true,
        tenant: { select: { name: true, email: true } },
        room: {
          select: {
            label: true,
            property: { select: { address: true, city: true } },
          },
        },
      },
    });

    // ── Step 6: Send in-platform invitation message to the tenant ─────────────
    // This appears in the tenant's Messages tab and dashboard invitation section.
    // A messaging failure must NOT roll back the tenancy creation — the record
    // is already created and the landlord can see it in their tenancies list.
    try {
      await sendSystemMessage(
        tenancy.id,
        room.property.landlordId,
        tenant.id,
        `🏠 You have been invited to a tenancy at ${room.property.address}, ${room.property.city} — Room: ${room.label}. Monthly rent: RM ${Number(data.monthlyRent).toLocaleString('en-MY', { minimumFractionDigits: 2 })}. Please visit your dashboard to accept or decline this invitation.`,
      );
    } catch (msgError) {
      console.error(
        'Invitation message failed after tenancy creation:',
        msgError,
      );
    }

    // ── Step 7: Mark the room as unavailable ──────────────────────────────────
    // This prevents another landlord (or the same landlord) from creating a
    // second tenancy for this room while the invitation is pending.
    await prisma.room.update({
      where: { id: data.roomId },
      data: { isAvailable: false },
    });

    return NextResponse.json(
      { message: 'Tenancy invitation sent successfully', tenancy },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 },
      );
    console.error('Create tenancy error:', error);
    return NextResponse.json(
      { error: 'Failed to create tenancy' },
      { status: 500 },
    );
  }
}

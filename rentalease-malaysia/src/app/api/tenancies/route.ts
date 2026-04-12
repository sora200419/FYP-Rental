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

    // Concurrency guard — one active tenancy per room at a time
    const existingTenancy = await prisma.tenancy.findFirst({
      where: {
        roomId: data.roomId,
        status: { in: ['INVITED', 'PENDING', 'ACTIVE'] },
      },
    });

    if (existingTenancy)
      return NextResponse.json(
        {
          error:
            'This room already has an active or pending tenancy. The previous tenancy must expire or be terminated first.',
        },
        { status: 409 },
      );

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

    const start = new Date(data.startDate);
    const end = new Date(data.endDate);

    if (end <= start)
      return NextResponse.json(
        { error: 'End date must be after the start date' },
        { status: 400 },
      );

    // Create with INVITED status — tenant must accept before agreement can be generated
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

    // Send in-platform invitation message to the tenant
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

    // Mark the room as unavailable now that it has a pending tenancy
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

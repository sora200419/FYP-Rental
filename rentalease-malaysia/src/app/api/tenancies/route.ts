// src/app/api/tenancies/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createNotification } from '@/lib/notifications';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = session.user.role;

  if (role === 'LANDLORD') {
    const tenancies = await prisma.tenancy.findMany({
      where: {
        room: { property: { landlordId: session.user.id } },
      },
      include: {
        tenant: { select: { id: true, name: true, email: true, phone: true } },
        room: {
          include: {
            property: {
              select: { id: true, address: true, city: true, state: true },
            },
          },
        },
        agreement: { select: { id: true, status: true } },
        rentPayments: {
          select: { id: true, status: true, dueDate: true, amount: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(tenancies);
  }

  // TENANT
  const tenancies = await prisma.tenancy.findMany({
    where: { tenantId: session.user.id },
    include: {
      room: {
        include: {
          property: {
            include: {
              landlord: {
                select: { id: true, name: true, email: true, phone: true },
              },
            },
          },
        },
      },
      agreement: { select: { id: true, status: true } },
      rentPayments: {
        select: { id: true, status: true, dueDate: true, amount: true },
        orderBy: { dueDate: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(tenancies);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'LANDLORD') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const {
    roomId,
    tenantEmail,
    startDate,
    endDate,
    monthlyRent,
    depositAmount,
  } = body;

  if (
    !roomId ||
    !tenantEmail ||
    !startDate ||
    !endDate ||
    !monthlyRent ||
    !depositAmount
  ) {
    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400 },
    );
  }

  // Verify the landlord owns this room
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: {
      property: { select: { landlordId: true, address: true, city: true } },
    },
  });

  if (!room || room.property.landlordId !== session.user.id) {
    return NextResponse.json(
      { error: 'Room not found or access denied' },
      { status: 404 },
    );
  }

  if (!room.isAvailable) {
    return NextResponse.json(
      { error: 'Room is not available' },
      { status: 409 },
    );
  }

  // Find the tenant by email
  const tenant = await prisma.user.findUnique({
    where: { email: tenantEmail },
    select: { id: true, name: true, email: true, role: true },
  });

  if (!tenant || tenant.role !== 'TENANT') {
    return NextResponse.json(
      { error: 'No tenant account found with that email address' },
      { status: 404 },
    );
  }

  // Create the tenancy in INVITED status
  const tenancy = await prisma.tenancy.create({
    data: {
      roomId,
      tenantId: tenant.id,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      monthlyRent,
      depositAmount,
      status: 'INVITED',
    },
    include: {
      room: {
        include: { property: { select: { address: true, city: true } } },
      },
      tenant: { select: { id: true, name: true, email: true } },
    },
  });

  // Mark the room as unavailable
  await prisma.room.update({
    where: { id: roomId },
    data: { isAvailable: false },
  });

  // Notify the tenant — they now have an invitation waiting
  await createNotification(
    tenant.id,
    'INVITATION_RECEIVED',
    'New tenancy invitation',
    `You have received a tenancy invitation for ${room.property.address}, ${room.property.city}.`,
    '/dashboard/tenant',
  );

  return NextResponse.json(tenancy, { status: 201 });
}

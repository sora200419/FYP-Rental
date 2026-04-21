// src/app/api/tenancies/[id]/respond/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createNotification } from '@/lib/notifications';

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
  const { action } = body; // 'ACCEPT' | 'DECLINE'

  if (!['ACCEPT', 'DECLINE'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  // Verify tenancy exists and belongs to this tenant
  const tenancy = await prisma.tenancy.findUnique({
    where: { id },
    include: {
      room: {
        include: {
          property: {
            select: { landlordId: true, address: true, city: true },
          },
        },
      },
      tenant: { select: { id: true, name: true } },
    },
  });

  if (!tenancy || tenancy.tenantId !== session.user.id) {
    return NextResponse.json({ error: 'Tenancy not found' }, { status: 404 });
  }

  if (tenancy.status !== 'INVITED') {
    return NextResponse.json(
      { error: 'This invitation has already been responded to' },
      { status: 409 },
    );
  }

  const landlordId = tenancy.room.property.landlordId;
  const propertyAddress = tenancy.room.property.address;

  if (action === 'ACCEPT') {
    await prisma.tenancy.update({
      where: { id },
      data: { status: 'PENDING' },
    });

    await createNotification(
      landlordId,
      'INVITATION_RESPONDED',
      'Tenant accepted your invitation',
      `${tenancy.tenant.name} accepted the tenancy invitation for ${propertyAddress}.`,
      '/dashboard/landlord',
    );

    return NextResponse.json({ ok: true, status: 'PENDING' });
  }

  // DECLINE — free the room and terminate the tenancy
  await prisma.$transaction([
    prisma.tenancy.update({
      where: { id },
      data: { status: 'TERMINATED' },
    }),
    prisma.room.update({
      where: { id: tenancy.roomId },
      data: { isAvailable: true },
    }),
  ]);

  await createNotification(
    landlordId,
    'INVITATION_RESPONDED',
    'Tenant declined your invitation',
    `${tenancy.tenant.name} declined the tenancy invitation for ${propertyAddress}.`,
    '/dashboard/landlord',
  );

  return NextResponse.json({ ok: true, status: 'TERMINATED' });
}

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logAudit, getIp } from '@/lib/audit';
import { createNotification } from '@/lib/notifications';
import {
  PROPERTY_LOCATION_FIELDS,
  getPropertyEditEffect,
  propertySchema,
} from '@/lib/propertySchema';

// PATCH /api/properties/[id]
// Landlord edits a listing. A rejected or revoked listing is resubmitted for
// admin review; a verified one goes back to review only if its location
// changes (getPropertyEditEffect). The location is locked while any room has
// an open tenancy, because signed agreements name the address.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  if (session.user.role !== 'LANDLORD') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const parsed = propertySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 400 },
    );
  }
  const data = parsed.data;

  const property = await prisma.property.findFirst({
    where: { id, landlordId: session.user.id },
    select: {
      address: true,
      city: true,
      state: true,
      postcode: true,
      isVerified: true,
      rejectedReason: true,
      _count: {
        select: {
          rooms: { where: { tenancies: { some: { status: { in: ['INVITED', 'PENDING', 'ACTIVE'] } } } } },
        },
      },
    },
  });
  if (!property) return NextResponse.json({ error: 'Property not found' }, { status: 404 });

  const locationChanged = PROPERTY_LOCATION_FIELDS.some((field) => data[field] !== property[field]);
  if (locationChanged && property._count.rooms > 0) {
    return NextResponse.json(
      { error: "The address can't be changed while a room has an active or pending tenancy." },
      { status: 409 },
    );
  }

  const { needsReview } = getPropertyEditEffect({
    isVerified: property.isVerified,
    rejectedReason: property.rejectedReason,
    locationChanged,
  });

  const updated = await prisma.property.update({
    where: { id },
    data: {
      ...data,
      description: data.description?.trim() || null,
      ...(needsReview ? { isVerified: false, rejectedReason: null } : {}),
    },
    select: { id: true, address: true, isVerified: true },
  });

  if (needsReview) {
    const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } });
    await Promise.allSettled(
      admins.map((admin) =>
        createNotification(
          admin.id,
          'PROPERTY_SUBMITTED',
          'Property resubmitted for review',
          `The listing at "${updated.address}" was updated and needs verification again.`,
          '/dashboard/admin/properties',
        ),
      ),
    );
  }

  return NextResponse.json({ property: updated, needsReview });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  if (session.user.role !== 'LANDLORD') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;

  const property = await prisma.property.findFirst({
    where: { id, landlordId: session.user.id },
    include: {
      rooms: {
        include: {
          tenancies: {
            where: { status: { in: ['INVITED', 'PENDING', 'ACTIVE', 'EXPIRED', 'TERMINATED'] } },
            select: { id: true },
          },
        },
      },
    },
  });

  if (!property) return NextResponse.json({ error: 'Property not found' }, { status: 404 });

  const hasActiveTenancy = property.rooms.some((r) => r.tenancies.length > 0);
  if (hasActiveTenancy) {
    return NextResponse.json(
      { error: 'Cannot delete a property that has tenancy records. All tenancies must be fully settled first.' },
      { status: 409 },
    );
  }

  const ip = getIp(req);

  for (const room of property.rooms) {
    await logAudit({
      actorId: session.user.id,
      action: 'ROOM_DELETED',
      entityName: 'Room',
      entityId: room.id,
      previousData: room as object,
      ipAddress: ip,
    });
  }

  await logAudit({
    actorId: session.user.id,
    action: 'PROPERTY_DELETED',
    entityName: 'Property',
    entityId: id,
    previousData: property as object,
    ipAddress: ip,
  });

  // Delete rooms first (no cascade), then property (photos cascade via schema)
  await prisma.room.deleteMany({ where: { propertyId: id } });
  await prisma.property.delete({ where: { id } });

  return NextResponse.json({ message: 'Property deleted' });
}

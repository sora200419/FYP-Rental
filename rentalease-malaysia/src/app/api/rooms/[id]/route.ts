import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getIp } from '@/lib/audit';
import { z } from 'zod';

const roomSchema = z.object({
  label: z.string().min(1, 'Label is required').optional(),
  roomType: z.enum(['MASTER', 'MEDIUM', 'SMALL', 'STUDIO', 'ENTIRE_UNIT']).optional(),
  bathroomType: z.enum(['ATTACHED', 'SHARED']).optional(),
  bathrooms: z.coerce.number().int().min(1).optional(),
  rentAmount: z.coerce.number().positive('Rent amount must be greater than 0').optional(),
  sizeSqFt: z.coerce.number().int().positive().nullable().optional(),
  floorLevel: z.coerce.number().int().nullable().optional(),
  furnishing: z.enum(['FULLY_FURNISHED', 'PARTIALLY_FURNISHED', 'UNFURNISHED']).optional(),
  maxOccupants: z.coerce.number().int().min(1).optional(),
  wifiIncluded: z.boolean().optional(),
  waterIncluded: z.boolean().optional(),
  electricIncluded: z.boolean().optional(),
  genderPreference: z.enum(['ANY', 'MALE_ONLY', 'FEMALE_ONLY']).optional(),
  notes: z.string().nullable().optional(),
});

// BUG-14: PATCH handler to update room details
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  if (session.user.role !== 'LANDLORD') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;

  const room = await prisma.room.findFirst({
    where: { id, property: { landlordId: session.user.id } },
    select: { id: true },
  });

  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const parsed = roomSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const updated = await prisma.room.update({
    where: { id },
    data: parsed.data,
  });

  return NextResponse.json({ room: updated });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  if (session.user.role !== 'LANDLORD') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;

  const room = await prisma.room.findFirst({
    where: { id, property: { landlordId: session.user.id } },
    include: { tenancies: { select: { status: true } } },
  });

  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });

  // Tenancies keep their room (onDelete: Restrict): a room that has ever had a
  // tenancy is part of that tenancy's record and cannot be deleted.
  const hasOpenTenancy = room.tenancies.some((t) =>
    ['INVITED', 'PENDING', 'ACTIVE'].includes(t.status),
  );
  if (room.tenancies.length > 0) {
    return NextResponse.json(
      {
        error: hasOpenTenancy
          ? 'Cannot delete a room with an active or pending tenancy.'
          : 'This room has past tenancies on record, so it cannot be deleted.',
      },
      { status: 409 },
    );
  }

  await prisma.$transaction([
    prisma.auditLog.create({
      data: {
        actorId: session.user.id,
        action: 'ROOM_DELETED',
        entityName: 'Room',
        entityId: id,
        previousData: JSON.parse(JSON.stringify(room)),
        ipAddress: getIp(req),
      },
    }),
    prisma.room.delete({ where: { id } }),
  ]);

  return NextResponse.json({ message: 'Room deleted' });
}

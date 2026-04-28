import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function DELETE(
  _req: NextRequest,
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
          tenancies: { select: { id: true } },
        },
      },
    },
  });

  if (!property) return NextResponse.json({ error: 'Property not found' }, { status: 404 });

  const hasAnyTenancy = property.rooms.some((r) => r.tenancies.length > 0);
  if (hasAnyTenancy) {
    return NextResponse.json(
      { error: 'Cannot delete a property that has tenancy records. Remove all tenancies first.' },
      { status: 409 },
    );
  }

  // Delete rooms first (no cascade), then property (photos cascade via schema)
  await prisma.room.deleteMany({ where: { propertyId: id } });
  await prisma.property.delete({ where: { id } });

  return NextResponse.json({ message: 'Property deleted' });
}

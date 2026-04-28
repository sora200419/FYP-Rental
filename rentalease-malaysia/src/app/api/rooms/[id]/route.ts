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

  const room = await prisma.room.findFirst({
    where: { id, property: { landlordId: session.user.id } },
    include: { tenancies: { select: { id: true } } },
  });

  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });

  if (room.tenancies.length > 0) {
    return NextResponse.json(
      { error: 'Cannot delete a room that has tenancy records.' },
      { status: 409 },
    );
  }

  await prisma.room.delete({ where: { id } });

  return NextResponse.json({ message: 'Room deleted' });
}

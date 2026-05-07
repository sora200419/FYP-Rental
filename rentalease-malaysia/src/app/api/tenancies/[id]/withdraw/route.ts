// POST /api/tenancies/[id]/withdraw
// Tenant withdraws from a PENDING tenancy (accepted invite but not yet signed).
// Frees the room and notifies the landlord. (FEAT-05)
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createNotification } from '@/lib/notifications';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'TENANT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const tenancy = await prisma.tenancy.findFirst({
    where: { id, tenantId: session.user.id },
    include: {
      tenant: { select: { name: true } },
      room: {
        include: {
          property: { select: { landlordId: true, address: true } },
        },
      },
      agreement: { select: { id: true } },
    },
  });

  if (!tenancy) return NextResponse.json({ error: 'Tenancy not found' }, { status: 404 });

  if (tenancy.status !== 'PENDING') {
    return NextResponse.json(
      { error: 'Only pending tenancies can be withdrawn. Use the termination flow for active tenancies.' },
      { status: 409 },
    );
  }

  const landlordId = tenancy.room.property.landlordId;

  await prisma.$transaction(async (tx) => {
    // Delete the draft agreement if one exists
    if (tenancy.agreement) {
      await tx.agreement.delete({ where: { id: tenancy.agreement.id } });
    }
    await tx.tenancy.delete({ where: { id } });
    await tx.room.update({ where: { id: tenancy.roomId }, data: { isAvailable: true } });
  });

  await createNotification(
    landlordId,
    'INVITATION_RESPONDED',
    'Tenant withdrew from tenancy',
    `${tenancy.tenant.name} withdrew from the pending tenancy for ${tenancy.room.property.address}. The room is now available again.`,
    '/dashboard/landlord/tenancies',
  );

  return NextResponse.json({ ok: true });
}

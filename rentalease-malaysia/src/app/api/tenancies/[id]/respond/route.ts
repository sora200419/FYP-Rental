import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const bodySchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('accept') }),
  z.object({ action: z.literal('decline') }),
]);

// PATCH /api/tenancies/[id]/respond
// Tenant accepts or declines a tenancy invitation.
// accept  → INVITED becomes PENDING, room stays unavailable
// decline → INVITED becomes TERMINATED, room becomes available again
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  if (session.user.role !== 'TENANT')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id: tenancyId } = await params;

  const tenancy = await prisma.tenancy.findFirst({
    where: {
      id: tenancyId,
      tenantId: session.user.id,
      status: 'INVITED',
    },
    include: {
      room: {
        select: {
          id: true,
          property: { select: { landlordId: true, address: true } },
        },
      },
    },
  });

  if (!tenancy)
    return NextResponse.json(
      {
        error:
          'Invitation not found, not addressed to you, or already responded.',
      },
      { status: 404 },
    );

  const body = await request.json();
  const { action } = bodySchema.parse(body);

  if (action === 'accept') {
    await prisma.tenancy.update({
      where: { id: tenancyId },
      data: { status: 'PENDING' },
    });
    return NextResponse.json({
      message:
        'Invitation accepted. Your landlord will now prepare the agreement.',
    });
  }

  // decline: free the room and terminate the tenancy
  await prisma.$transaction([
    prisma.tenancy.update({
      where: { id: tenancyId },
      data: { status: 'TERMINATED' },
    }),
    prisma.room.update({
      where: { id: tenancy.room.id },
      data: { isAvailable: true },
    }),
  ]);

  return NextResponse.json({ message: 'Invitation declined.' });
}

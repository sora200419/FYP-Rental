// DELETE /api/tenancies/[id]/withdraw
// Tenant withdraws from a PENDING tenancy (accepted the invite but has not yet
// signed the agreement). The INVITED → DECLINE path is handled by /respond.
//
// Not allowed once the deposit has been submitted or the agreement signed
// (getUnstartedTenancyCancellationBlocker).
//
// Effects:
//   - Deletes the tenancy (cascades to Agreement, Message, CoTenant, etc.)
//   - Recomputes room availability
//   - Notifies the landlord
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { deleteUnstartedTenancy } from '@/lib/tenancyCancellation';
import { getUnstartedTenancyCancellationBlocker } from '@/lib/tenancyLifecycle';
import { createNotification } from '@/lib/notifications';
import { getIp } from '@/lib/audit';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  if (session.user.role !== 'TENANT')
    return NextResponse.json({ error: 'Only tenants can withdraw from a tenancy' }, { status: 403 });

  const { id } = await params;

  const tenancy = await prisma.tenancy.findFirst({
    where: { id, tenantId: session.user.id, status: 'PENDING' },
    select: {
      id: true,
      roomId: true,
      status: true,
      depositStatus: true,
      agreement: { select: { status: true } },
      room: {
        select: {
          propertyId: true,
          property: { select: { landlordId: true, address: true, city: true } },
        },
      },
      tenant: { select: { name: true } },
    },
  });

  if (!tenancy)
    return NextResponse.json(
      { error: 'Tenancy not found or cannot be withdrawn (must be in PENDING status)' },
      { status: 404 },
    );

  const landlordId = tenancy.room.property.landlordId;
  const propertyAddress = `${tenancy.room.property.address}, ${tenancy.room.property.city}`;

  const blocker = getUnstartedTenancyCancellationBlocker({
    tenancyStatus: tenancy.status,
    depositStatus: tenancy.depositStatus,
    agreementStatus: tenancy.agreement?.status,
  });
  if (blocker) return NextResponse.json({ error: blocker }, { status: 409 });

  await deleteUnstartedTenancy({
    tenancyId: id,
    actorId: session.user.id,
    action: 'TENANCY_WITHDRAWN',
    reason: 'WITHDRAWN',
    ipAddress: getIp(request),
  });

  // Notify landlord
  await createNotification(
    landlordId,
    'INVITATION_RESPONDED',
    'Tenant withdrew from tenancy',
    `${tenancy.tenant.name} has withdrawn from the pending tenancy at ${propertyAddress}. The room is now available again.`,
    `/dashboard/landlord/properties/${tenancy.room.propertyId}`,
  );

  return NextResponse.json({ ok: true });
}

import { prisma } from './prisma';
import { syncRoomAvailability } from './roomAvailability';
import { deletePaymentProof } from './cloudinary';

/**
 * Hard-deletes an invitation or a tenancy that has not started (decline,
 * withdraw, landlord cancel, invitation expiry) and frees its room.
 *
 * The caller must already have checked getUnstartedTenancyCancellationBlocker.
 * The audit row is written in the same transaction as the delete, and keeps
 * the landlord and property IDs so landlord pages can redirect old links
 * (see lib/landlordTenancyRedirect.ts).
 */
export async function deleteUnstartedTenancy(params: {
  tenancyId: string;
  actorId: string;
  action: string;
  reason: string;
  ipAddress?: string | null;
}): Promise<void> {
  const tenancy = await prisma.tenancy.findUniqueOrThrow({
    where: { id: params.tenancyId },
    select: {
      roomId: true,
      room: { select: { propertyId: true, property: { select: { landlordId: true } } } },
      depositProofs: { select: { publicId: true } },
    },
  });

  await prisma.$transaction(async (tx) => {
    await tx.auditLog.create({
      data: {
        actorId: params.actorId,
        action: params.action,
        entityName: 'Tenancy',
        entityId: params.tenancyId,
        previousData: {
          propertyId: tenancy.room.propertyId,
          roomId: tenancy.roomId,
          landlordId: tenancy.room.property.landlordId,
        },
        ipAddress: params.ipAddress ?? null,
        reason: params.reason,
      },
    });
    // Rejected deposit proofs would otherwise block the delete (RESTRICT).
    await tx.depositProof.deleteMany({ where: { tenancyId: params.tenancyId } });
    await tx.tenancy.delete({ where: { id: params.tenancyId } });
    await syncRoomAvailability(tx, tenancy.roomId);
  });

  await Promise.allSettled(tenancy.depositProofs.map((p) => deletePaymentProof(p.publicId)));
}

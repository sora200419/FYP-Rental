/**
 * Hard-deletes specific users and ALL their dependent records.
 * Use this to clean up test accounts that Prisma Studio can't delete
 * due to foreign-key constraints.
 *
 * Usage:
 *   npx tsx scripts/delete-users.ts <id1> <id2> ...
 *
 * Example:
 *   npx tsx scripts/delete-users.ts cmoo17rx00003n3akv8dg8m62 cmooje0mj0006n3ak4zes1i6p
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deleteUsers(userIds: string[]) {
  if (userIds.length === 0) {
    console.error('No user IDs provided.');
    process.exit(1);
  }

  console.log(`Preparing to delete ${userIds.length} user(s):\n  ${userIds.join('\n  ')}\n`);

  // ── 1. Collect IDs of dependent records ──────────────────────────────────

  const tenancies = await prisma.tenancy.findMany({
    where: {
      OR: [
        { tenantId: { in: userIds } },
        { room: { property: { landlordId: { in: userIds } } } },
      ],
    },
    select: {
      id: true,
      depositRefund: { select: { id: true } },
    },
  });
  const tenancyIds = tenancies.map((t) => t.id);
  const refundIds = tenancies.flatMap((t) => (t.depositRefund ? [t.depositRefund.id] : []));

  const propertyIds = (
    await prisma.property.findMany({
      where: { landlordId: { in: userIds } },
      select: { id: true },
    })
  ).map((p) => p.id);

  const paymentIds = (
    await prisma.rentPayment.findMany({
      where: { tenancyId: { in: tenancyIds } },
      select: { id: true },
    })
  ).map((p) => p.id);

  const reportIds = (
    await prisma.conditionReport.findMany({
      where: { tenancyId: { in: tenancyIds } },
      select: { id: true },
    })
  ).map((r) => r.id);

  // ── 2. Delete everything in dependency order ──────────────────────────────

  await prisma.$transaction(async (tx) => {

    // Nullable FK: ConditionReport.acknowledgedById — set to null for reports
    // in OTHER tenancies where one of the target users was the acknowledger.
    await tx.conditionReport.updateMany({
      where: { acknowledgedById: { in: userIds } },
      data: { acknowledgedById: null },
    });

    // Deposit deductions → deposit refund
    if (refundIds.length > 0) {
      await tx.depositDeduction.deleteMany({ where: { refundId: { in: refundIds } } });
      await tx.depositRefund.deleteMany({ where: { id: { in: refundIds } } });
    }

    // Condition photos → condition reports
    if (reportIds.length > 0) {
      await tx.conditionPhoto.deleteMany({ where: { reportId: { in: reportIds } } });
      await tx.conditionReport.deleteMany({ where: { id: { in: reportIds } } });
    }

    // Payment proofs → rent payments
    if (paymentIds.length > 0) {
      await tx.paymentProof.deleteMany({ where: { paymentId: { in: paymentIds } } });
      await tx.rentPayment.deleteMany({ where: { id: { in: paymentIds } } });
    }

    // Other tenancy children
    if (tenancyIds.length > 0) {
      await tx.depositProof.deleteMany({ where: { tenancyId: { in: tenancyIds } } });
      await tx.message.deleteMany({ where: { tenancyId: { in: tenancyIds } } });
      await tx.coTenant.deleteMany({ where: { tenancyId: { in: tenancyIds } } });
      await tx.agreementPreferences.deleteMany({ where: { tenancyId: { in: tenancyIds } } });
      await tx.agreement.deleteMany({ where: { tenancyId: { in: tenancyIds } } });
      await tx.tenancy.deleteMany({ where: { id: { in: tenancyIds } } });
    }

    // Property children → properties
    if (propertyIds.length > 0) {
      await tx.propertyPhoto.deleteMany({ where: { propertyId: { in: propertyIds } } });
      await tx.room.deleteMany({ where: { propertyId: { in: propertyIds } } });
      await tx.property.deleteMany({ where: { id: { in: propertyIds } } });
    }

    // Direct user relations
    await tx.notification.deleteMany({ where: { userId: { in: userIds } } });
    await tx.tenantDocument.deleteMany({ where: { userId: { in: userIds } } });

    // Finally, delete the users
    const result = await tx.user.deleteMany({ where: { id: { in: userIds } } });
    console.log(`✓ Deleted ${result.count} user(s) and all their data.`);
  });
}

const ids = process.argv.slice(2);
deleteUsers(ids)
  .catch((err) => { console.error('Error:', err.message); process.exit(1); })
  .finally(() => prisma.$disconnect());

import { prisma } from './prisma';

// Creates the full monthly rent schedule when a tenancy goes ACTIVE.
// Called once from the agreement respond API when the tenant accepts.
export async function generateRentSchedule(
  tenancyId: string,
  startDate: Date,
  endDate: Date,
  monthlyRent: unknown,
): Promise<void> {
  const amount = Number(monthlyRent);
  const payments: {
    tenancyId: string;
    dueDate: Date;
    amount: number;
    status: 'PENDING';
  }[] = [];

  const current = new Date(startDate);
  current.setDate(1); // normalise to the 1st of each month

  while (current <= endDate) {
    payments.push({
      tenancyId,
      dueDate: new Date(current),
      amount,
      status: 'PENDING',
    });
    current.setMonth(current.getMonth() + 1);
  }

  if (payments.length === 0) return;
  await prisma.rentPayment.createMany({ data: payments });
}

// After a landlord approves a payment, find the next PENDING payment
// for the same tenancy and ensure it's visible and correctly staged.
export async function ensureNextPaymentPending(
  tenancyId: string,
  currentDueDate: Date,
): Promise<void> {
  const nextPayment = await prisma.rentPayment.findFirst({
    where: {
      tenancyId,
      dueDate: { gt: currentDueDate },
      // LATE is no longer written by the application — all legacy LATE rows
      // were migrated to PENDING in the Phase 10 migration. Only query PENDING.
      status: 'PENDING',
    },
    orderBy: { dueDate: 'asc' },
  });

  // Nothing to do if the next payment is already in the right state
  if (!nextPayment) return;
}

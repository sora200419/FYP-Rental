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
// This is the "auto-update next month's record" behaviour.
export async function ensureNextPaymentPending(
  tenancyId: string,
  currentDueDate: Date,
): Promise<void> {
  // Find the immediately following payment by due date
  const nextPayment = await prisma.rentPayment.findFirst({
    where: {
      tenancyId,
      dueDate: { gt: currentDueDate },
      // Only update if it hasn't already been uploaded or paid
      status: { in: ['PENDING', 'LATE'] },
    },
    orderBy: { dueDate: 'asc' },
  });

  // If the next payment exists and was auto-marked LATE (because the date
  // passed before the previous payment was verified), reset it to PENDING
  // now that the landlord has confirmed the previous month is settled.
  if (nextPayment && nextPayment.status === 'LATE') {
    await prisma.rentPayment.update({
      where: { id: nextPayment.id },
      data: { status: 'PENDING' },
    });
  }
}

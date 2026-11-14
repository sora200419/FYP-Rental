export function buildRentScheduleEntries(
  tenancyId: string,
  startDate: Date,
  endDate: Date,
  monthlyRent: unknown,
  rentDueDay?: number | null,
): {
  tenancyId: string;
  dueDate: Date;
  amount: number;
  status: 'PENDING';
}[] {
  const amount = Number(monthlyRent);
  const payments: {
    tenancyId: string;
    dueDate: Date;
    amount: number;
    status: 'PENDING';
  }[] = [];

  const resolvedRentDueDay = rentDueDay ?? startDate.getDate();

  function dueDateForMonth(year: number, month: number): Date {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return new Date(year, month, Math.min(resolvedRentDueDay, daysInMonth));
  }

  let currentYear = startDate.getFullYear();
  let currentMonth = startDate.getMonth();
  let firstDueDate = dueDateForMonth(currentYear, currentMonth);

  if (firstDueDate < startDate) {
    currentMonth += 1;
    if (currentMonth > 11) {
      currentMonth = 0;
      currentYear += 1;
    }
    firstDueDate = dueDateForMonth(currentYear, currentMonth);
  }

  let current = new Date(firstDueDate);
  while (current <= endDate) {
    payments.push({
      tenancyId,
      dueDate: new Date(current),
      amount,
      status: 'PENDING',
    });
    current = dueDateForMonth(current.getFullYear(), current.getMonth() + 1);
  }

  return payments;
}

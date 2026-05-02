export function getDaysUntilBillingDay(billingDay: number, now = new Date()): number {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const thisMonthDueDate = new Date(today.getFullYear(), today.getMonth(), billingDay);

  if (today <= thisMonthDueDate) {
    const diffMs = thisMonthDueDate.getTime() - today.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }

  const nextMonthDueDate = new Date(today.getFullYear(), today.getMonth() + 1, billingDay);
  const diffMs = nextMonthDueDate.getTime() - today.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

export function getMinDaysToNextInvoice(billingDays: number[], now = new Date()): number | null {
  if (billingDays.length === 0) return null;
  return Math.min(...billingDays.map((day) => getDaysUntilBillingDay(day, now)));
}

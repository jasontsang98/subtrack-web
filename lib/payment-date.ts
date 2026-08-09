export function calendarDayDifference(value: string, today = new Date()) {
  const [year, month, day] = value.split("-").map(Number);
  const targetDay = Date.UTC(year, month - 1, day);
  const currentDay = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((targetDay - currentDay) / 86_400_000);
}

export function relativePaymentLabel(value: string, today = new Date()) {
  const difference = calendarDayDifference(value, today);

  if (difference === 0) return "Today";
  if (difference === 1) return "Tomorrow";
  if (difference > 1) return `in ${difference} days`;
  if (difference === -1) return "1 day overdue";

  return `${-difference} days overdue`;
}


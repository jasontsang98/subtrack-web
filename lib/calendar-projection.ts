export type BillingCycle = "weekly" | "fortnightly" | "monthly" | "yearly";

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const monthPattern = /^\d{4}-\d{2}$/;

function parseDate(value: string) {
  if (!datePattern.test(value)) throw new Error("Invalid date");
  const [year, month, day] = value.split("-").map(Number);
  return { year, month, day };
}

function formatDate(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function occurrenceDate(start: string, cycle: BillingCycle, occurrence: number) {
  const { year, month, day } = parseDate(start);

  if (cycle === "weekly" || cycle === "fortnightly") {
    const date = new Date(Date.UTC(year, month - 1, day));
    date.setUTCDate(date.getUTCDate() + occurrence * (cycle === "weekly" ? 7 : 14));
    return formatDate(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
  }

  if (cycle === "monthly") {
    const monthIndex = year * 12 + month - 1 + occurrence;
    const targetYear = Math.floor(monthIndex / 12);
    const targetMonth = monthIndex % 12 + 1;
    return formatDate(targetYear, targetMonth, Math.min(day, daysInMonth(targetYear, targetMonth)));
  }

  const targetYear = year + occurrence;
  return formatDate(targetYear, month, Math.min(day, daysInMonth(targetYear, month)));
}

export function monthBounds(month: string) {
  if (!monthPattern.test(month)) throw new Error("Invalid month");
  const [year, monthNumber] = month.split("-").map(Number);
  if (monthNumber < 1 || monthNumber > 12) throw new Error("Invalid month");
  return {
    start: formatDate(year, monthNumber, 1),
    end: formatDate(year, monthNumber, daysInMonth(year, monthNumber)),
  };
}

export function projectBillingDates(
  nextBilling: string,
  cycle: BillingCycle,
  rangeStart: string,
  rangeEnd: string,
) {
  parseDate(nextBilling);
  parseDate(rangeStart);
  parseDate(rangeEnd);

  const dates: string[] = [];
  for (let occurrence = 0; occurrence < 600; occurrence += 1) {
    const date = occurrenceDate(nextBilling, cycle, occurrence);
    if (date > rangeEnd) break;
    if (date >= rangeStart) dates.push(date);
  }
  return dates;
}

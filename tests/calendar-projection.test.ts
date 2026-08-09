import assert from "node:assert/strict";
import test from "node:test";
import { monthBounds, projectBillingDates } from "../lib/calendar-projection.ts";

test("calculates calendar month boundaries including leap years", () => {
  assert.deepEqual(monthBounds("2028-02"), { start: "2028-02-01", end: "2028-02-29" });
  assert.deepEqual(monthBounds("2026-08"), { start: "2026-08-01", end: "2026-08-31" });
  assert.throws(() => monthBounds("2026-13"), /Invalid month/);
});

test("projects weekly and fortnightly payments into a selected month", () => {
  assert.deepEqual(
    projectBillingDates("2026-08-03", "weekly", "2026-08-01", "2026-08-31"),
    ["2026-08-03", "2026-08-10", "2026-08-17", "2026-08-24", "2026-08-31"],
  );
  assert.deepEqual(
    projectBillingDates("2026-08-03", "fortnightly", "2026-08-01", "2026-08-31"),
    ["2026-08-03", "2026-08-17", "2026-08-31"],
  );
});

test("keeps the original billing day when short months clamp an occurrence", () => {
  assert.deepEqual(
    projectBillingDates("2026-01-31", "monthly", "2026-02-01", "2026-04-30"),
    ["2026-02-28", "2026-03-31", "2026-04-30"],
  );
});

test("projects leap-day yearly billing safely", () => {
  assert.deepEqual(
    projectBillingDates("2024-02-29", "yearly", "2025-01-01", "2028-12-31"),
    ["2025-02-28", "2026-02-28", "2027-02-28", "2028-02-29"],
  );
});

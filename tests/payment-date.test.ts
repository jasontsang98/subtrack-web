import assert from "node:assert/strict";
import test from "node:test";
import { calendarDayDifference, relativePaymentLabel } from "../lib/payment-date.ts";

const augustNinth = new Date(2026, 7, 9, 23, 45);

test("compares calendar dates instead of partial elapsed days", () => {
  assert.equal(calendarDayDifference("2026-08-09", augustNinth), 0);
  assert.equal(calendarDayDifference("2026-08-10", augustNinth), 1);
  assert.equal(calendarDayDifference("2026-08-08", augustNinth), -1);
});

test("uses readable relative payment labels", () => {
  assert.equal(relativePaymentLabel("2026-08-09", augustNinth), "Today");
  assert.equal(relativePaymentLabel("2026-08-10", augustNinth), "Tomorrow");
  assert.equal(relativePaymentLabel("2026-08-12", augustNinth), "in 3 days");
  assert.equal(relativePaymentLabel("2026-08-08", augustNinth), "1 day overdue");
});

"use client";
import { useEffect, useMemo, useState } from "react";
import { AppHeader } from "@/app/components/AppHeader";
import styles from "./calendar.module.css";

type CalendarEvent = {
  id: string;
  subscriptionId: string | null;
  name: string;
  category: string;
  amount: number;
  date: string;
  color: string;
  status: "recorded" | "projected";
};

type CalendarResponse = { month: string; today: string; events: CalendarEvent[] };

const currency = "AUD";
const money = (value: number) => value.toLocaleString("en-AU", {
  style: "currency",
  currency,
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const formatDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const monthKey = (date: Date) => formatDate(date).slice(0, 7);
const parseLocalDate = (value: string) => new Date(`${value}T12:00:00`);
const shiftMonth = (month: string, amount: number) => {
  const [year, monthNumber] = month.split("-").map(Number);
  return monthKey(new Date(year, monthNumber - 1 + amount, 1, 12));
};

export default function CalendarPage() {
  const [month, setMonth] = useState(() => monthKey(new Date()));
  const [data, setData] = useState<CalendarResponse | null>(null);
  const [selectedDate, setSelectedDate] = useState(() => formatDate(new Date()));
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/calendar?month=${month}`, { signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error("Unable to load calendar");
        return response.json() as Promise<CalendarResponse>;
      })
      .then(response => {
        setError("");
        setData(response);
        setSelectedDate(current => current.startsWith(month)
          ? current
          : response.today.startsWith(month) ? response.today : `${month}-01`);
      })
      .catch(fetchError => {
        if (fetchError.name !== "AbortError") setError("Calendar data is unavailable.");
      });
    return () => controller.abort();
  }, [month]);

  const calendar = useMemo(() => {
    const [year, monthNumber] = month.split("-").map(Number);
    const daysInMonth = new Date(year, monthNumber, 0).getDate();
    const firstWeekday = (new Date(year, monthNumber - 1, 1, 12).getDay() + 6) % 7;
    return [
      ...Array.from({ length: firstWeekday }, () => null),
      ...Array.from({ length: daysInMonth }, (_, index) =>
        `${month}-${String(index + 1).padStart(2, "0")}`),
    ];
  }, [month]);

  const events = useMemo(() => data?.events ?? [], [data]);
  const eventsByDate = useMemo(() => events.reduce<Record<string, CalendarEvent[]>>((result, event) => {
    (result[event.date] ??= []).push(event);
    return result;
  }, {}), [events]);
  const totalsByDate = useMemo(() => Object.fromEntries(
    Object.entries(eventsByDate).map(([date, dayEvents]) => [
      date,
      dayEvents.reduce((sum, event) => sum + event.amount, 0),
    ]),
  ), [eventsByDate]);
  const maximumDay = Math.max(0, ...Object.values(totalsByDate));
  const selectedEvents = eventsByDate[selectedDate] ?? [];
  const total = events.reduce((sum, event) => sum + event.amount, 0);
  const recorded = events.filter(event => event.status === "recorded").reduce((sum, event) => sum + event.amount, 0);
  const projected = total - recorded;
  const busiest = Object.entries(totalsByDate).sort((left, right) => right[1] - left[1])[0];
  const monthDate = parseLocalDate(`${month}-01`);

  return <><AppHeader active="calendar"/><main className={styles.shell}>
    <section className={styles.intro}>
      <div><em>PAYMENT CALENDAR</em><h1>See the month at a glance.</h1><p>Recorded charges behind you, projected renewals ahead.</p></div>
      <div className={styles.monthControl}>
        <button aria-label="Previous month" onClick={() => setMonth(value => shiftMonth(value, -1))}><span aria-hidden="true">&lsaquo;</span></button>
        <strong>{new Intl.DateTimeFormat("en-AU", { month: "long", year: "numeric" }).format(monthDate)}</strong>
        <button aria-label="Next month" onClick={() => setMonth(value => shiftMonth(value, 1))}><span aria-hidden="true">&rsaquo;</span></button>
      </div>
    </section>

    {error ? <div className={styles.message}>{error}</div> : !data ? <div className={styles.message}>Loading payment calendar...</div> : <>
      <section className={styles.kpis}>
        <article><span>MONTH TOTAL</span><strong>{money(total)}</strong><p>{events.length} payments</p></article>
        <article><span>RECORDED</span><strong>{money(recorded)}</strong><p>Completed renewals</p></article>
        <article><span>PROJECTED</span><strong>{money(projected)}</strong><p>Expected renewals</p></article>
        <article><span>BUSIEST DAY</span><strong>{busiest ? money(busiest[1]) : money(0)}</strong><p>{busiest ? new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short" }).format(parseLocalDate(busiest[0])) : "No payments"}</p></article>
      </section>

      <section className={styles.content}>
        <article className={styles.calendarPanel}>
          <div className={styles.legend}><span><i className={styles.recordedDot}/>Recorded</span><span><i className={styles.projectedDot}/>Projected</span><small>Darker days have more spend</small></div>
          <div className={styles.weekdays}>{["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(day => <span key={day}>{day}</span>)}</div>
          <div className={styles.grid}>
            {calendar.map((date, index) => date ? <button
              key={date}
              className={[
                styles.day,
                date === selectedDate ? styles.selected : "",
                date === data.today ? styles.today : "",
              ].filter(Boolean).join(" ")}
              style={{ "--heat": maximumDay ? Math.max(.08, totalsByDate[date] / maximumDay * .55) : 0 } as React.CSSProperties}
              onClick={() => setSelectedDate(date)}
              aria-label={`${date}, ${money(totalsByDate[date] ?? 0)}`}
            >
              <span>{Number(date.slice(-2))}</span>
              {(totalsByDate[date] ?? 0) > 0 && <strong>{money(totalsByDate[date])}</strong>}
              <div>{(eventsByDate[date] ?? []).slice(0, 4).map(event => <i key={event.id} className={event.status === "recorded" ? styles.recordedDot : styles.projectedDot}/>)}</div>
            </button> : <span className={styles.blank} key={`blank-${index}`}/>)}
          </div>
        </article>

        <aside className={styles.details}>
          <div><span>SELECTED DAY</span><h2>{new Intl.DateTimeFormat("en-AU", { weekday: "long", day: "numeric", month: "long" }).format(parseLocalDate(selectedDate))}</h2><strong>{money(totalsByDate[selectedDate] ?? 0)}</strong></div>
          {selectedEvents.length ? <div className={styles.eventList}>{selectedEvents.map(event => <article key={event.id}>
            <i style={{ background: event.color }}>{event.name[0]}</i>
            <span><b>{event.name}</b><small>{event.category} <span aria-hidden="true">&middot;</span> {event.status}</small></span>
            <strong>{money(event.amount)}</strong>
          </article>)}</div> : <div className={styles.empty}>No payments on this day.</div>}
        </aside>
      </section>
      <p className={styles.note}>Recorded values come from payment history. Projected values follow active subscription schedules and may differ from the final charge.</p>
    </>}
  </main></>;
}

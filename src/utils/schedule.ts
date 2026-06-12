// Maps the booking screen's day chips to real calendar dates, and combines a
// slot time label ("6:00 AM") with a date into an IST (+05:30) ISO timestamp so
// the server can enforce the check-in window (PRD 1.3). Pinning to IST keeps the
// instant correct regardless of the device's timezone.

export interface DayOption { label: string; date: Date }

const pad = (n: number) => String(n).padStart(2, '0');

/** The next `n` days starting today, labelled Today / Tomorrow / weekday. */
export function upcomingDays(n: number): DayOption[] {
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    const label = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-IN', { weekday: 'short' });
    return { label, date: d };
  });
}

/** Parse a "6:00 AM" / "6 PM" / "18:00" label into 24h, or null if unparseable. */
function parseTime(label: string): { h: number; m: number } | null {
  const m = label.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i);
  if (!m) return null;
  let h = Number(m[1]);
  const min = m[2] ? Number(m[2]) : 0;
  const ap = m[3]?.toUpperCase();
  if (ap === 'PM' && h < 12) h += 12;
  if (ap === 'AM' && h === 12) h = 0;
  if (h > 23 || min > 59) return null;
  return { h, m: min };
}

/** Combine a date + slot time label into an IST (+05:30) ISO timestamp, or null. */
export function slotStartIso(date: Date, timeLabel: string): string | null {
  const t = parseTime(timeLabel);
  if (!t) return null;
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(t.h)}:${pad(t.m)}:00+05:30`;
}

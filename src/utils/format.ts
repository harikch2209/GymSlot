import { colors } from '@/theme';
import { CrowdLevel } from '@/types';

/** Indian-rupee formatting with en-IN digit grouping. */
export function inr(amount: number): string {
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

export function crowdColor(level: CrowdLevel): string {
  switch (level) {
    case 'Low': return colors.crowdLow;
    case 'Moderate': return colors.crowdModerate;
    case 'High': return colors.crowdHigh;
    case 'Full': return colors.crowdFull;
    default: return colors.crowdUnknown;
  }
}

export function crowdLabel(level: CrowdLevel): string {
  return level === 'Unknown' ? 'Not available' : level;
}

/** "Updated 3 min ago" / "Updated just now" / hours. */
export function ago(mins: number): string {
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const h = Math.round(mins / 60);
  return h === 1 ? '1 hour ago' : `${h} hours ago`;
}

/** Split a GST-inclusive amount into base + tax (default 18% for fitness services). */
export function gstSplit(inclusive: number, rate = 0.18): { base: number; tax: number } {
  const base = Math.round(inclusive / (1 + rate));
  return { base, tax: Math.max(0, inclusive - base) };
}

/** A short "expires in N days" / "expired" label for a credit, or null if it never expires. */
export function expiryLabel(expiresAt: string | null): string | null {
  if (!expiresAt) return null;
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return 'expired';                     // matches the balance exclusion (<= now)
  const days = Math.ceil(ms / 86_400_000);
  if (days === 0) return 'expires today';
  if (days <= 30) return `expires in ${days} day${days === 1 ? '' : 's'}`;
  return `expires ${new Date(expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`;
}

/** Minutes-of-day for a clock label like "6:00 AM" / "10 PM" / "18:00", or null. */
function parseClock(label: string): number | null {
  const m = label.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i);
  if (!m) return null;
  let h = Number(m[1]);
  const min = m[2] ? Number(m[2]) : 0;
  const ap = m[3]?.toUpperCase();
  if (ap === 'PM' && h < 12) h += 12;
  if (ap === 'AM' && h === 12) h = 0;
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/** Whether a gym is open now from its "6:00 AM – 10:00 PM" timings string, or null if unparseable. */
export function isOpenNow(timings: string | null | undefined): boolean | null {
  if (!timings) return null;
  const m = timings.match(/(\d{1,2}(?::\d{2})?\s*(?:AM|PM)?)\s*(?:–|—|-|to)\s*(\d{1,2}(?::\d{2})?\s*(?:AM|PM)?)/i);
  if (!m) return null;
  const open = parseClock(m[1]);
  const close = parseClock(m[2]);
  if (open == null || close == null) return null;
  const d = new Date();
  const mins = d.getHours() * 60 + d.getMinutes();
  if (close <= open) return mins >= open || mins < close; // crosses midnight
  return mins >= open && mins < close;
}

export function initials(name: string | null | undefined): string {
  if (!name) return 'GS';
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('') || 'GS';
}

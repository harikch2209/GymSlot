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

export function initials(name: string | null | undefined): string {
  if (!name) return 'GS';
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('') || 'GS';
}

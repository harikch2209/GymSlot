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

export function initials(name: string | null | undefined): string {
  if (!name) return 'GS';
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('') || 'GS';
}

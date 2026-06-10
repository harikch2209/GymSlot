import { colors } from '@/theme';
import { CrowdLevel } from '@/types';

export function inr(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

export function crowdColor(level: CrowdLevel): string {
  switch (level) {
    case 'Low':
      return colors.crowdLow;
    case 'Moderate':
      return colors.crowdModerate;
    case 'High':
      return colors.crowdHigh;
    case 'Full':
      return colors.crowdFull;
    default:
      return colors.crowdUnknown;
  }
}

export function crowdLabel(level: CrowdLevel): string {
  return level === 'Unknown' ? 'Not available' : level;
}

let counter = 0;
export function makeId(prefix = 'id'): string {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}_${counter}`;
}

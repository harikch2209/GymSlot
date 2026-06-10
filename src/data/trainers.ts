import { Trainer } from '@/types';

export const TRAINERS: Trainer[] = [
  {
    id: 't1',
    name: 'Rohan Mehta',
    specializations: ['Strength', 'Fat loss'],
    experienceYears: 6,
    rating: 4.7,
    fee30: 199,
    fee60: 349,
    languages: ['English', 'Hindi'],
    avatar: '🧑‍🦱',
  },
  {
    id: 't2',
    name: 'Aisha Khan',
    specializations: ['HIIT', 'Mobility', 'Rehab'],
    experienceYears: 4,
    rating: 4.8,
    fee30: 179,
    fee60: 329,
    languages: ['English', 'Kannada'],
    avatar: '👩',
  },
  {
    id: 't3',
    name: 'Vikram Rao',
    specializations: ['Powerlifting', 'CrossFit'],
    experienceYears: 9,
    rating: 4.9,
    fee30: 249,
    fee60: 449,
    languages: ['English', 'Telugu', 'Hindi'],
    avatar: '🧔',
  },
];

/** Trainer fee range shown before booking (PRD Module 4.2 step 1). */
export function trainerFeeRange(duration: 30 | 60): { min: number; max: number } {
  const fees = TRAINERS.map((t) => (duration === 30 ? t.fee30 : t.fee60));
  return { min: Math.min(...fees), max: Math.max(...fees) };
}

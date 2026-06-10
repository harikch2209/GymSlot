// Domain types modeled on the GymSlot PRD.

export type CrowdLevel = 'Low' | 'Moderate' | 'High' | 'Full' | 'Unknown';

export type Amenity =
  | 'Cardio'
  | 'Weights'
  | 'Shower'
  | 'Parking'
  | 'AC'
  | 'Locker'
  | 'CrossFit';

export interface Slot {
  id: string;
  /** Local time label, e.g. "06:30". */
  time: string;
  /** Duration in minutes (30 or 60). */
  duration: 30 | 60;
  price: number; // INR
  capacity: number;
  booked: number;
  peak: boolean;
}

export interface Gym {
  id: string;
  name: string;
  area: string;
  distanceKm: number;
  rating: number;
  reviews: number;
  priceFrom: number; // INR, lowest slot price
  crowd: CrowdLevel;
  crowdUpdatedMinsAgo: number;
  amenities: Amenity[];
  image: string; // emoji banner stand-in (no asset bundling needed)
  about: string;
  timings: string;
  slots: Slot[];
}

export interface Trainer {
  id: string;
  name: string;
  specializations: string[];
  experienceYears: number;
  rating: number;
  fee30: number;
  fee60: number;
  languages: string[];
  avatar: string; // emoji
}

export interface GymEvent {
  id: string;
  gymId: string;
  gymName: string;
  title: string;
  category: string;
  description: string;
  date: string; // human label
  time: string;
  durationMins: number;
  capacity: number;
  reserved: number;
  price: number; // 0 = free
  image: string; // emoji
  whatToBring: string;
}

export type BookingStatus = 'Confirmed' | 'Completed' | 'Cancelled';

export interface Booking {
  id: string;
  kind: 'slot' | 'event';
  gymId: string;
  gymName: string;
  title: string; // slot label or event title
  date: string;
  time: string;
  durationMins: number;
  amountPaid: number;
  creditsUsed: number;
  trainerId?: string;
  trainerName?: string;
  trainerStatus?: 'Searching' | 'Assigned' | 'Unmatched';
  status: BookingStatus;
  qrPayload: string;
  checkedIn: boolean;
  createdAt: number;
}

export type CreditReason =
  | 'refund'
  | 'cancellation-bonus'
  | 'promo'
  | 'goodwill'
  | 'spend';

export interface CreditEntry {
  id: string;
  amount: number; // positive = credit, negative = debit
  reason: CreditReason;
  label: string;
  reference?: string;
  at: number;
}

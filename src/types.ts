// App-facing domain types (camelCased) plus mappers from Supabase rows.
import type { Database } from './lib/database.types';

type Row<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

export type CrowdLevel = 'Low' | 'Moderate' | 'High' | 'Full' | 'Unknown';
export type Amenity =
  | 'Cardio' | 'Weights' | 'Shower' | 'Parking' | 'AC' | 'Locker' | 'CrossFit';
export type BookingStatus = 'Confirmed' | 'Completed' | 'Cancelled';
export type CreditReason =
  | 'refund' | 'cancellation-bonus' | 'promo' | 'goodwill' | 'spend';

export interface Slot {
  id: string;
  gymId: string;
  time: string;
  duration: 30 | 60;
  price: number;
  capacity: number;
  peak: boolean;
  /** Filled in from slot_availability(); falls back to capacity before load. */
  remaining: number;
}

export interface Gym {
  id: string;
  name: string;
  area: string;
  city: string;
  distanceKm: number | null;
  rating: number;
  reviews: number;
  priceFrom: number;
  crowd: CrowdLevel;
  crowdUpdatedMinsAgo: number;
  amenities: Amenity[];
  imageUrl: string | null;
  images: string[];
  about: string;
  timings: string;
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
  avatarUrl: string | null;
  bio: string;
}

export interface GymEvent {
  id: string;
  gymId: string | null;
  gymName: string;
  title: string;
  category: string;
  description: string;
  date: string;
  time: string;
  durationMins: number;
  capacity: number;
  reserved: number;
  price: number;
  imageUrl: string | null;
  whatToBring: string;
}

export interface Booking {
  id: string;
  kind: 'slot' | 'event';
  gymId: string | null;
  gymName: string;
  title: string;
  date: string;
  time: string;
  durationMins: number;
  amountPaid: number;
  creditsUsed: number;
  trainerId?: string | null;
  trainerName?: string | null;
  trainerStatus?: 'Searching' | 'Assigned' | 'Unmatched' | null;
  status: BookingStatus;
  qrPayload: string;
  checkedIn: boolean;
  createdAt: string;
}

export interface CreditEntry {
  id: string;
  amount: number;
  reason: CreditReason;
  label: string;
  reference?: string | null;
  at: string;
}

// ---------- mappers ----------

const minsAgo = (iso: string | null): number =>
  iso ? Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000)) : 999;

export function mapGym(r: Row<'gyms'>): Gym {
  return {
    id: r.id,
    name: r.name,
    area: r.area,
    city: r.city,
    distanceKm: null,
    rating: Number(r.rating),
    reviews: r.reviews,
    priceFrom: r.price_from,
    crowd: r.crowd as CrowdLevel,
    crowdUpdatedMinsAgo: minsAgo(r.crowd_updated_at),
    amenities: (r.amenities ?? []) as Amenity[],
    imageUrl: r.image_url,
    images: r.images ?? [],
    about: r.about ?? '',
    timings: r.timings ?? '',
  };
}

export function mapSlot(r: Row<'slots'>): Slot {
  return {
    id: r.id,
    gymId: r.gym_id,
    time: r.time,
    duration: r.duration as 30 | 60,
    price: r.price,
    capacity: r.capacity,
    peak: r.peak,
    remaining: r.capacity,
  };
}

export function mapTrainer(r: Row<'trainers'>): Trainer {
  return {
    id: r.id,
    name: r.name,
    specializations: r.specializations ?? [],
    experienceYears: r.experience_years,
    rating: Number(r.rating),
    fee30: r.fee_30,
    fee60: r.fee_60,
    languages: r.languages ?? [],
    avatarUrl: r.avatar_url,
    bio: r.bio ?? '',
  };
}

export function mapEvent(r: Row<'events'>): GymEvent {
  return {
    id: r.id,
    gymId: r.gym_id,
    gymName: r.gym_name,
    title: r.title,
    category: r.category,
    description: r.description ?? '',
    date: r.event_date,
    time: r.event_time,
    durationMins: r.duration_mins,
    capacity: r.capacity,
    reserved: r.reserved_seed,
    price: r.price,
    imageUrl: r.image_url,
    whatToBring: r.what_to_bring ?? '',
  };
}

export function mapBooking(r: Row<'bookings'>): Booking {
  return {
    id: r.id,
    kind: r.kind as 'slot' | 'event',
    gymId: r.gym_id,
    gymName: r.gym_name,
    title: r.title,
    date: r.booking_date,
    time: r.time,
    durationMins: r.duration_mins,
    amountPaid: r.amount_paid,
    creditsUsed: r.credits_used,
    trainerId: r.trainer_id,
    trainerName: r.trainer_name,
    trainerStatus: r.trainer_status as Booking['trainerStatus'],
    status: r.status as BookingStatus,
    qrPayload: r.qr_payload,
    checkedIn: r.checked_in,
    createdAt: r.created_at,
  };
}

export function mapLedger(r: Row<'credit_ledger'>): CreditEntry {
  return {
    id: r.id,
    amount: r.amount,
    reason: r.reason as CreditReason,
    label: r.label,
    reference: r.reference,
    at: r.created_at,
  };
}

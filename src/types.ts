// App-facing domain types (camelCased) plus mappers from Supabase rows.
import type { Database } from './lib/database.types';

type Row<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

export type CrowdLevel = 'Low' | 'Moderate' | 'High' | 'Full' | 'Unknown';
export type GymStatus = 'draft' | 'pending' | 'verified' | 'rejected';
export type Amenity =
  | 'Cardio' | 'Weights' | 'Shower' | 'Parking' | 'AC' | 'Locker' | 'CrossFit';
export type BookingStatus = 'Confirmed' | 'Completed' | 'Cancelled';
export type CreditReason =
  | 'refund' | 'cancellation-bonus' | 'promo' | 'goodwill' | 'spend';
export type NotificationType =
  | 'booking_confirmation' | 'booking_cancelled' | 'refund_status'
  | 'slot_reminder' | 'event_reminder' | 'credit_expiry'
  | 'trainer_assigned' | 'trainer_unmatched'
  | 'gym_new_booking' | 'event_nearby';
/** Keys accepted by the set_notification_pref RPC (snake_case, matches the column). */
export type NotificationPrefKey =
  | 'booking' | 'reminders' | 'trainer' | 'refunds' | 'events' | 'partner'
  | 'push_enabled' | 'sms_enabled';

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
  lat: number | null;
  lng: number | null;
  distanceKm: number | null;
  rating: number;
  reviews: number;
  priceFrom: number;
  crowd: CrowdLevel;
  crowdUpdatedMinsAgo: number;
  effectiveCapacity: number;
  walkins: number;
  amenities: Amenity[];
  imageUrl: string | null;
  images: string[];
  about: string;
  timings: string;
  /** Verification lifecycle — public discovery only shows 'verified'. */
  status: GymStatus;
  submittedAt: string | null;
  verifiedAt: string | null;
  rejectionReason: string | null;
}

export interface GymKyc {
  legalName: string | null;
  pan: string | null;
  gstin: string | null;
  bankAccountName: string | null;
  bankAccountNumber: string | null;
  bankIfsc: string | null;
}

export interface Blackout {
  id: string;
  gymId: string;
  date: string;
  slotId: string | null;
  reason: string | null;
}

export interface Settlement {
  gross: number;
  commission: number;
  payout: number;
  sessions: number;
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

export type EventStatus = 'draft' | 'published' | 'cancelled';

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
  status: EventStatus;
  cancelledAt: string | null;
}

export interface EventAnalytics {
  reservations: number;
  attended: number;
  newToGym: number;
  revenue: number;
}

export interface Booking {
  id: string;
  kind: 'slot' | 'event';
  gymId: string | null;
  gymName: string;
  title: string;
  memberName: string | null;
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
  checkedOut: boolean;
  /** Short manual check-in code (OTP fallback when the QR won't scan). */
  checkinCode: string | null;
  /** Real slot start/end (null for legacy bookings & events). Drives the check-in window. */
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
}

export interface CreditEntry {
  id: string;
  amount: number;
  reason: CreditReason;
  label: string;
  reference?: string | null;
  /** Earned credits expire 6 months after issue (null = no expiry). */
  expiresAt: string | null;
  at: string;
}

export interface Review {
  id: string;
  gymId: string;
  userId: string | null;
  reviewerName: string;
  rating: number;
  comment: string | null;
  tags: string[];
  at: string;
}

export interface TrainerReview {
  id: string;
  trainerId: string;
  userId: string;
  reviewerName: string;
  rating: number;
  comment: string | null;
  tags: string[];
  at: string;
}

export type ReportSubjectType = 'gym' | 'trainer' | 'booking' | 'event' | 'user';
export type ReportStatus = 'open' | 'reviewing' | 'resolved' | 'dismissed';

export interface Report {
  id: string;
  reporterId: string;
  subjectType: ReportSubjectType;
  subjectId: string | null;
  subjectLabel: string | null;
  reason: string;
  details: string | null;
  status: ReportStatus;
  resolution: string | null;
  at: string;
  resolvedAt: string | null;
}

export interface AppNotification {
  id: string;
  type: NotificationType | string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  /** Subject id for deep-linking (usually a booking id). */
  reference: string | null;
  read: boolean;
  at: string;
}

export interface NotificationPrefs {
  booking: boolean;
  reminders: boolean;
  trainer: boolean;
  refunds: boolean;
  events: boolean;
  partner: boolean;
  pushEnabled: boolean;
  smsEnabled: boolean;
}

// ---------- mappers ----------

const minsAgo = (iso: string | null): number =>
  iso ? Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000)) : 999;

/** Crowd readings older than this are no longer trustworthy → shown as "Not available". */
const CROWD_STALE_AFTER_MINS = 90;

export function mapGym(r: Row<'gyms'>): Gym {
  const updatedMins = minsAgo(r.crowd_updated_at);
  let crowd = r.crowd as CrowdLevel;
  if (crowd !== 'Unknown' && updatedMins > CROWD_STALE_AFTER_MINS) crowd = 'Unknown'; // staleness degrade
  return {
    id: r.id,
    name: r.name,
    area: r.area,
    city: r.city,
    lat: r.lat,
    lng: r.lng,
    distanceKm: null,
    rating: Number(r.rating),
    reviews: r.reviews,
    priceFrom: r.price_from,
    crowd,
    crowdUpdatedMinsAgo: updatedMins,
    effectiveCapacity: r.effective_capacity,
    walkins: r.walkins,
    amenities: (r.amenities ?? []) as Amenity[],
    imageUrl: r.image_url,
    images: r.images ?? [],
    about: r.about ?? '',
    timings: r.timings ?? '',
    status: (r.status ?? 'verified') as GymStatus,
    submittedAt: r.submitted_at,
    verifiedAt: r.verified_at,
    rejectionReason: r.rejection_reason,
  };
}

export function mapKyc(r: Row<'gym_kyc'>): GymKyc {
  return {
    legalName: r.legal_name,
    pan: r.pan,
    gstin: r.gstin,
    bankAccountName: r.bank_account_name,
    bankAccountNumber: r.bank_account_number,
    bankIfsc: r.bank_ifsc,
  };
}

export function mapBlackout(r: Row<'gym_blackouts'>): Blackout {
  return {
    id: r.id,
    gymId: r.gym_id,
    date: r.blackout_date,
    slotId: r.slot_id,
    reason: r.reason,
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
    status: (r.status ?? 'published') as EventStatus,
    cancelledAt: r.cancelled_at,
  };
}

export function mapBooking(r: Row<'bookings'>): Booking {
  return {
    id: r.id,
    kind: r.kind as 'slot' | 'event',
    gymId: r.gym_id,
    gymName: r.gym_name,
    title: r.title,
    memberName: r.member_name,
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
    checkedOut: r.checked_out,
    checkinCode: r.checkin_code,
    startsAt: r.starts_at,
    endsAt: r.ends_at,
    createdAt: r.created_at,
  };
}

export function mapReview(r: Row<'reviews'>): Review {
  return {
    id: r.id,
    gymId: r.gym_id,
    userId: r.user_id,
    reviewerName: r.reviewer_name,
    rating: r.rating,
    comment: r.comment,
    tags: r.tags ?? [],
    at: r.created_at,
  };
}

export function mapTrainerReview(r: Row<'trainer_reviews'>): TrainerReview {
  return {
    id: r.id,
    trainerId: r.trainer_id,
    userId: r.user_id,
    reviewerName: r.reviewer_name,
    rating: r.rating,
    comment: r.comment,
    tags: r.tags ?? [],
    at: r.created_at,
  };
}

export function mapReport(r: Row<'reports'>): Report {
  return {
    id: r.id,
    reporterId: r.reporter_id,
    subjectType: r.subject_type as ReportSubjectType,
    subjectId: r.subject_id,
    subjectLabel: r.subject_label,
    reason: r.reason,
    details: r.details,
    status: r.status as ReportStatus,
    resolution: r.resolution,
    at: r.created_at,
    resolvedAt: r.resolved_at,
  };
}

export function mapLedger(r: Row<'credit_ledger'>): CreditEntry {
  return {
    id: r.id,
    amount: r.amount,
    reason: r.reason as CreditReason,
    label: r.label,
    reference: r.reference,
    expiresAt: r.expires_at,
    at: r.created_at,
  };
}

export function mapNotification(r: Row<'notifications'>): AppNotification {
  return {
    id: r.id,
    type: r.type,
    title: r.title,
    body: r.body,
    data: (r.data ?? {}) as Record<string, unknown>,
    reference: r.reference,
    read: r.status === 'read',
    at: r.created_at,
  };
}

export function mapNotificationPrefs(r: Row<'notification_prefs'>): NotificationPrefs {
  return {
    booking: r.booking,
    reminders: r.reminders,
    trainer: r.trainer,
    refunds: r.refunds,
    events: r.events,
    partner: r.partner,
    pushEnabled: r.push_enabled,
    smsEnabled: r.sms_enabled,
  };
}

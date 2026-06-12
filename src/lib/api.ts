// Typed data access. Reads hit RLS-protected tables; writes go through the
// SECURITY DEFINER RPCs so the server owns all money/ownership logic.
import { supabase } from './supabase';
import type { Database } from './database.types';
import {
  AppNotification, Blackout, Booking, CreditEntry, CrowdLevel, EventAnalytics, Gym, GymEvent, GymKyc,
  NotificationPrefKey, NotificationPrefs, Report, ReportStatus, ReportSubjectType, Review,
  Settlement, Slot, Trainer, TrainerRequest, TrainerReview,
  mapBlackout, mapBooking, mapEvent, mapGym, mapKyc, mapLedger, mapNotification,
  mapNotificationPrefs, mapReport, mapReview, mapSlot, mapTrainer, mapTrainerRequest, mapTrainerReview,
} from '@/types';

type RpcArgs<F extends keyof Database['public']['Functions']> = Database['public']['Functions'][F]['Args'];

function unwrap<T>(data: T | null, error: { message: string } | null): T {
  if (error) throw new Error(error.message);
  return data as T;
}

// ---------- catalog ----------

export async function fetchGyms(): Promise<Gym[]> {
  // Discovery shows verified gyms only (RLS also enforces this; the filter keeps
  // an owner's own pending gym out of their public list).
  const { data, error } = await supabase
    .from('gyms').select('*').eq('status', 'verified').order('rating', { ascending: false });
  return unwrap(data, error).map(mapGym);
}

export async function fetchGym(id: string): Promise<Gym | null> {
  const { data, error } = await supabase.from('gyms').select('*').eq('id', id).maybeSingle();
  const row = unwrap(data, error);
  return row ? mapGym(row) : null;
}

export async function fetchSlots(gymId: string): Promise<Slot[]> {
  const { data, error } = await supabase
    .from('slots').select('*').eq('gym_id', gymId).order('sort_order');
  return unwrap(data, error).map(mapSlot);
}

/** Slots for a gym with live remaining capacity for a given day label. */
export async function fetchSlotsWithAvailability(gymId: string, date: string): Promise<Slot[]> {
  const [slots, avail] = await Promise.all([
    fetchSlots(gymId),
    supabase.rpc('slot_availability', { p_gym_id: gymId, p_date: date }),
  ]);
  if (avail.error) throw new Error(avail.error.message);
  const remainingById = new Map((avail.data ?? []).map((a) => [a.slot_id, a.remaining]));
  return slots.map((s) => ({ ...s, remaining: remainingById.get(s.id) ?? s.capacity }));
}

export async function fetchReviews(gymId: string): Promise<Review[]> {
  const { data, error } = await supabase
    .from('reviews').select('*').eq('gym_id', gymId).order('created_at', { ascending: false });
  return unwrap(data, error).map(mapReview);
}

/** Upsert the current user's review for a gym (server requires a prior booking). */
export async function submitReview(gymId: string, rating: number, comment?: string, tags?: string[]): Promise<Review> {
  const { data, error } = await supabase.rpc('submit_review', {
    p_gym_id: gymId, p_rating: rating, p_comment: comment ?? undefined, p_tags: tags ?? undefined,
  });
  return mapReview(unwrap(data, error));
}

export async function fetchTrainerReviews(trainerId: string): Promise<TrainerReview[]> {
  const { data, error } = await supabase
    .from('trainer_reviews').select('*').eq('trainer_id', trainerId).order('created_at', { ascending: false });
  return unwrap(data, error).map(mapTrainerReview);
}

/** Rate a trainer (server requires a completed session with them). */
export async function submitTrainerReview(trainerId: string, rating: number, comment?: string, tags?: string[]): Promise<TrainerReview> {
  const { data, error } = await supabase.rpc('submit_trainer_review', {
    p_trainer_id: trainerId, p_rating: rating, p_comment: comment ?? undefined, p_tags: tags ?? undefined,
  });
  return mapTrainerReview(unwrap(data, error));
}

// ---------- reports / support (Module 5) ----------

export interface ReportInput {
  subjectType: ReportSubjectType;
  subjectId?: string | null;
  subjectLabel?: string | null;
  reason: string;
  details?: string;
}

export async function submitReport(i: ReportInput): Promise<Report> {
  const params = {
    p_subject_type: i.subjectType, p_subject_id: i.subjectId ?? null,
    p_subject_label: i.subjectLabel ?? null, p_reason: i.reason, p_details: i.details ?? undefined,
  };
  const { data, error } = await supabase.rpc('submit_report', params as RpcArgs<'submit_report'>);
  return mapReport(unwrap(data, error));
}

/** The caller's OWN reports only. Filtered by reporter explicitly — admins can
 *  read every report via RLS, so we must not rely on RLS to scope this list. */
export async function fetchMyReports(): Promise<Report[]> {
  const { data: u } = await supabase.auth.getUser();
  const uid = u.user?.id;
  if (!uid) return [];
  const { data, error } = await supabase
    .from('reports').select('*').eq('reporter_id', uid).order('created_at', { ascending: false }).limit(50);
  return unwrap(data, error).map(mapReport);
}

/** Open/reviewing reports for the support queue (admins only — RLS gates this). */
export async function fetchOpenReports(): Promise<Report[]> {
  const { data, error } = await supabase
    .from('reports').select('*').in('status', ['open', 'reviewing']).order('created_at', { ascending: true });
  return unwrap(data, error).map(mapReport);
}

export async function resolveReport(reportId: string, status: ReportStatus, resolution?: string): Promise<Report> {
  const { data, error } = await supabase.rpc('resolve_report', {
    p_report_id: reportId, p_status: status, p_resolution: resolution ?? undefined,
  });
  return mapReport(unwrap(data, error));
}

/** Admin/support: grant goodwill credits to a user (server checks admin). */
export async function issueGoodwill(userId: string, amount: number, label?: string): Promise<void> {
  const { error } = await supabase.rpc('issue_goodwill', { p_user_id: userId, p_amount: amount, p_label: label ?? undefined });
  if (error) throw new Error(error.message);
}

export async function fetchTrainers(): Promise<Trainer[]> {
  const { data, error } = await supabase.from('trainers').select('*').order('rating', { ascending: false });
  return unwrap(data, error).map(mapTrainer);
}

// ---------- trainer marketplace (Module 4) ----------

export async function fetchMyTrainer(): Promise<Trainer | null> {
  const { data: u } = await supabase.auth.getUser();
  const uid = u.user?.id;
  if (!uid) return null;
  const { data, error } = await supabase.from('trainers').select('*').eq('user_id', uid).maybeSingle();
  const row = unwrap(data, error);
  return row ? mapTrainer(row) : null;
}

export interface BecomeTrainerInput {
  name: string; specializations: string[]; experienceYears: number; fee30: number; fee60: number;
  languages: string[]; bio: string; lat?: number; lng?: number; serviceRadiusKm?: number;
}
export async function becomeTrainer(i: BecomeTrainerInput): Promise<Trainer> {
  const { data, error } = await supabase.rpc('become_trainer', {
    p_name: i.name, p_specializations: i.specializations, p_experience_years: i.experienceYears,
    p_fee_30: i.fee30, p_fee_60: i.fee60, p_languages: i.languages, p_bio: i.bio,
    p_lat: i.lat ?? undefined, p_lng: i.lng ?? undefined, p_service_radius_km: i.serviceRadiusKm ?? undefined,
  });
  return mapTrainer(unwrap(data, error));
}

export async function updateTrainerProfile(i: {
  specializations: string[]; experienceYears: number; fee30: number; fee60: number;
  languages: string[]; bio: string; serviceRadiusKm: number;
}): Promise<Trainer> {
  const { data, error } = await supabase.rpc('update_trainer_profile', {
    p_specializations: i.specializations, p_experience_years: i.experienceYears, p_fee_30: i.fee30,
    p_fee_60: i.fee60, p_languages: i.languages, p_bio: i.bio, p_service_radius_km: i.serviceRadiusKm,
  });
  return mapTrainer(unwrap(data, error));
}

export async function setTrainerAvailability(available: boolean): Promise<Trainer> {
  const { data, error } = await supabase.rpc('set_trainer_availability', { p_available: available });
  return mapTrainer(unwrap(data, error));
}

/** Trainer inbox: open requests I'm eligible for + ones assigned to me (RLS-scoped). */
export async function fetchTrainerInbox(): Promise<TrainerRequest[]> {
  const { data, error } = await supabase
    .from('trainer_requests').select('*').order('created_at', { ascending: false }).limit(50);
  return unwrap(data, error).map(mapTrainerRequest);
}

export async function acceptTrainerRequest(requestId: string): Promise<TrainerRequest> {
  const { data, error } = await supabase.rpc('accept_trainer_request', { p_request_id: requestId });
  return mapTrainerRequest(unwrap(data, error));
}

export async function trainerCancelAssignment(requestId: string): Promise<TrainerRequest> {
  const { data, error } = await supabase.rpc('trainer_cancel_assignment', { p_request_id: requestId });
  return mapTrainerRequest(unwrap(data, error));
}

export async function requestTrainer(bookingId: string, goalNote?: string): Promise<TrainerRequest> {
  const { data, error } = await supabase.rpc('request_trainer', { p_booking_id: bookingId, p_goal_note: goalNote ?? undefined });
  return mapTrainerRequest(unwrap(data, error));
}

export async function cancelTrainerRequest(requestId: string): Promise<TrainerRequest> {
  const { data, error } = await supabase.rpc('cancel_trainer_request', { p_request_id: requestId });
  return mapTrainerRequest(unwrap(data, error));
}

/** The latest trainer request for a booking (member side), if any. */
export async function fetchBookingTrainerRequest(bookingId: string): Promise<TrainerRequest | null> {
  const { data, error } = await supabase
    .from('trainer_requests').select('*').eq('booking_id', bookingId)
    .order('created_at', { ascending: false }).limit(1).maybeSingle();
  const row = unwrap(data, error);
  return row ? mapTrainerRequest(row) : null;
}

export async function fetchEvents(): Promise<GymEvent[]> {
  const { data, error } = await supabase.from('events').select('*').order('event_date');
  return unwrap(data, error).map(mapEvent);
}

export async function fetchEvent(id: string): Promise<GymEvent | null> {
  const { data, error } = await supabase.from('events').select('*').eq('id', id).maybeSingle();
  const row = unwrap(data, error);
  return row ? mapEvent(row) : null;
}

/** Published events at a gym (for the gym detail page). */
export async function fetchGymEvents(gymId: string): Promise<GymEvent[]> {
  const { data, error } = await supabase
    .from('events').select('*').eq('gym_id', gymId).eq('status', 'published').order('event_date');
  return unwrap(data, error).map(mapEvent);
}

/** All of a gym's events incl. drafts/cancelled (owner view — RLS gates it). */
export async function fetchManageEvents(gymId: string): Promise<GymEvent[]> {
  const { data, error } = await supabase
    .from('events').select('*').eq('gym_id', gymId).order('created_at', { ascending: false });
  return unwrap(data, error).map(mapEvent);
}

export interface CreateEventInput {
  gymId: string;
  title: string;
  category: string;
  description: string;
  date: string;
  time: string;
  durationMins: number;
  capacity: number;
  price?: number;
  imageUrl?: string | null;
  whatToBring?: string | null;
}

export async function createEvent(i: CreateEventInput): Promise<GymEvent> {
  const { data, error } = await supabase.rpc('create_event', {
    p_gym_id: i.gymId, p_title: i.title, p_category: i.category, p_description: i.description,
    p_event_date: i.date, p_event_time: i.time, p_duration_mins: i.durationMins, p_capacity: i.capacity,
    p_price: i.price ?? undefined, p_image_url: i.imageUrl ?? undefined, p_what_to_bring: i.whatToBring ?? undefined,
  });
  return mapEvent(unwrap(data, error));
}

export async function updateEvent(i: CreateEventInput & { eventId: string }): Promise<GymEvent> {
  const params = {
    p_event_id: i.eventId, p_title: i.title, p_category: i.category, p_description: i.description,
    p_event_date: i.date, p_event_time: i.time, p_duration_mins: i.durationMins, p_capacity: i.capacity,
    p_price: i.price ?? 0, p_image_url: i.imageUrl ?? null, p_what_to_bring: i.whatToBring ?? null,
  };
  const { data, error } = await supabase.rpc('update_event', params as RpcArgs<'update_event'>);
  return mapEvent(unwrap(data, error));
}

export async function cancelEvent(eventId: string): Promise<GymEvent> {
  const { data, error } = await supabase.rpc('cancel_event', { p_event_id: eventId });
  return mapEvent(unwrap(data, error));
}

export async function eventAnalytics(eventId: string): Promise<EventAnalytics> {
  const { data, error } = await supabase.rpc('event_analytics', { p_event_id: eventId });
  const r = unwrap(data, error)?.[0];
  return {
    reservations: r?.reservations ?? 0,
    attended: r?.attended ?? 0,
    newToGym: r?.new_to_gym ?? 0,
    revenue: r?.revenue ?? 0,
  };
}

// ---------- user data ----------

export async function fetchBookings(): Promise<Booking[]> {
  const { data, error } = await supabase
    .from('bookings').select('*').order('created_at', { ascending: false });
  return unwrap(data, error).map(mapBooking);
}

export async function fetchBooking(id: string): Promise<Booking | null> {
  const { data, error } = await supabase.from('bookings').select('*').eq('id', id).maybeSingle();
  const row = unwrap(data, error);
  return row ? mapBooking(row) : null;
}

export async function fetchLedger(): Promise<CreditEntry[]> {
  const { data, error } = await supabase
    .from('credit_ledger').select('*').order('created_at', { ascending: false });
  return unwrap(data, error).map(mapLedger);
}

export async function fetchBalance(): Promise<number> {
  const { data, error } = await supabase.rpc('credit_balance');
  return unwrap(data, error) ?? 0;
}

export async function ensureProfile(fullName?: string) {
  const { data, error } = await supabase.rpc('ensure_profile', { p_full_name: fullName ?? undefined });
  return unwrap(data, error);
}

export async function fetchProfile() {
  const { data, error } = await supabase.from('profiles').select('*').maybeSingle();
  return unwrap(data, error);
}

// ---------- mutations (server-validated) ----------

export interface CreateBookingInput {
  kind: 'slot' | 'event';
  gymId: string;
  gymName: string;
  title: string;
  date: string;
  time: string;
  durationMins: number;
  amountPaid: number;
  creditsUsed: number;
  slotId?: string | null;
  eventId?: string | null;
  trainerId?: string | null;
  trainerName?: string | null;
  /** ISO timestamp of the slot start; drives the server-side check-in window. */
  startsAt?: string | null;
}

export async function createBooking(input: CreateBookingInput): Promise<Booking> {
  const { data, error } = await supabase.rpc('create_booking', {
    p_kind: input.kind,
    p_gym_id: input.gymId,
    p_gym_name: input.gymName,
    p_title: input.title,
    p_booking_date: input.date,
    p_time: input.time,
    p_duration_mins: input.durationMins,
    p_amount_paid: input.amountPaid,
    p_credits_used: input.creditsUsed,
    p_slot_id: input.slotId ?? undefined,
    p_event_id: input.eventId ?? undefined,
    p_trainer_id: input.trainerId ?? undefined,
    p_trainer_name: input.trainerName ?? undefined,
    p_starts_at: input.startsAt ?? undefined,
  });
  return mapBooking(unwrap(data, error));
}

export async function cancelBooking(id: string, asCredits: boolean): Promise<Booking> {
  const { data, error } = await supabase.rpc('cancel_booking', {
    p_booking_id: id, p_as_credits: asCredits,
  });
  return mapBooking(unwrap(data, error));
}

export interface RescheduleInput {
  bookingId: string;
  slotId: string;
  date: string;
  time: string;
  startsAt: string | null;
  title: string;
  durationMins: number;
}

export async function rescheduleBooking(i: RescheduleInput): Promise<Booking> {
  const params = {
    p_booking_id: i.bookingId, p_slot_id: i.slotId, p_booking_date: i.date, p_time: i.time,
    p_starts_at: i.startsAt, p_title: i.title, p_duration_mins: i.durationMins,
  };
  const { data, error } = await supabase.rpc('reschedule_booking', params as RpcArgs<'reschedule_booking'>);
  return mapBooking(unwrap(data, error));
}

export async function checkinBooking(id: string): Promise<Booking> {
  const { data, error } = await supabase.rpc('checkin', { p_booking_id: id });
  return mapBooking(unwrap(data, error));
}

/** Manual check-out (improves live crowd accuracy). */
export async function checkoutBooking(id: string): Promise<Booking> {
  const { data, error } = await supabase.rpc('checkout', { p_booking_id: id });
  return mapBooking(unwrap(data, error));
}

// ---------- notifications ----------

export async function fetchNotifications(): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from('notifications').select('*').order('created_at', { ascending: false }).limit(100);
  return unwrap(data, error).map(mapNotification);
}

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await supabase.rpc('mark_notification_read', { p_id: id });
  if (error) throw new Error(error.message);
}

export async function markAllNotificationsRead(): Promise<void> {
  const { error } = await supabase.rpc('mark_all_notifications_read');
  if (error) throw new Error(error.message);
}

export async function fetchNotificationPrefs(): Promise<NotificationPrefs> {
  const { data, error } = await supabase.rpc('get_notification_prefs');
  return mapNotificationPrefs(unwrap(data, error));
}

export async function setNotificationPref(key: NotificationPrefKey, value: boolean): Promise<NotificationPrefs> {
  const { data, error } = await supabase.rpc('set_notification_pref', { p_key: key, p_value: value });
  return mapNotificationPrefs(unwrap(data, error));
}

export async function registerPushToken(token: string, platform: string): Promise<void> {
  const { error } = await supabase.rpc('register_push_token', { p_token: token, p_platform: platform });
  if (error) throw new Error(error.message);
}

export async function unregisterPushToken(token: string): Promise<void> {
  const { error } = await supabase.rpc('unregister_push_token', { p_token: token });
  if (error) throw new Error(error.message);
}

// ---------- partner (gym side) ----------

/** Platform commission taken from each booking; the rest is the gym's payout. */
export const COMMISSION_RATE = 0.15;

export async function fetchOwnedGyms(): Promise<Gym[]> {
  const { data, error } = await supabase.from('gym_owners').select('gyms(*)');
  if (error) throw new Error(error.message);
  return (data ?? [])
    .map((r) => (r as { gyms: Parameters<typeof mapGym>[0] | null }).gyms)
    .filter((g): g is NonNullable<typeof g> => !!g)
    .map(mapGym);
}

export async function claimGym(gymId: string): Promise<void> {
  const { error } = await supabase.rpc('claim_gym', { p_gym_id: gymId });
  if (error) throw new Error(error.message);
}

/** Bookings across the gyms this partner owns (RLS also enforces ownership). */
export async function fetchPartnerBookings(gymIds: string[]): Promise<Booking[]> {
  if (!gymIds.length) return [];
  const { data, error } = await supabase
    .from('bookings').select('*').in('gym_id', gymIds).order('created_at', { ascending: false });
  return unwrap(data, error).map(mapBooking);
}

export async function partnerCheckin(bookingId: string, override = false): Promise<Booking> {
  const { data, error } = await supabase.rpc('partner_checkin', { p_booking_id: bookingId, p_override: override });
  return mapBooking(unwrap(data, error));
}

/** OTP fallback: check a member in by their 6-digit code when the QR won't scan. */
export async function partnerCheckinByCode(code: string, gymId?: string | null, override = false): Promise<Booking> {
  const { data, error } = await supabase.rpc('partner_checkin_by_code', {
    p_code: code, p_gym_id: gymId ?? undefined, p_override: override,
  });
  return mapBooking(unwrap(data, error));
}

/** Partner crowd quick-update (manual level, ≤2 taps). */
export async function partnerSetCrowd(gymId: string, level: CrowdLevel): Promise<Gym> {
  const { data, error } = await supabase.rpc('partner_set_crowd', { p_gym_id: gymId, p_level: level });
  return mapGym(unwrap(data, error));
}

/** Partner walk-in count (feeds occupancy-based crowd computation). */
export async function partnerSetWalkins(gymId: string, count: number): Promise<Gym> {
  const { data, error } = await supabase.rpc('partner_set_walkins', { p_gym_id: gymId, p_count: count });
  return mapGym(unwrap(data, error));
}

// ---------- partner onboarding & management (Module 3) ----------

export interface CreateGymInput {
  name: string;
  area: string;
  city?: string;
  lat?: number | null;
  lng?: number | null;
  priceFrom?: number;
  amenities?: string[];
  about?: string | null;
  timings?: string | null;
  imageUrl?: string | null;
  images?: string[];
  effectiveCapacity?: number;
  slots?: { time: string; duration: number; price: number; capacity: number; peak: boolean }[];
}

export async function createGym(i: CreateGymInput): Promise<Gym> {
  const { data, error } = await supabase.rpc('create_gym', {
    p_name: i.name,
    p_area: i.area,
    p_city: i.city ?? undefined,
    p_lat: i.lat ?? undefined,
    p_lng: i.lng ?? undefined,
    p_price_from: i.priceFrom ?? undefined,
    p_amenities: i.amenities ?? undefined,
    p_about: i.about ?? undefined,
    p_timings: i.timings ?? undefined,
    p_image_url: i.imageUrl ?? undefined,
    p_images: i.images ?? undefined,
    p_effective_capacity: i.effectiveCapacity ?? undefined,
    p_slots: (i.slots ?? []) as unknown as Database['public']['Functions']['create_gym']['Args']['p_slots'],
  });
  return mapGym(unwrap(data, error));
}

export interface UpdateGymInput {
  gymId: string;
  name: string;
  area: string;
  city: string;
  lat: number | null;
  lng: number | null;
  priceFrom: number;
  amenities: string[];
  about: string | null;
  timings: string | null;
  imageUrl: string | null;
  images: string[];
  effectiveCapacity: number;
}

export async function updateGym(i: UpdateGymInput): Promise<Gym> {
  const params = {
    p_gym_id: i.gymId, p_name: i.name, p_area: i.area, p_city: i.city,
    p_lat: i.lat, p_lng: i.lng, p_price_from: i.priceFrom, p_amenities: i.amenities,
    p_about: i.about, p_timings: i.timings, p_image_url: i.imageUrl, p_images: i.images,
    p_effective_capacity: i.effectiveCapacity,
  };
  const { data, error } = await supabase.rpc('update_gym', params as RpcArgs<'update_gym'>);
  return mapGym(unwrap(data, error));
}

export async function submitGymForReview(gymId: string): Promise<Gym> {
  const { data, error } = await supabase.rpc('submit_gym_for_review', { p_gym_id: gymId });
  return mapGym(unwrap(data, error));
}

export async function verifyGym(gymId: string, approve: boolean, reason?: string): Promise<Gym> {
  const { data, error } = await supabase.rpc('verify_gym', {
    p_gym_id: gymId, p_approve: approve, p_reason: reason ?? undefined,
  });
  return mapGym(unwrap(data, error));
}

/** Gyms awaiting verification (admins only — RLS gates visibility). */
export async function fetchPendingGyms(): Promise<Gym[]> {
  const { data, error } = await supabase
    .from('gyms').select('*').eq('status', 'pending').order('submitted_at', { ascending: true });
  return unwrap(data, error).map(mapGym);
}

/** Whether the current user is a verification reviewer. */
export async function isAdmin(): Promise<boolean> {
  const { data, error } = await supabase.from('app_admins').select('user_id').maybeSingle();
  if (error) throw new Error(error.message);
  return !!data;
}

export async function fetchGymKyc(gymId: string): Promise<GymKyc | null> {
  const { data, error } = await supabase.from('gym_kyc').select('*').eq('gym_id', gymId).maybeSingle();
  const row = unwrap(data, error);
  return row ? mapKyc(row) : null;
}

export interface GymKycInput {
  gymId: string;
  legalName: string;
  pan: string;
  gstin: string;
  bankAccountName: string;
  bankAccountNumber: string;
  bankIfsc: string;
}

export async function upsertGymKyc(i: GymKycInput): Promise<GymKyc> {
  const { data, error } = await supabase.rpc('upsert_gym_kyc', {
    p_gym_id: i.gymId, p_legal_name: i.legalName, p_pan: i.pan, p_gstin: i.gstin,
    p_bank_account_name: i.bankAccountName, p_bank_account_number: i.bankAccountNumber, p_bank_ifsc: i.bankIfsc,
  });
  return mapKyc(unwrap(data, error));
}

export async function createSlot(
  gymId: string, time: string, duration: number, price: number, capacity: number, peak: boolean,
): Promise<Slot> {
  const { data, error } = await supabase.rpc('create_slot', {
    p_gym_id: gymId, p_time: time, p_duration: duration, p_price: price, p_capacity: capacity, p_peak: peak,
  });
  return mapSlot(unwrap(data, error));
}

export async function updateSlot(
  slotId: string, time: string, duration: number, price: number, capacity: number, peak: boolean,
): Promise<Slot> {
  const { data, error } = await supabase.rpc('update_slot', {
    p_slot_id: slotId, p_time: time, p_duration: duration, p_price: price, p_capacity: capacity, p_peak: peak,
  });
  return mapSlot(unwrap(data, error));
}

export async function deleteSlot(slotId: string): Promise<void> {
  const { error } = await supabase.rpc('delete_slot', { p_slot_id: slotId });
  if (error) throw new Error(error.message);
}

export async function fetchBlackouts(gymId: string): Promise<Blackout[]> {
  const { data, error } = await supabase
    .from('gym_blackouts').select('*').eq('gym_id', gymId).order('blackout_date', { ascending: true });
  return unwrap(data, error).map(mapBlackout);
}

export async function addBlackout(gymId: string, date: string, slotId?: string | null, reason?: string): Promise<Blackout> {
  const { data, error } = await supabase.rpc('add_blackout', {
    p_gym_id: gymId, p_date: date, p_slot_id: slotId ?? undefined, p_reason: reason ?? undefined,
  });
  return mapBlackout(unwrap(data, error));
}

export async function removeBlackout(blackoutId: string): Promise<void> {
  const { error } = await supabase.rpc('remove_blackout', { p_blackout_id: blackoutId });
  if (error) throw new Error(error.message);
}

/** Cash settled via Razorpay for the caller's gyms (zeros if none). */
export async function fetchSettlement(): Promise<Settlement> {
  const { data, error } = await supabase.rpc('partner_settlement');
  const rows = unwrap(data, error);
  const r = rows?.[0];
  return {
    gross: r?.gross ?? 0,
    commission: r?.commission ?? 0,
    payout: r?.payout ?? 0,
    sessions: r?.sessions ?? 0,
  };
}

// ---------- payments (Razorpay via Edge Functions) ----------

async function invokeFn<T>(name: string, body: object): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body: body as Record<string, unknown> });
  if (error) {
    let msg = error.message;
    try {
      const ctx = (error as { context?: Response }).context;
      const j = ctx ? await ctx.json() : null;
      if (j?.error) msg = j.error;
    } catch { /* keep default */ }
    throw new Error(msg);
  }
  return data as T;
}

export interface PaymentOrderInput {
  kind: 'slot' | 'event';
  gymId: string;
  gymName: string;
  slotId?: string | null;
  eventId?: string | null;
  trainerId?: string | null;
  trainerName?: string | null;
  durationMins: number;
  title: string;
  day: string;
  time: string;
  creditsToUse: number;
  /** ISO timestamp of the slot start; stored on the payment and passed to create_booking. */
  startsAt?: string | null;
}
export interface PaymentOrder { orderId: string; amount: number; creditsApplied: number; keyId: string; currency: string }

export function createPaymentOrder(input: PaymentOrderInput): Promise<PaymentOrder> {
  return invokeFn<PaymentOrder>('create-payment-order', input);
}

export function verifyPayment(orderId: string, paymentId: string, signature: string): Promise<{ bookingId: string }> {
  return invokeFn<{ bookingId: string }>('verify-payment', { orderId, paymentId, signature });
}

/** Pull a booking id out of a scanned QR payload: GYMSLOT|KIND|<id>|<gymId>. */
export function bookingIdFromQr(payload: string): string | null {
  const parts = payload.split('|');
  if (parts[0] !== 'GYMSLOT' || parts.length < 3) return null;
  const id = parts[2];
  return /^[0-9a-f-]{36}$/i.test(id) ? id : null;
}

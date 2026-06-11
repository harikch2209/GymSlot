// Typed data access. Reads hit RLS-protected tables; writes go through the
// SECURITY DEFINER RPCs so the server owns all money/ownership logic.
import { supabase } from './supabase';
import {
  Booking, CreditEntry, Gym, GymEvent, Review, Slot, Trainer,
  mapBooking, mapEvent, mapGym, mapLedger, mapReview, mapSlot, mapTrainer,
} from '@/types';

function unwrap<T>(data: T | null, error: { message: string } | null): T {
  if (error) throw new Error(error.message);
  return data as T;
}

// ---------- catalog ----------

export async function fetchGyms(): Promise<Gym[]> {
  const { data, error } = await supabase.from('gyms').select('*').order('rating', { ascending: false });
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
export async function submitReview(gymId: string, rating: number, comment?: string): Promise<Review> {
  const { data, error } = await supabase.rpc('submit_review', {
    p_gym_id: gymId, p_rating: rating, p_comment: comment ?? undefined,
  });
  return mapReview(unwrap(data, error));
}

export async function fetchTrainers(): Promise<Trainer[]> {
  const { data, error } = await supabase.from('trainers').select('*').order('rating', { ascending: false });
  return unwrap(data, error).map(mapTrainer);
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
  });
  return mapBooking(unwrap(data, error));
}

export async function cancelBooking(id: string, asCredits: boolean): Promise<Booking> {
  const { data, error } = await supabase.rpc('cancel_booking', {
    p_booking_id: id, p_as_credits: asCredits,
  });
  return mapBooking(unwrap(data, error));
}

export async function checkinBooking(id: string): Promise<Booking> {
  const { data, error } = await supabase.rpc('checkin', { p_booking_id: id });
  return mapBooking(unwrap(data, error));
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

export async function partnerCheckin(bookingId: string): Promise<Booking> {
  const { data, error } = await supabase.rpc('partner_checkin', { p_booking_id: bookingId });
  return mapBooking(unwrap(data, error));
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

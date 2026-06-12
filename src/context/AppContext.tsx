import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from 'react';
import {
  CreateBookingInput, cancelBooking as apiCancel, checkinBooking as apiCheckin,
  createBooking as apiCreate, fetchBookings, fetchLedger,
} from '@/lib/api';
import { Booking, CreditEntry } from '@/types';
import { useAuth } from './AuthContext';

interface AppState {
  bookings: Booking[];
  ledger: CreditEntry[];
  creditBalance: number;
  loading: boolean;
  refreshing: boolean;
  refresh: () => Promise<void>;
  createBooking: (input: CreateBookingInput) => Promise<Booking>;
  cancelBooking: (id: string, asCredits: boolean) => Promise<void>;
  checkIn: (id: string) => Promise<void>;
}

const AppContext = createContext<AppState | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [ledger, setLedger] = useState<CreditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const loadedOnce = useRef(false);

  // Mirrors the server credit_balance(): available = max(0, min(lifetime net,
  // non-expired earned)). Earned credits share a 6-month window, so expiry order =
  // FIFO spend order, and this avoids double-subtracting an already-spent grant.
  const creditBalance = useMemo(() => {
    const now = Date.now();
    let raw = 0;
    let nonExpiredEarned = 0;
    for (const e of ledger) {
      raw += e.amount;
      const live = e.expiresAt == null || new Date(e.expiresAt).getTime() > now;
      if (e.amount > 0 && live) nonExpiredEarned += e.amount;
    }
    return Math.max(0, Math.min(raw, nonExpiredEarned));
  }, [ledger]);

  const load = useCallback(async (mode: 'initial' | 'refresh') => {
    if (!user) {
      setBookings([]);
      setLedger([]);
      setLoading(false);
      return;
    }
    mode === 'refresh' ? setRefreshing(true) : setLoading(true);
    try {
      const [b, l] = await Promise.all([fetchBookings(), fetchLedger()]);
      setBookings(b);
      setLedger(l);
      loadedOnce.current = true;
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load('initial');
  }, [load]);

  const refresh = useCallback(() => load('refresh'), [load]);

  const createBooking = useCallback(async (input: CreateBookingInput) => {
    const booking = await apiCreate(input);
    await load('refresh');
    return booking;
  }, [load]);

  const cancelBooking = useCallback(async (id: string, asCredits: boolean) => {
    await apiCancel(id, asCredits);
    await load('refresh');
  }, [load]);

  const checkIn = useCallback(async (id: string) => {
    await apiCheckin(id);
    await load('refresh');
  }, [load]);

  const value = useMemo<AppState>(
    () => ({
      bookings, ledger, creditBalance, loading, refreshing,
      refresh, createBooking, cancelBooking, checkIn,
    }),
    [bookings, ledger, creditBalance, loading, refreshing, refresh, createBooking, cancelBooking, checkIn],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

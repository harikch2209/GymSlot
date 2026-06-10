import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Booking, CreditEntry, CreditReason } from '@/types';
import { makeId } from '@/utils/format';

interface NewBookingInput {
  kind: 'slot' | 'event';
  gymId: string;
  gymName: string;
  title: string;
  date: string;
  time: string;
  durationMins: number;
  amountPaid: number;
  creditsUsed: number;
  trainerId?: string;
  trainerName?: string;
}

interface AppState {
  creditBalance: number;
  ledger: CreditEntry[];
  bookings: Booking[];
  addCredits: (amount: number, reason: CreditReason, label: string, reference?: string) => void;
  createBooking: (input: NewBookingInput) => Booking;
  cancelBooking: (id: string, asCredits: boolean) => void;
  checkIn: (id: string) => void;
}

const AppContext = createContext<AppState | undefined>(undefined);

const STARTING_CREDITS = 250;

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [ledger, setLedger] = useState<CreditEntry[]>([
    {
      id: makeId('cr'),
      amount: STARTING_CREDITS,
      reason: 'promo',
      label: 'Welcome bonus 🎁',
      at: Date.now(),
    },
  ]);
  const [bookings, setBookings] = useState<Booking[]>([]);

  const creditBalance = useMemo(
    () => ledger.reduce((sum, e) => sum + e.amount, 0),
    [ledger],
  );

  const addCredits = useCallback(
    (amount: number, reason: CreditReason, label: string, reference?: string) => {
      setLedger((prev) => [
        { id: makeId('cr'), amount, reason, label, reference, at: Date.now() },
        ...prev,
      ]);
    },
    [],
  );

  const createBooking = useCallback((input: NewBookingInput): Booking => {
    const id = makeId('bk');
    const booking: Booking = {
      ...input,
      id,
      status: 'Confirmed',
      qrPayload: `GYMSLOT|${input.kind.toUpperCase()}|${id}|${input.gymId}`,
      checkedIn: false,
      createdAt: Date.now(),
      trainerStatus: input.trainerId ? 'Assigned' : undefined,
    };
    setBookings((prev) => [booking, ...prev]);

    if (input.creditsUsed > 0) {
      setLedger((prev) => [
        {
          id: makeId('cr'),
          amount: -input.creditsUsed,
          reason: 'spend',
          label: `Applied to ${input.title}`,
          reference: id,
          at: Date.now(),
        },
        ...prev,
      ]);
    }
    return booking;
  }, []);

  const cancelBooking = useCallback((id: string, asCredits: boolean) => {
    setBookings((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status: 'Cancelled' as const } : b)),
    );
    setBookings((prevBookings) => {
      const target = prevBookings.find((b) => b.id === id);
      if (target) {
        // Cash portion refund: +5% bonus when taken as credits (PRD Module 7).
        const refundBase = target.amountPaid;
        if (asCredits && refundBase > 0) {
          const bonus = Math.round(refundBase * 0.05);
          setLedger((prev) => [
            {
              id: makeId('cr'),
              amount: refundBase + bonus,
              reason: 'cancellation-bonus',
              label: `Refund as credits (+5% bonus) — ${target.title}`,
              reference: id,
              at: Date.now(),
            },
            ...prev,
          ]);
        }
        // Credit portion always returns as credits.
        if (target.creditsUsed > 0) {
          setLedger((prev) => [
            {
              id: makeId('cr'),
              amount: target.creditsUsed,
              reason: 'refund',
              label: `Credit portion returned — ${target.title}`,
              reference: id,
              at: Date.now(),
            },
            ...prev,
          ]);
        }
      }
      return prevBookings;
    });
  }, []);

  const checkIn = useCallback((id: string) => {
    setBookings((prev) =>
      prev.map((b) =>
        b.id === id ? { ...b, checkedIn: true, status: 'Completed' as const } : b,
      ),
    );
  }, []);

  const value = useMemo(
    () => ({ creditBalance, ledger, bookings, addCredits, createBooking, cancelBooking, checkIn }),
    [creditBalance, ledger, bookings, addCredits, createBooking, cancelBooking, checkIn],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

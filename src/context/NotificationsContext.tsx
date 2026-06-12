import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from 'react';
import {
  fetchNotifications, markAllNotificationsRead, markNotificationRead,
} from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { AppNotification, mapNotification } from '@/types';
import type { Database } from '@/lib/database.types';
import { registerForPush } from '@/lib/push';
import { useAuth } from './AuthContext';

interface NotificationsState {
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  refreshing: boolean;
  refresh: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsState | undefined>(undefined);

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  const load = useCallback(async (mode: 'initial' | 'refresh') => {
    if (!user) {
      setNotifications([]);
      setLoading(false);
      return;
    }
    mode === 'refresh' ? setRefreshing(true) : setLoading(true);
    try {
      setNotifications(await fetchNotifications());
    } catch {
      /* leave previous list on transient errors */
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load('initial'); }, [load]);

  // Register this device for push once we have a session, re-binding the token
  // to the current user on account switch (best-effort).
  useEffect(() => {
    if (user) registerForPush(user.id);
  }, [user?.id]);

  // Live updates: prepend new notifications as they land for this user.
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => {
          const row = payload.new as Database['public']['Tables']['notifications']['Row'];
          setNotifications((prev) =>
            prev.some((n) => n.id === row.id) ? prev : [mapNotification(row), ...prev]);
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  const refresh = useCallback(() => load('refresh'), [load]);

  const markRead = useCallback(async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    try { await markNotificationRead(id); } catch { /* optimistic; will re-sync on refresh */ }
  }, []);

  const markAllRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try { await markAllNotificationsRead(); } catch { /* optimistic */ }
  }, []);

  const value = useMemo<NotificationsState>(
    () => ({ notifications, unreadCount, loading, refreshing, refresh, markRead, markAllRead }),
    [notifications, unreadCount, loading, refreshing, refresh, markRead, markAllRead],
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications(): NotificationsState {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider');
  return ctx;
}

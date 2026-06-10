import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Fail loud and early rather than silently hitting an undefined endpoint.
  throw new Error(
    'Missing Supabase env. Copy .env.example to .env and set EXPO_PUBLIC_SUPABASE_URL ' +
      'and EXPO_PUBLIC_SUPABASE_ANON_KEY.',
  );
}

export const supabase = createClient<Database>(url, anonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // RN has no URL to parse a session out of; required to avoid web-only behavior.
    detectSessionInUrl: false,
  },
});

// Supabase only auto-refreshes tokens while the app is foregrounded. Drive that
// from AppState so sessions don't silently expire in the background.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}

import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY. Check apps/mobile/.env',
  );
}

/**
 * Session storage backed by Expo SecureStore (encrypted keychain/keystore) on
 * device. SecureStore isn't available on web, so fall back to localStorage there.
 * Supabase chunks values, so each key stays under SecureStore's 2KB limit.
 */
const secureStorage = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: Platform.OS === 'web' ? undefined : secureStorage,
    autoRefreshToken: true,
    persistSession: true,
    // No URL-based session detection on native (that's a web/OAuth-redirect concern).
    detectSessionInUrl: false,
    // PKCE (not implicit) so signInWithOAuth's callback carries a `?code=`
    // param GoogleButton can exchange, instead of tokens in a URL fragment.
    flowType: 'pkce',
  },
});

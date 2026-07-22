import { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { Text } from './ui/Text';
import { Icon } from './ui/Icon';
import { supabase } from '@/lib/supabase';

WebBrowser.maybeCompleteAuthSession();

interface GoogleButtonProps {
  /** Called with a user-facing message on failure. Defaults to a no-op. */
  onError?: (message: string) => void;
}

// Browser-redirect OAuth (Supabase signInWithOAuth + expo-web-browser), not
// the native Google Sign-In SDK — that requires a custom native module and an
// EAS dev client build; this works today in Expo Go. Handles both signup
// (new Google user) and login (returning user) via the same call.
export function GoogleButton({ onError }: GoogleButtonProps) {
  const [loading, setLoading] = useState(false);
  // Android's WebBrowser.openAuthSessionAsync sometimes resolves "dismiss"
  // even though the gymily:// redirect actually reached the app — so the
  // real callback is handled here via Linking, independent of what that
  // promise reports. This guards against handling the same code twice if
  // both paths happen to fire.
  const handledRef = useRef(false);

  useEffect(() => {
    const subscription = Linking.addEventListener('url', ({ url }) => {
      if (url.includes('auth/callback')) void handleCallbackUrl(url);
    });
    return () => subscription.remove();
  }, []);

  async function handleCallbackUrl(url: string) {
    if (handledRef.current) return;
    const { queryParams } = Linking.parse(url);
    const code = queryParams?.code;
    if (typeof code !== 'string') {
      console.log('[GoogleButton] no code in callback url, queryParams:', queryParams);
      return;
    }
    handledRef.current = true;
    setLoading(true);
    try {
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      if (exchangeError) {
        console.log('[GoogleButton] exchangeCodeForSession error:', exchangeError.message);
        onError?.(exchangeError.message);
      } else {
        console.log('[GoogleButton] session established successfully');
      }
      // Success → the root AuthGate takes over (onboarding or tabs).
    } finally {
      setLoading(false);
      await WebBrowser.dismissBrowser().catch(() => {});
    }
  }

  async function handlePress() {
    handledRef.current = false;
    setLoading(true);
    try {
      const redirectTo = Linking.createURL('auth/callback');
      console.log('[GoogleButton] requested redirectTo:', redirectTo);
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo, skipBrowserRedirect: true },
      });
      if (error || !data.url) {
        onError?.(error?.message ?? 'Could not start Google sign-in.');
        return;
      }
      console.log('[GoogleButton] authorize url:', data.url);

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      console.log('[GoogleButton] session result:', result.type, 'url' in result ? result.url : '');
      if (result.type === 'success' && 'url' in result) {
        await handleCallbackUrl(result.url);
      }
      // If it resolved as "dismiss", the Linking listener above still gets
      // a chance to handle the real redirect — don't treat dismiss as final.
    } finally {
      if (!handledRef.current) setLoading(false);
    }
  }

  return (
    <Pressable
      accessibilityRole="button"
      disabled={loading}
      onPress={handlePress}
      className="h-tap-target flex-row items-center justify-center rounded-md border border-white/10 bg-surface-container-low active:opacity-90 disabled:opacity-60"
    >
      <View className="mr-sm">
        <Icon name="g-translate" size={18} color="#FFFFFF" />
      </View>
      <Text className="font-sans-semibold text-text-main">
        {loading ? 'Connecting…' : 'Google'}
      </Text>
    </Pressable>
  );
}

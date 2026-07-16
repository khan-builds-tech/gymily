import '../global.css';
import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { PlayfairDisplay_700Bold } from '@expo-google-fonts/playfair-display';
import { AuthProvider, useAuth } from '@/providers/AuthProvider';
import { useProfile } from '@/hooks/useProfile';
import { queryClient } from '@/lib/queryClient';
import { colors } from '@/theme/colors';

const detailScreenOptions = {
  headerShown: true,
  headerStyle: { backgroundColor: colors.background },
  headerTintColor: colors.textMain,
  headerShadowVisible: false,
} as const;

SplashScreen.preventAutoHideAsync();

/**
 * Redirects between (auth) / (onboarding) / (tabs) based on session + profile
 * completeness. Onboarding is mandatory: a session without a claimed username
 * or a gym never reaches the tabs.
 */
function AuthGate() {
  const { session, initializing } = useAuth();
  const { data: profile, isLoading: profileLoading } = useProfile(session);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (initializing) return;
    if (session && profileLoading) return;

    const group = segments[0];
    const screen = segments[1];

    if (!session) {
      if (group !== '(auth)') router.replace('/(auth)/sign-in');
      return;
    }

    if (profile?.needs_username) {
      if (!(group === '(onboarding)' && screen === 'claim-username')) {
        router.replace('/(onboarding)/claim-username');
      }
      return;
    }

    if (!profile?.gym_id) {
      if (!(group === '(onboarding)' && screen === 'select-gym')) {
        router.replace('/(onboarding)/select-gym');
      }
      return;
    }

    // Fully onboarded: only pull them out of (auth)/(onboarding) if they're
    // somehow still there. Any other route (tabs, gym detail, a profile) is
    // fine — don't pin them to (tabs) specifically.
    if (group === '(auth)' || group === '(onboarding)') {
      router.replace('/(tabs)/explore');
    }
  }, [session, initializing, profile, profileLoading, segments, router]);

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0b1326' } }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(onboarding)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="gym/[id]" options={{ ...detailScreenOptions, title: 'Gym' }} />
      <Stack.Screen name="gym/change" options={{ ...detailScreenOptions, title: 'Change Gym' }} />
      <Stack.Screen name="user/[username]" options={{ ...detailScreenOptions, title: 'Profile' }} />
      <Stack.Screen name="profile-edit" options={{ ...detailScreenOptions, title: 'Edit Profile' }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    PlayfairDisplay_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <StatusBar style="light" />
            <AuthGate />
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

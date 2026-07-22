import { Pressable, View } from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/Text';
import { supabase } from '@/lib/supabase';

export default function OnboardingLayout() {
  return (
    <View className="flex-1">
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Stack.Screen name="claim-username" />
        <Stack.Screen name="select-gym" />
      </Stack>
      {/* Escape hatch — onboarding has no other way back to sign-in if a
          session's profile can't be loaded (e.g. an admin-side data issue),
          and it's otherwise a dead end since (tabs)/profile.tsx isn't reachable yet. */}
      <SafeAreaView edges={['top']} className="absolute right-0 top-0" pointerEvents="box-none">
        <Pressable
          onPress={() => supabase.auth.signOut()}
          className="px-lg py-sm active:opacity-60"
        >
          <Text variant="body-sm" className="text-text-muted/60">
            Sign out
          </Text>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

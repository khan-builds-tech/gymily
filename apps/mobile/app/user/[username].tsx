import { View, ActivityIndicator, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text } from '@/components/ui/Text';
import { Icon } from '@/components/ui/Icon';
import { usePublicProfile } from '@/hooks/usePublicProfile';
import { colors } from '@/theme/colors';

// Read-only view of another user's profile — no edit/follow controls (follows
// are Phase 7). Reached today only via a gym's member list.
export default function PublicProfileScreen() {
  const { username, fromGymId } = useLocalSearchParams<{ username: string; fromGymId?: string }>();
  const router = useRouter();
  const { data: profile, isLoading } = usePublicProfile(username);
  // Anyone in a gym's member list trains at that gym by definition — if we
  // got here from that same gym's detail screen, tapping "Trains at X" should
  // go back to it, not push a duplicate copy of the screen we just left.
  const cameFromThisGym = profile?.gym?.id === fromGymId;

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background" edges={['bottom']}>
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background" edges={['bottom']}>
        <Text variant="body-sm">Profile not found.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['bottom']}>
      <View className="items-center px-md py-lg">
        <View className="h-20 w-20 items-center justify-center rounded-full bg-surface-container-low">
          <Icon name="person" size={40} color={colors.textMuted} />
        </View>
        <Text variant="editorial" className="mt-md">
          {profile.full_name}
        </Text>
        <Text variant="body-sm" className="text-text-muted/70">
          @{profile.username}
        </Text>

        {profile.bio ? (
          <Text variant="body-sm" className="mt-md text-center">
            {profile.bio}
          </Text>
        ) : null}

        {profile.city ? (
          <Text variant="label" className="mt-sm text-text-muted/60">
            {profile.city}
          </Text>
        ) : null}

        {profile.gym ? (
          <Pressable
            onPress={() =>
              cameFromThisGym ? router.back() : router.push(`/gym/${profile.gym!.id}`)
            }
            className="mt-md rounded-md border border-white/10 bg-surface-container-low px-md py-sm active:opacity-90"
          >
            <Text className="font-sans-semibold text-text-main">Trains at {profile.gym.name}</Text>
          </Pressable>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

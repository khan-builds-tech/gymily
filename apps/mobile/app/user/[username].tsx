import { View, ActivityIndicator, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text } from '@/components/ui/Text';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/providers/AuthProvider';
import { usePublicProfile } from '@/hooks/usePublicProfile';
import { useFollowStatus, useToggleFollow } from '@/hooks/useFollow';
import { colors } from '@/theme/colors';

// Another user's profile — read-only, plus a Follow/Unfollow control.
// Reached today via a gym's member list or a Feed post's author.
export default function PublicProfileScreen() {
  const { username, fromGymId } = useLocalSearchParams<{ username: string; fromGymId?: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const { data: profile, isLoading } = usePublicProfile(username);
  const { data: isFollowing } = useFollowStatus(profile?.id, session);
  const { mutate: toggleFollow, isPending: followPending } = useToggleFollow(session);
  // Anyone in a gym's member list trains at that gym by definition — if we
  // got here from that same gym's detail screen, tapping "Trains at X" should
  // go back to it, not push a duplicate copy of the screen we just left.
  const cameFromThisGym = profile?.gym?.id === fromGymId;
  const isOwnProfile = profile?.id === session?.user.id;

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

        <Text variant="label" className="mt-sm text-text-muted/60">
          {profile.followers_count} Followers · {profile.following_count} Following
        </Text>

        {!isOwnProfile ? (
          <Button
            label={isFollowing ? 'Following' : 'Follow'}
            variant={isFollowing ? 'social' : 'primary'}
            loading={followPending}
            onPress={() => toggleFollow({ targetId: profile.id, following: isFollowing ?? false })}
            className="mt-md px-lg"
          />
        ) : null}

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

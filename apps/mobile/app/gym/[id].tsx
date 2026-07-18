import { useState } from 'react';
import { View, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import type { GymMember } from '@gymily/types';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { useGymDetail, useGymMembers } from '@/hooks/useGymDetail';
import { useProfile } from '@/hooks/useProfile';
import { useActiveMembers } from '@/hooks/useActiveMembers';
import { useCheckInStatus } from '@/hooks/useCheckInStatus';
import { useAuth } from '@/providers/AuthProvider';
import { apiFetch, ApiRequestError } from '@/lib/api';
import { colors } from '@/theme/colors';

export default function GymDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const { data: gym, isLoading: gymLoading } = useGymDetail(id);
  const { data: members, isLoading: membersLoading } = useGymMembers(id);
  const { data: myProfile } = useProfile(session);
  const { data: activeMembers } = useActiveMembers(id);
  const { data: checkInStatus } = useCheckInStatus(session);
  const [joining, setJoining] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isMyGym = myProfile?.gym_id === id;
  const isCheckedInHere = checkInStatus?.gym_id === id;

  async function handleJoin() {
    setError(null);
    setJoining(true);
    try {
      await apiFetch(`/api/gyms/${id}/join`, { method: 'POST' });
      await queryClient.invalidateQueries({ queryKey: ['profile', session?.user.id] });
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Could not join this gym.');
    } finally {
      setJoining(false);
    }
  }

  async function handleCheckInToggle() {
    setError(null);
    setCheckingIn(true);
    try {
      if (isCheckedInHere) {
        await apiFetch('/api/checkout', { method: 'POST' });
      } else {
        await apiFetch(`/api/gyms/${id}/checkin`, { method: 'POST' });
      }
      await queryClient.invalidateQueries({ queryKey: ['check-in-status', session?.user.id] });
      await queryClient.invalidateQueries({ queryKey: ['gym-active-members', id] });
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Could not update your check-in.');
    } finally {
      setCheckingIn(false);
    }
  }

  if (gymLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background" edges={['bottom']}>
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (!gym) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background" edges={['bottom']}>
        <Text variant="body-sm">Gym not found.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['bottom']}>
      <View className="px-md py-lg">
        <Text variant="editorial">{gym.name}</Text>
        {gym.address ? (
          <Text variant="body-sm" className="mt-xs">
            {gym.address}
          </Text>
        ) : null}

        <View className="mt-md flex-row gap-lg">
          <View>
            <Text variant="label" className="text-text-muted/60">
              Members
            </Text>
            <Text className="font-sans-semibold text-text-main">{gym.member_count}</Text>
          </View>
          <View>
            <Text variant="label" className="text-text-muted/60">
              Training Now
            </Text>
            <Text className="font-sans-semibold text-text-main">{activeMembers?.length ?? 0}</Text>
          </View>
        </View>

        {error ? (
          <Text variant="body-sm" className="mt-sm text-error">
            {error}
          </Text>
        ) : null}

        {isMyGym ? (
          <Button
            label={isCheckedInHere ? 'Check Out' : 'Check In'}
            variant={isCheckedInHere ? 'ghost' : 'primary'}
            loading={checkingIn}
            onPress={handleCheckInToggle}
            className={isCheckedInHere ? 'mt-md border border-error/30' : 'mt-md'}
          />
        ) : (
          <Button label="Join this gym" loading={joining} onPress={handleJoin} className="mt-md" />
        )}
      </View>

      <Text variant="label" className="px-md text-text-muted/60">
        Members
      </Text>
      <FlatList
        data={members ?? []}
        keyExtractor={(item) => item.id}
        contentContainerClassName="px-md py-md gap-sm"
        refreshing={membersLoading}
        renderItem={({ item }: { item: GymMember }) => {
          const isMe = item.id === myProfile?.id;
          return (
            <Pressable
              disabled={isMe}
              onPress={() =>
                router.push({ pathname: '/user/[username]', params: { username: item.username, fromGymId: id } })
              }
              className="flex-row items-center gap-sm rounded-md border border-white/10 bg-surface-container-low px-md py-md active:opacity-90 disabled:opacity-70"
            >
              <Icon name="person" size={20} color={colors.textMuted} />
              <View>
                <Text className="font-sans-semibold text-text-main">
                  {item.full_name}
                  {isMe ? ' (You)' : ''}
                </Text>
                <Text variant="body-sm" className="text-text-muted/70">
                  @{item.username}
                </Text>
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          !membersLoading ? (
            <Text variant="body-sm" className="text-center text-text-muted/60">
              No members yet.
            </Text>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

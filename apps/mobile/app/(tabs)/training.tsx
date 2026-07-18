import { useEffect } from 'react';
import { View, FlatList, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import type { ActiveMember } from '@gymily/types';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { useAuth } from '@/providers/AuthProvider';
import { useProfile } from '@/hooks/useProfile';
import { useCheckInStatus } from '@/hooks/useCheckInStatus';
import { useGymDetail } from '@/hooks/useGymDetail';
import { useActiveMembers } from '@/hooks/useActiveMembers';
import { apiFetch } from '@/lib/api';
import { colors } from '@/theme/colors';

const HEARTBEAT_INTERVAL_MS = 60_000;

/**
 * "Your presence" home — your own check-in status, and who else is training
 * at your gym right now (the actual "Training Now" surface Buddy Up will act
 * on). Owns the heartbeat that keeps your check-in alive while foregrounded.
 */
export default function TrainingScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const { data: myProfile } = useProfile(session);
  const { data: checkInStatus } = useCheckInStatus(session);
  const { data: gym } = useGymDetail(checkInStatus?.gym_id ?? myProfile?.gym_id ?? undefined);
  const { data: activeMembers, isLoading: activeLoading } = useActiveMembers(
    myProfile?.gym_id ?? undefined,
  );

  useEffect(() => {
    if (!checkInStatus) return;
    const handle = setInterval(() => {
      apiFetch('/api/checkin/heartbeat', { method: 'POST' }).catch(() => {});
    }, HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(handle);
  }, [checkInStatus]);

  async function handleCheckOut() {
    await apiFetch('/api/checkout', { method: 'POST' });
    await queryClient.invalidateQueries({ queryKey: ['check-in-status', session?.user.id] });
    if (checkInStatus) {
      await queryClient.invalidateQueries({ queryKey: ['gym-active-members', checkInStatus.gym_id] });
    }
  }

  const checkedInSince = checkInStatus
    ? new Date(checkInStatus.checked_in_at).toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
      })
    : null;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="gap-md px-lg py-md">
        <Text variant="editorial-lg">Training Now</Text>

        {checkInStatus ? (
          <>
            <Text variant="body-sm">
              You&apos;re training at {gym?.name ?? 'your gym'} · since {checkedInSince}
            </Text>
            <Button
              label="Check Out"
              variant="ghost"
              className="border border-error/30"
              onPress={handleCheckOut}
            />
          </>
        ) : (
          <>
            <Text variant="body-sm">Not checked in right now.</Text>
            {gym ? (
              <Button label={`Go to ${gym.name}`} onPress={() => router.push(`/gym/${gym.id}`)} />
            ) : null}
          </>
        )}
      </View>

      <Text variant="label" className="px-lg text-text-muted/60">
        Training now at {gym?.name ?? 'your gym'}
      </Text>
      <FlatList
        data={activeMembers ?? []}
        keyExtractor={(item) => item.id}
        contentContainerClassName="px-lg py-md gap-sm"
        refreshing={activeLoading}
        renderItem={({ item }: { item: ActiveMember }) => {
          const isMe = item.id === myProfile?.id;
          return (
            <Pressable
              disabled={isMe}
              onPress={() =>
                router.push({
                  pathname: '/user/[username]',
                  params: { username: item.username, fromGymId: myProfile?.gym_id ?? '' },
                })
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
          !activeLoading ? (
            <Text variant="body-sm" className="text-center text-text-muted/60">
              No one training right now.
            </Text>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

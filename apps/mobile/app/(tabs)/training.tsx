import { useEffect, useState, type ReactNode } from 'react';
import { View, FlatList, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import type { ActiveMember, IncomingBuddyRequest } from '@gymily/types';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { useAuth } from '@/providers/AuthProvider';
import { useProfile } from '@/hooks/useProfile';
import { useCheckInStatus } from '@/hooks/useCheckInStatus';
import { useGymDetail } from '@/hooks/useGymDetail';
import { useActiveMembers } from '@/hooks/useActiveMembers';
import { useIncomingBuddyRequests } from '@/hooks/useIncomingBuddyRequests';
import { useOutgoingPendingTargets } from '@/hooks/useOutgoingPendingTargets';
import { useCurrentBuddies } from '@/hooks/useCurrentBuddies';
import { useGymBuddyPairs } from '@/hooks/useGymBuddyPairs';
import { apiFetch, ApiRequestError } from '@/lib/api';
import { colors } from '@/theme/colors';

const HEARTBEAT_INTERVAL_MS = 60_000;

/** A person row: icon + name/username, with an optional trailing action/label. */
function PersonRow({
  fullName,
  username,
  onPress,
  disabled,
  trailing,
}: {
  fullName: string;
  username?: string;
  onPress?: () => void;
  disabled?: boolean;
  trailing?: ReactNode;
}) {
  return (
    <View className="flex-row items-center gap-sm rounded-md border border-white/10 bg-surface-container-low px-md py-md">
      <Pressable
        disabled={disabled || !onPress}
        onPress={onPress}
        className="flex-1 flex-row items-center gap-sm active:opacity-90"
      >
        <Icon name="person" size={20} color={colors.textMuted} />
        <View>
          <Text className="font-sans-semibold text-text-main">{fullName}</Text>
          {username ? (
            <Text variant="body-sm" className="text-text-muted/70">
              @{username}
            </Text>
          ) : null}
        </View>
      </Pressable>
      {trailing}
    </View>
  );
}

/**
 * "Your presence" home — your own check-in status, who you're training with
 * (if anyone), and who else is at your gym right now. Buddy Up requests are
 * in-app only for now (see docs/parked-for-later.md). Owns the heartbeat
 * that keeps your check-in alive while foregrounded.
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
  const { data: incomingRequests } = useIncomingBuddyRequests(session);
  const { data: outgoingPendingTargets } = useOutgoingPendingTargets(session);
  const { data: currentBuddies } = useCurrentBuddies(session);
  const currentBuddyIds = new Set(currentBuddies?.map((b) => b.id) ?? []);
  const hasBuddy = currentBuddyIds.size > 0;
  const { data: gymBuddyPairs } = useGymBuddyPairs(myProfile?.gym_id ?? undefined);
  const [sendingTo, setSendingTo] = useState<string | null>(null);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);

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

  async function handleBuddyUp(targetId: string) {
    setSendingTo(targetId);
    try {
      await apiFetch('/api/buddy-requests', { method: 'POST', body: { target_id: targetId } });
      await queryClient.invalidateQueries({ queryKey: ['outgoing-buddy-requests', session?.user.id] });
    } catch (err) {
      Alert.alert('Error', err instanceof ApiRequestError ? err.message : 'Could not send request.');
    } finally {
      setSendingTo(null);
    }
  }

  async function handleRespond(requestId: string, accept: boolean) {
    setRespondingTo(requestId);
    try {
      await apiFetch(`/api/buddy-requests/${requestId}/respond`, {
        method: 'POST',
        body: { accept },
      });
      await queryClient.invalidateQueries({ queryKey: ['incoming-buddy-requests', session?.user.id] });
      await queryClient.invalidateQueries({ queryKey: ['current-buddies', session?.user.id] });
    } catch (err) {
      Alert.alert('Error', err instanceof ApiRequestError ? err.message : 'Could not respond.');
    } finally {
      setRespondingTo(null);
    }
  }

  async function endBuddySession() {
    setFinishing(true);
    try {
      await apiFetch('/api/buddy-requests/end', { method: 'POST' });
      await queryClient.invalidateQueries({ queryKey: ['current-buddies', session?.user.id] });
    } catch (err) {
      Alert.alert('Error', err instanceof ApiRequestError ? err.message : 'Could not end session.');
    } finally {
      setFinishing(false);
    }
  }

  function handleStopTrainingTogether() {
    const names = currentBuddies?.map((b) => b.full_name).join(', ') ?? 'your buddy';
    // The pairing itself is inherently mutual (like hanging up a call, either
    // side can end it) — this only ends that pairing, not anyone's check-in,
    // so make that explicit rather than implying "training" itself is over.
    Alert.alert(
      'Stop training together?',
      `This ends your buddy pairing with ${names} for both of you. You'll both stay checked in — this doesn't check either of you out.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Stop Training Together', style: 'destructive', onPress: endBuddySession },
      ],
    );
  }

  const checkedInSince = checkInStatus
    ? new Date(checkInStatus.checked_in_at).toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
      })
    : null;

  const othersTraining = (activeMembers ?? []).filter(
    (m) => m.id !== myProfile?.id && !currentBuddyIds.has(m.id),
  );

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

      {incomingRequests && incomingRequests.length > 0 ? (
        <View className="gap-sm px-lg pb-md">
          <Text variant="label" className="text-text-muted/60">
            Buddy requests
          </Text>
          {incomingRequests.map((request: IncomingBuddyRequest) => (
            <View
              key={request.id}
              className="flex-row items-center justify-between gap-sm rounded-md border border-primary/30 bg-surface-container-low px-md py-md"
            >
              <Text className="flex-1 font-sans-semibold text-text-main">
                {request.requester.full_name} wants to buddy up
              </Text>
              <View className="flex-row gap-sm">
                <Button
                  label="Accept"
                  loading={respondingTo === request.id}
                  onPress={() => handleRespond(request.id, true)}
                  className="px-md"
                />
                <Button
                  label="Reject"
                  variant="ghost"
                  loading={respondingTo === request.id}
                  onPress={() => handleRespond(request.id, false)}
                  className="px-md"
                />
              </View>
            </View>
          ))}
        </View>
      ) : null}

      {hasBuddy ? (
        <View className="gap-sm px-lg pb-md">
          <Text variant="label" className="text-text-muted/60">
            Training together
          </Text>
          {myProfile ? <PersonRow fullName={`${myProfile.full_name} (You)`} /> : null}
          {currentBuddies?.map((buddy) => (
            <PersonRow
              key={buddy.id}
              fullName={buddy.full_name}
              username={buddy.username}
              onPress={() => router.push(`/user/${buddy.username}`)}
            />
          ))}
          <Button
            label="Stop Training Together"
            variant="ghost"
            className="border border-error/30"
            loading={finishing}
            onPress={handleStopTrainingTogether}
          />
        </View>
      ) : null}

      <Text variant="label" className="px-lg text-text-muted/60">
        {hasBuddy ? 'Others training' : `Training now at ${gym?.name ?? 'your gym'}`}
      </Text>
      <FlatList
        data={othersTraining}
        keyExtractor={(item) => item.id}
        contentContainerClassName="px-lg py-md gap-sm"
        refreshing={activeLoading}
        renderItem={({ item }: { item: ActiveMember }) => {
          const requested = outgoingPendingTargets?.has(item.id) ?? false;
          const pairedWith = gymBuddyPairs?.get(item.id);
          return (
            <PersonRow
              fullName={item.full_name}
              username={pairedWith ? `${item.username} · training with ${pairedWith.full_name}` : item.username}
              onPress={() =>
                router.push({
                  pathname: '/user/[username]',
                  params: { username: item.username, fromGymId: myProfile?.gym_id ?? '' },
                })
              }
              trailing={
                hasBuddy || pairedWith ? null : (
                  <Button
                    label={requested ? 'Requested' : 'Buddy Up'}
                    variant={requested ? 'ghost' : 'social'}
                    disabled={requested}
                    loading={sendingTo === item.id}
                    onPress={() => handleBuddyUp(item.id)}
                    className="px-md"
                  />
                )
              }
            />
          );
        }}
        ListEmptyComponent={
          !activeLoading ? (
            <Text variant="body-sm" className="text-center text-text-muted/60">
              No one else training right now.
            </Text>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

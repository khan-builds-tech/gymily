import { View, Alert, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/providers/AuthProvider';
import { useProfile } from '@/hooks/useProfile';
import { useGymDetail } from '@/hooks/useGymDetail';
import { supabase } from '@/lib/supabase';
import { apiFetch, ApiRequestError } from '@/lib/api';

export default function ProfileScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const { data: profile } = useProfile(session);
  const { data: gym } = useGymDetail(profile?.gym_id ?? undefined);

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  function confirmDelete() {
    Alert.alert(
      'Delete account?',
      'This permanently deletes your account and profile. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiFetch('/api/account', { method: 'DELETE' });
              await supabase.auth.signOut();
            } catch (err) {
              const message =
                err instanceof ApiRequestError ? err.message : 'Could not delete account';
              Alert.alert('Error', message);
            }
          },
        },
      ],
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-1 px-lg py-md">
        <Text variant="editorial-lg">{profile?.full_name || 'Profile'}</Text>
        <Text variant="body-sm" className="mt-xs">
          @{profile?.username} · {session?.user.email}
        </Text>

        {profile?.bio ? (
          <Text variant="body-sm" className="mt-md">
            {profile.bio}
          </Text>
        ) : null}
        {profile?.city ? (
          <Text variant="label" className="mt-xs text-text-muted/60">
            {profile.city}
          </Text>
        ) : null}

        {gym ? (
          <Pressable
            onPress={() => router.push(`/gym/${gym.id}`)}
            className="mt-md rounded-md border border-white/10 bg-surface-container-low px-md py-sm active:opacity-90"
          >
            <Text className="font-sans-semibold text-text-main">Trains at {gym.name}</Text>
          </Pressable>
        ) : null}

        <View className="mt-xl gap-md">
          <Button label="Edit Profile" variant="social" onPress={() => router.push('/profile-edit')} />
          <Button label="Change Gym" variant="social" onPress={() => router.push('/gym/change')} />
          <Button label="Sign Out" variant="social" leadingIcon="logout" onPress={handleSignOut} />
          <Button
            label="Delete Account"
            variant="ghost"
            onPress={confirmDelete}
            className="border border-error/30"
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

import { View, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import { apiFetch, ApiRequestError } from '@/lib/api';

export default function ProfileScreen() {
  const { session } = useAuth();

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
        <Text variant="editorial-lg">Profile</Text>
        <Text variant="body-sm" className="mt-xs">
          {session?.user.email ?? 'Signed in'}
        </Text>

        <View className="mt-xl gap-md">
          <Button label="Sign Out" variant="social" leadingIcon="logout" onPress={handleSignOut} />
          <Button
            label="Delete Account"
            variant="ghost"
            onPress={confirmDelete}
            className="border border-error/30"
          />
        </View>

        <Text variant="body-sm" className="mt-auto text-center text-text-muted/50">
          Profile, gyms &amp; following land here in later phases.
        </Text>
      </View>
    </SafeAreaView>
  );
}

import { useEffect, useState } from 'react';
import { View, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Text } from '@/components/ui/Text';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/providers/AuthProvider';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/lib/supabase';

// Bio + city only — no avatar upload yet (no upload pipeline exists; deferred
// until Phase 6 needs one for post images anyway).
export default function ProfileEditScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const { data: profile } = useProfile(session);
  const [bio, setBio] = useState('');
  const [city, setCity] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setBio(profile.bio ?? '');
      setCity(profile.city ?? '');
    }
  }, [profile]);

  async function handleSave() {
    setError(null);
    setSaving(true);
    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ bio: bio.trim() || null, city: city.trim() || null })
        .eq('id', session!.user.id);
      if (updateError) throw updateError;
      await queryClient.invalidateQueries({ queryKey: ['profile', session?.user.id] });
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your profile.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['bottom']}>
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View className="gap-md px-md py-lg">
          <Text variant="body-sm">Update your bio and city.</Text>

          <Input label="Bio" placeholder="A little about you" value={bio} onChangeText={setBio} />
          <Input label="City" placeholder="e.g. Bengaluru" value={city} onChangeText={setCity} />

          {error ? (
            <Text variant="body-sm" className="text-error">
              {error}
            </Text>
          ) : null}

          <Button label="Save" loading={saving} onPress={handleSave} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

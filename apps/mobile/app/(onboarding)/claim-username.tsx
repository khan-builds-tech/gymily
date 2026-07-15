import { useEffect, useState } from 'react';
import { View, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { claimUsernameSchema, type CheckUsernameResult, type ClaimUsernameResult } from '@gymily/types';
import { Text } from '@/components/ui/Text';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { apiFetch, ApiRequestError } from '@/lib/api';
import { useAuth } from '@/providers/AuthProvider';

type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

// Shown once for Google sign-ups (profiles.needs_username = true) — they got
// an auto-generated placeholder username and need to claim a real one before
// continuing to gym selection.
export default function ClaimUsernameScreen() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [username, setUsername] = useState('');
  const [status, setStatus] = useState<UsernameStatus>('idle');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const value = username.trim();
    if (value.length < 3) {
      setStatus(value.length === 0 ? 'idle' : 'invalid');
      return;
    }
    setStatus('checking');
    const handle = setTimeout(async () => {
      try {
        const res = await apiFetch<CheckUsernameResult>('/api/auth/check-username', {
          method: 'POST',
          auth: false,
          body: { username: value },
        });
        setStatus(res.available ? 'available' : 'taken');
      } catch (err) {
        setStatus(err instanceof ApiRequestError && err.code === 'validation_error' ? 'invalid' : 'idle');
      }
    }, 400);
    return () => clearTimeout(handle);
  }, [username]);

  async function handleContinue() {
    setError(null);
    const parsed = claimUsernameSchema.safeParse({ username });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Please check your username.');
      return;
    }
    if (status === 'taken') {
      setError('That username is taken.');
      return;
    }

    setLoading(true);
    try {
      await apiFetch<ClaimUsernameResult>('/api/profile/claim-username', {
        method: 'POST',
        body: parsed.data,
      });
      await queryClient.invalidateQueries({ queryKey: ['profile', session?.user.id] });
      // AuthGate advances to select-gym once needs_username flips to false.
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Could not claim username.');
    } finally {
      setLoading(false);
    }
  }

  const usernameError =
    status === 'taken' ? 'Username is taken' : status === 'invalid' ? '3–30 letters, numbers or underscores' : undefined;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerClassName="flex-grow justify-center px-md py-lg"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="mb-lg">
            <Text variant="editorial" className="mb-sm">
              Pick a username
            </Text>
            <Text variant="body-sm">One last thing before you find your gym.</Text>
          </View>

          <View className="gap-md">
            <Input
              label="Username"
              leadingIcon="alternate-email"
              placeholder="ironmike"
              value={username}
              onChangeText={(t) => setUsername(t.replace(/\s/g, ''))}
              error={usernameError}
              labelAccessory={
                status === 'available' ? (
                  <Text variant="label" className="text-primary">
                    ✓ Available
                  </Text>
                ) : status === 'checking' ? (
                  <Text variant="label" className="text-text-muted/60">
                    Checking…
                  </Text>
                ) : null
              }
            />

            {error ? (
              <Text variant="body-sm" className="text-error">
                {error}
              </Text>
            ) : null}

            <Button
              label="Continue"
              trailingIcon="arrow-forward"
              loading={loading}
              onPress={handleContinue}
              className="mt-xs"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

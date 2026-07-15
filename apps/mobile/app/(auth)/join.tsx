import { useEffect, useState } from 'react';
import { View, KeyboardAvoidingView, Platform, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  registerSchema,
  type RegisterResult,
  type CheckUsernameResult,
} from '@gymily/types';
import { CinematicBackground } from '@/components/CinematicBackground';
import { Brandmark } from '@/components/Brandmark';
import { Text } from '@/components/ui/Text';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { GoogleButton } from '@/components/GoogleButton';
import { AuthFooterNav } from '@/components/AuthFooterNav';
import { apiFetch, ApiRequestError } from '@/lib/api';
import { supabase } from '@/lib/supabase';

type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

export default function JoinScreen() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('idle');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounced username availability check against the API.
  useEffect(() => {
    const value = username.trim();
    if (value.length < 3) {
      setUsernameStatus(value.length === 0 ? 'idle' : 'invalid');
      return;
    }
    setUsernameStatus('checking');
    const handle = setTimeout(async () => {
      try {
        const res = await apiFetch<CheckUsernameResult>('/api/auth/check-username', {
          method: 'POST',
          auth: false,
          body: { username: value },
        });
        setUsernameStatus(res.available ? 'available' : 'taken');
      } catch (err) {
        setUsernameStatus(err instanceof ApiRequestError && err.code === 'validation_error' ? 'invalid' : 'idle');
      }
    }, 400);
    return () => clearTimeout(handle);
  }, [username]);

  async function handleCreate() {
    setError(null);
    const parsed = registerSchema.safeParse({
      full_name: fullName,
      username,
      email,
      password,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Please check your details.');
      return;
    }
    if (usernameStatus === 'taken') {
      setError('That username is taken.');
      return;
    }

    setLoading(true);
    try {
      const result = await apiFetch<RegisterResult>('/api/auth/register', {
        method: 'POST',
        auth: false,
        body: parsed.data,
      });

      if (result.email_confirmation_required) {
        setError(null);
        router.replace('/(auth)/sign-in');
        return;
      }

      // Local/dev (no email confirmation): sign in immediately for a session.
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: parsed.data.email,
        password: parsed.data.password,
      });
      if (signInError) {
        // Account exists; let them sign in manually.
        router.replace('/(auth)/sign-in');
      }
      // Success → AuthGate redirects into the app.
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Could not create account.');
    } finally {
      setLoading(false);
    }
  }

  const usernameError =
    usernameStatus === 'taken'
      ? 'Username is taken'
      : usernameStatus === 'invalid'
        ? '3–30 letters, numbers or underscores'
        : undefined;

  return (
    <CinematicBackground>
      <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
        <View className="items-center pt-md">
          <Brandmark size={26} />
        </View>

        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerClassName="flex-grow justify-center px-md py-lg"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View className="mb-lg">
              <Text variant="editorial" className="mb-sm">
                Join the culture
              </Text>
              <Text variant="body-sm">Start your high-performance journey today.</Text>
            </View>

            <View className="gap-md">
              <Input
                label="Full Name"
                leadingIcon="person-outline"
                placeholder="John Doe"
                autoCapitalize="words"
                value={fullName}
                onChangeText={setFullName}
              />

              <Input
                label="Username"
                leadingIcon="alternate-email"
                placeholder="ironmike"
                value={username}
                onChangeText={(t) => setUsername(t.replace(/\s/g, ''))}
                error={usernameError}
                labelAccessory={
                  usernameStatus === 'available' ? (
                    <Text variant="label" className="text-primary">
                      ✓ Available
                    </Text>
                  ) : usernameStatus === 'checking' ? (
                    <Text variant="label" className="text-text-muted/60">
                      Checking…
                    </Text>
                  ) : null
                }
              />

              <Input
                label="Email Address"
                leadingIcon="mail-outline"
                placeholder="john@example.com"
                keyboardType="email-address"
                autoComplete="email"
                value={email}
                onChangeText={setEmail}
              />

              <Input
                label="Password"
                leadingIcon="lock-outline"
                placeholder="••••••••"
                secure
                value={password}
                onChangeText={setPassword}
              />

              {error ? (
                <Text variant="body-sm" className="text-error">
                  {error}
                </Text>
              ) : null}

              <Button
                label="Create Account"
                trailingIcon="arrow-forward"
                loading={loading}
                onPress={handleCreate}
                className="mt-xs"
              />
            </View>

            <View className="my-lg flex-row items-center">
              <View className="h-px flex-1 bg-white/10" />
              <Text variant="label" className="mx-md text-text-muted/50">
                Or
              </Text>
              <View className="h-px flex-1 bg-white/10" />
            </View>

            <GoogleButton onError={setError} />

            <Pressable
              className="mt-lg flex-row justify-center"
              onPress={() => router.replace('/(auth)/sign-in')}
            >
              <Text variant="body-sm">Already have an account? </Text>
              <Text variant="body-sm" className="font-sans-bold text-primary">
                Sign In
              </Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>

        <AuthFooterNav active="join" />
      </SafeAreaView>
    </CinematicBackground>
  );
}

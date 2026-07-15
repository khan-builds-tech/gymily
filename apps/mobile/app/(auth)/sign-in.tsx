import { useState } from 'react';
import {
  View,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CinematicBackground } from '@/components/CinematicBackground';
import { Brandmark } from '@/components/Brandmark';
import { Text } from '@/components/ui/Text';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { GoogleButton } from '@/components/GoogleButton';
import { AuthFooterNav } from '@/components/AuthFooterNav';
import { supabase } from '@/lib/supabase';

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignIn() {
    setError(null);
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (signInError) {
      setError(signInError.message);
      return;
    }
    // Success → the root AuthGate redirects into the app.
  }

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
            contentContainerClassName="flex-grow justify-center px-md pb-xl"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View className="mb-xl items-center">
              <Text variant="editorial" className="mb-sm text-center">
                Welcome back
              </Text>
              <Text variant="body-sm" className="max-w-[280px] text-center">
                Continue your journey towards peak performance.
              </Text>
            </View>

            <View className="gap-lg">
              <Input
                label="Email Address"
                leadingIcon="mail-outline"
                placeholder="name@email.com"
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
                labelAccessory={
                  <Pressable
                    onPress={() => Alert.alert('Reset password', 'Password reset is coming soon.')}
                  >
                    <Text variant="label" className="text-primary/70">
                      Forgot Password?
                    </Text>
                  </Pressable>
                }
              />

              {error ? (
                <Text variant="body-sm" className="text-error">
                  {error}
                </Text>
              ) : null}

              <Button label="Sign In" loading={loading} onPress={handleSignIn} className="mt-sm" />
            </View>

            <View className="my-lg flex-row items-center">
              <View className="h-px flex-1 bg-white/10" />
              <Text variant="label" className="mx-md text-text-muted/50">
                Or continue with
              </Text>
              <View className="h-px flex-1 bg-white/10" />
            </View>

            <GoogleButton onError={setError} />
          </ScrollView>
        </KeyboardAvoidingView>

        <AuthFooterNav active="sign-in" />
      </SafeAreaView>
    </CinematicBackground>
  );
}

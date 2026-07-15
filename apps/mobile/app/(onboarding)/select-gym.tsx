import { useEffect, useState } from 'react';
import { View, FlatList, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { useQueryClient } from '@tanstack/react-query';
import type { GymSearchResult, SelectGymResult } from '@gymily/types';
import { Text } from '@/components/ui/Text';
import { Input } from '@/components/ui/Input';
import { apiFetch, ApiRequestError } from '@/lib/api';
import { useAuth } from '@/providers/AuthProvider';

type SearchStatus = 'idle' | 'searching' | 'done' | 'error';

// Mandatory last onboarding step (both Google and email/password signups
// land here) — search Google Places for a gym and link it to the profile.
export default function SelectGymScreen() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [status, setStatus] = useState<SearchStatus>('idle');
  const [results, setResults] = useState<GymSearchResult[]>([]);
  const [selecting, setSelecting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Best-effort location bias — silently skip on denial/unavailability/error.
    (async () => {
      try {
        const { status: permission } = await Location.requestForegroundPermissionsAsync();
        if (permission !== 'granted') return;
        const position = await Location.getCurrentPositionAsync({}).catch(() => null);
        if (position) {
          setCoords({ lat: position.coords.latitude, lng: position.coords.longitude });
        }
      } catch (err) {
        console.log('[SelectGym] location permission/lookup failed:', err);
      }
    })();
  }, []);

  useEffect(() => {
    const value = query.trim();
    if (value.length < 2) {
      setResults([]);
      setStatus('idle');
      return;
    }
    setStatus('searching');
    const handle = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ query: value });
        if (coords) {
          params.set('lat', String(coords.lat));
          params.set('lng', String(coords.lng));
        }
        const res = await apiFetch<{ results: GymSearchResult[] }>(
          `/api/gyms/search?${params.toString()}`,
        );
        setResults(res.results);
        setStatus('done');
      } catch (err) {
        setError(err instanceof ApiRequestError ? err.message : 'Gym search failed.');
        setStatus('error');
      }
    }, 400);
    return () => clearTimeout(handle);
  }, [query, coords]);

  async function handleSelect(gym: GymSearchResult) {
    setError(null);
    setSelecting(gym.google_place_id);
    try {
      await apiFetch<SelectGymResult>('/api/gyms/select', {
        method: 'POST',
        body: gym,
      });
      await queryClient.invalidateQueries({ queryKey: ['profile', session?.user.id] });
      // AuthGate advances to the tabs once profile.gym_id is set.
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Could not select that gym.');
    } finally {
      setSelecting(null);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View className="px-md py-lg">
          <Text variant="editorial" className="mb-sm">
            Find your gym
          </Text>
          <Text variant="body-sm" className="mb-md">
            Search for the gym you train at.
          </Text>

          <Input
            label="Gym name"
            leadingIcon="search"
            placeholder="e.g. Gold's Gym"
            value={query}
            onChangeText={setQuery}
            autoCapitalize="words"
            labelAccessory={
              status === 'searching' ? (
                <Text variant="label" className="text-text-muted/60">
                  Searching…
                </Text>
              ) : null
            }
          />

          {error ? (
            <Text variant="body-sm" className="mt-sm text-error">
              {error}
            </Text>
          ) : null}
        </View>

        <FlatList
          data={results}
          keyExtractor={(item) => item.google_place_id}
          keyboardShouldPersistTaps="handled"
          contentContainerClassName="px-md pb-lg gap-sm"
          renderItem={({ item }) => (
            <Pressable
              disabled={selecting != null}
              onPress={() => handleSelect(item)}
              className="rounded-md border border-white/10 bg-surface-container-low px-md py-md active:opacity-90 disabled:opacity-60"
            >
              <Text className="font-sans-semibold text-text-main">{item.name}</Text>
              {item.address ? (
                <Text variant="body-sm" className="mt-xs text-text-muted/70">
                  {item.address}
                </Text>
              ) : null}
              {selecting === item.google_place_id ? (
                <Text variant="label" className="mt-xs text-primary">
                  Selecting…
                </Text>
              ) : null}
            </Pressable>
          )}
          ListEmptyComponent={
            status === 'done' ? (
              <Text variant="body-sm" className="mt-md text-center text-text-muted/60">
                No gyms found. Try a different search.
              </Text>
            ) : null
          }
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

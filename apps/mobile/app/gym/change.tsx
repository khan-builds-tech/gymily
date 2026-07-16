import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { GymSearchPicker } from '@/components/GymSearchPicker';

// Reachable from Profile — same search/select flow as onboarding, but
// optional and with a back button (native header, registered in _layout.tsx).
export default function ChangeGymScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['bottom']}>
      <GymSearchPicker
        title="Change your gym"
        subtitle="Search for the gym you now train at."
        onSelected={() => router.back()}
      />
    </SafeAreaView>
  );
}

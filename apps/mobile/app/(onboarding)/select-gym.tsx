import { SafeAreaView } from 'react-native-safe-area-context';
import { GymSearchPicker } from '@/components/GymSearchPicker';

// Mandatory last onboarding step (both Google and email/password signups
// land here) — search Google Places for a gym and link it to the profile.
// AuthGate advances to the tabs once profile.gym_id is set.
export default function SelectGymScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <GymSearchPicker title="Find your gym" subtitle="Search for the gym you train at." />
    </SafeAreaView>
  );
}

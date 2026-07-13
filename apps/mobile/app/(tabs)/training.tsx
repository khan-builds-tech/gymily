import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/Text';

// Placeholder — "Training Now" + Buddy Up (Phase 4 presence) land here.
export default function TrainingScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-1 items-center justify-center px-lg">
        <Text variant="editorial-lg" className="text-center">
          Training Now
        </Text>
        <Text variant="body-sm" className="mt-sm text-center">
          Live gym presence &amp; Buddy Up land here in Phase 4.
        </Text>
      </View>
    </SafeAreaView>
  );
}

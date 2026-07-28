import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/Text';
import { Brandmark } from '@/components/Brandmark';

// Placeholder — Mapbox gym discovery (Phase 5) lands here. The social feed
// (originally slated for this tab) shipped as its own Feed tab instead
// (docs/feed.md), so Map keeps this slot.
export default function ExploreScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="px-md py-md">
        <Brandmark size={24} />
      </View>
      <View className="flex-1 items-center justify-center px-lg">
        <Text variant="editorial-lg" className="text-center">
          Explore
        </Text>
        <Text variant="body-sm" className="mt-sm text-center">
          Gym discovery on a map lands here in Phase 5.
        </Text>
      </View>
    </SafeAreaView>
  );
}

import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/Text';
import { Brandmark } from '@/components/Brandmark';

// Placeholder — the social feed (Phase 6) lands here.
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
          The social feed lands here in Phase 6.
        </Text>
      </View>
    </SafeAreaView>
  );
}

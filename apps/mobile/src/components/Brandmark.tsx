import { View } from 'react-native';
import { Text } from './ui/Text';
import { Icon } from './ui/Icon';
import { colors } from '@/theme/colors';

/** The "Gymily" wordmark with its dumbbell glyph. */
export function Brandmark({ size = 28 }: { size?: number }) {
  return (
    <View className="flex-row items-center gap-sm">
      <Icon name="fitness-center" size={size * 0.8} color={colors.primary} />
      <Text
        className="font-editorial text-primary"
        style={{ fontSize: size, letterSpacing: -0.5 }}
      >
        Gymily
      </Text>
    </View>
  );
}

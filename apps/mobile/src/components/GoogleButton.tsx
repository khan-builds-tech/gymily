import { Alert, View } from 'react-native';
import { Pressable } from 'react-native';
import { Text } from './ui/Text';
import { Icon } from './ui/Icon';

// Google OAuth requires native client IDs + a redirect scheme that aren't
// configured yet. Wired as a placeholder; real flow lands with auth hardening.
export function GoogleButton() {
  function handlePress() {
    Alert.alert('Google Sign-In', 'Google sign-in will be enabled once OAuth is configured.');
  }

  return (
    <Pressable
      accessibilityRole="button"
      onPress={handlePress}
      className="h-tap-target flex-row items-center justify-center rounded-md border border-white/10 bg-surface-container-low active:opacity-90"
    >
      <View className="mr-sm">
        <Icon name="g-translate" size={18} color="#FFFFFF" />
      </View>
      <Text className="font-sans-semibold text-text-main">Google</Text>
    </Pressable>
  );
}

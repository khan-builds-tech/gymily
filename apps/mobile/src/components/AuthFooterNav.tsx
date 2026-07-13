import { View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from './ui/Text';
import { Icon } from './ui/Icon';
import { colors } from '@/theme/colors';

type Tab = 'sign-in' | 'join';

// The bottom Sign In / Join Now toggle shown on both auth screens.
export function AuthFooterNav({ active }: { active: Tab }) {
  const router = useRouter();

  const items: { key: Tab; label: string; icon: 'login' | 'person-add'; href: string }[] = [
    { key: 'sign-in', label: 'Sign In', icon: 'login', href: '/(auth)/sign-in' },
    { key: 'join', label: 'Join Now', icon: 'person-add', href: '/(auth)/join' },
  ];

  return (
    <View className="flex-row justify-around border-t border-white/5 px-md pb-sm pt-sm">
      {items.map((item) => {
        const isActive = item.key === active;
        return (
          <Pressable
            key={item.key}
            onPress={() => router.replace(item.href as never)}
            className="items-center px-lg py-sm"
          >
            <Icon
              name={item.icon}
              size={22}
              color={isActive ? colors.primary : 'rgba(148,163,184,0.6)'}
            />
            <Text
              variant="label"
              className={isActive ? 'mt-1 text-primary' : 'mt-1 text-text-muted/60'}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

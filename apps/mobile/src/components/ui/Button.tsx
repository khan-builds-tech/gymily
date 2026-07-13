import { Pressable, ActivityIndicator, View, type PressableProps } from 'react-native';
import { Text } from './Text';
import { Icon } from './Icon';
import { colors } from '@/theme/colors';
import type { MaterialIcons } from '@expo/vector-icons';

type Variant = 'primary' | 'social' | 'ghost';

interface ButtonProps extends Omit<PressableProps, 'children'> {
  label: string;
  variant?: Variant;
  loading?: boolean;
  leadingIcon?: keyof typeof MaterialIcons.glyphMap;
  trailingIcon?: keyof typeof MaterialIcons.glyphMap;
  className?: string;
}

const base =
  'h-tap-target flex-row items-center justify-center rounded-md px-lg active:opacity-90';

const variantContainer: Record<Variant, string> = {
  primary: 'bg-primary',
  social: 'border border-white/10 bg-surface-container-low',
  ghost: 'bg-transparent',
};

export function Button({
  label,
  variant = 'primary',
  loading = false,
  leadingIcon,
  trailingIcon,
  disabled,
  className,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const textColor = variant === 'primary' ? colors.onPrimary : colors.textMain;
  const labelClass =
    variant === 'primary'
      ? 'font-sans-bold uppercase tracking-wider text-on-primary'
      : 'font-sans-semibold text-text-main';

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      className={`${base} ${variantContainer[variant]} ${isDisabled ? 'opacity-50' : ''} ${className ?? ''}`}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <View className="flex-row items-center gap-sm">
          {leadingIcon ? <Icon name={leadingIcon} size={20} color={textColor} /> : null}
          <Text className={labelClass}>{label}</Text>
          {trailingIcon ? <Icon name={trailingIcon} size={20} color={textColor} /> : null}
        </View>
      )}
    </Pressable>
  );
}

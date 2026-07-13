import { useState } from 'react';
import { View, TextInput, Pressable, type TextInputProps } from 'react-native';
import { Text } from './Text';
import { Icon } from './Icon';
import { colors } from '@/theme/colors';
import type { MaterialIcons } from '@expo/vector-icons';

interface InputProps extends Omit<TextInputProps, 'placeholderTextColor'> {
  label: string;
  leadingIcon?: keyof typeof MaterialIcons.glyphMap;
  /** Show a password visibility toggle and mask input. */
  secure?: boolean;
  /** Optional right-aligned accessory next to the label (e.g. "Forgot?"). */
  labelAccessory?: React.ReactNode;
  error?: string;
}

export function Input({
  label,
  leadingIcon,
  secure = false,
  labelAccessory,
  error,
  ...rest
}: InputProps) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(secure);

  const borderClass = error
    ? 'border-error'
    : focused
      ? 'border-primary'
      : 'border-white/10';

  return (
    <View className="gap-xs">
      <View className="ml-1 flex-row items-center justify-between">
        <Text variant="label" className="text-text-muted/70">
          {label}
        </Text>
        {labelAccessory}
      </View>

      <View
        className={`h-tap-target flex-row items-center rounded-md border bg-surface-container-low px-md ${borderClass}`}
      >
        {leadingIcon ? (
          <View className="mr-sm">
            <Icon name={leadingIcon} size={20} color={focused ? colors.primary : colors.textMuted} />
          </View>
        ) : null}

        <TextInput
          className="h-full flex-1 font-sans text-body-md text-text-main"
          placeholderTextColor="rgba(148,163,184,0.4)"
          secureTextEntry={hidden}
          autoCapitalize="none"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...rest}
        />

        {secure ? (
          <Pressable onPress={() => setHidden((h) => !h)} hitSlop={8} className="ml-sm">
            <Icon name={hidden ? 'visibility' : 'visibility-off'} size={20} />
          </Pressable>
        ) : null}
      </View>

      {error ? (
        <Text variant="body-sm" className="ml-1 text-error">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

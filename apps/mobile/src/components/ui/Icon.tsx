import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';

type MaterialIconName = keyof typeof MaterialIcons.glyphMap;

interface IconProps {
  name: MaterialIconName;
  size?: number;
  /** A raw color value (defaults to the muted text color). */
  color?: string;
}

/** Thin wrapper over MaterialIcons so screens reference one icon component. */
export function Icon({ name, size = 24, color = colors.textMuted }: IconProps) {
  return <MaterialIcons name={name} size={size} color={color} />;
}

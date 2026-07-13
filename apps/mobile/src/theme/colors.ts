// Raw color values for contexts that can't use Tailwind classes
// (gradients, icon `color` props, StatusBar, native config).
// Keep in sync with tailwind.config.js / DESIGN.md.
export const colors = {
  background: '#0b1326',
  surface: '#1E293B',
  surfaceContainerLowest: '#060e20',
  surfaceContainerLow: '#131b2e',
  surfaceContainer: '#171f33',
  surfaceContainerHigh: '#222a3d',
  surfaceContainerHighest: '#2d3449',
  surfaceVariant: '#2d3449',
  outline: '#86948a',
  outlineVariant: '#3c4a42',
  primary: '#4edea3',
  primaryContainer: '#10b981',
  onPrimary: '#003824',
  secondary: '#adc6ff',
  tertiary: '#ffb3af',
  error: '#ffb4ab',
  textMain: '#F8FAFC',
  textMuted: '#94A3B8',
  cultPink: '#FF3278',
  cultRed: '#F06055',
  cultYellow: '#FFDB17',
} as const;

export type ColorToken = keyof typeof colors;

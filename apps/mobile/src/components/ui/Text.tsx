import { Text as RNText, type TextProps as RNTextProps } from 'react-native';
import { cssInterop } from 'nativewind';

// Typographic variants from the Kinetic Dark scale. Each pairs a font weight
// (Inter) or the editorial serif (Playfair) with the right size token.
const variants = {
  editorial: 'font-editorial text-[44px] leading-[48px] text-text-main',
  'editorial-lg': 'font-editorial text-[34px] leading-[40px] text-text-main',
  display: 'font-sans-bold text-display-lg-mobile text-text-main',
  headline: 'font-sans-semibold text-headline-md text-text-main',
  title: 'font-sans-semibold text-title-sm text-text-main',
  body: 'font-sans text-body-md text-text-main',
  'body-sm': 'font-sans text-body-sm text-text-muted',
  label: 'font-sans-bold text-label-caps uppercase tracking-wider text-text-muted',
  data: 'font-sans-bold text-data-num text-text-main',
} as const;

export type TextVariant = keyof typeof variants;

interface TextProps extends RNTextProps {
  variant?: TextVariant;
  className?: string;
}

cssInterop(RNText, { className: 'style' });

export function Text({ variant = 'body', className, ...rest }: TextProps) {
  return <RNText className={`${variants[variant]} ${className ?? ''}`} {...rest} />;
}

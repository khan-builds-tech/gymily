import type { ExpoConfig } from 'expo/config';

// Visual assets (icon/splash) are intentionally omitted for now — Expo falls
// back to defaults in development. Add them before a store build.
const config: ExpoConfig = {
  name: 'Gymily',
  slug: 'gymily',
  version: '0.1.0',
  scheme: 'gymily',
  orientation: 'portrait',
  userInterfaceStyle: 'dark',
  backgroundColor: '#0b1326',
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.gymily.app',
  },
  android: {
    package: 'com.gymily.app',
  },
  web: {
    bundler: 'metro',
    output: 'single',
  },
  plugins: ['expo-router', 'expo-secure-store', 'expo-font', 'expo-web-browser'],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    apiUrl: process.env.EXPO_PUBLIC_API_URL,
  },
};

export default config;

import type { ExpoConfig } from 'expo/config';

// Visual assets (icon/splash) are intentionally omitted for now — Expo falls
// back to defaults in development. Add them before a store build.
const config: ExpoConfig = {
  name: 'Gymily',
  slug: 'gymily',
  owner: 'amankhan28',
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
  plugins: [
    'expo-router',
    'expo-secure-store',
    'expo-font',
    'expo-web-browser',
    [
      'expo-location',
      {
        locationWhenInUsePermission: 'Gymily uses your location to find gyms near you.',
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    apiUrl: process.env.EXPO_PUBLIC_API_URL,
    eas: {
      projectId: 'c1e29941-00eb-46c5-9201-fc4b47f9a687',
    },
  },
};

export default config;

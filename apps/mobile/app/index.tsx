import { Redirect } from 'expo-router';

// Entry point. The AuthGate in the root layout will correct this based on
// session state; defaulting to sign-in keeps the first frame deterministic.
export default function Index() {
  return <Redirect href="/(auth)/sign-in" />;
}

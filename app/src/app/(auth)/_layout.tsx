import { Redirect, Stack } from 'expo-router';
import { useAuth } from '../../lib/auth';
import { palette } from '../../lib/theme';

export default function AuthLayout() {
  const { status } = useAuth();
  if (status === 'signedIn') return <Redirect href="/home" />;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: palette.cream } }}>
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="sign-up" />
    </Stack>
  );
}

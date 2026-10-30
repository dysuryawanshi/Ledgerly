import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Redirect, Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';
import { useAuth } from '../../lib/auth';
import { palette } from '../../lib/theme';

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

function icon(name: IconName, focusedName: IconName) {
  return ({ color, focused, size }: { color: ColorValue; focused: boolean; size: number }) => (
    <MaterialCommunityIcons name={focused ? focusedName : name} color={color as string} size={size} />
  );
}

export default function TabsLayout() {
  const { status } = useAuth();
  if (status === 'signedOut') return <Redirect href="/sign-in" />;
  if (status !== 'signedIn') return <Redirect href="/" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.green,
        tabBarInactiveTintColor: palette.muted,
        tabBarStyle: { backgroundColor: palette.paper, borderTopColor: palette.line, height: 64, paddingTop: 6 },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
        sceneStyle: { backgroundColor: palette.cream },
      }}
    >
      <Tabs.Screen name="home" options={{ title: 'Home', tabBarIcon: icon('home-outline', 'home') }} />
      <Tabs.Screen
        name="transactions"
        options={{ title: 'Transactions', tabBarIcon: icon('swap-vertical', 'swap-vertical-bold') }}
      />
      <Tabs.Screen name="categories" options={{ title: 'Categories', tabBarIcon: icon('shape-outline', 'shape') }} />
    </Tabs>
  );
}

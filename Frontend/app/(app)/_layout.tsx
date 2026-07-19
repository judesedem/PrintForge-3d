import { Stack } from 'expo-router';
import { useTheme } from '../../src/ThemeContext';

export default function AppLayout() {
  const { colors } = useTheme();
  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="notifications" options={{ headerShown: false }} />
      <Stack.Screen name="following" options={{ headerShown: false }} />
      <Stack.Screen
        name="change-password"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="marketplace/create"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="marketplace/designer/[id]"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="marketplace/[id]"
        options={{
          headerShown: true,
          headerTitle: 'Product Details',
          headerStyle: { backgroundColor: colors.sidebar },
          headerTintColor: colors.foreground,
          headerBackTitle: 'Back',
        }}
      />
    </Stack>
  );
}
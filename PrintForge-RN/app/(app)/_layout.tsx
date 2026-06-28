import { Stack } from 'expo-router';
import { useTheme } from '../../src/ThemeContext';

export default function AppLayout() {
  const { colors } = useTheme();
  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
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
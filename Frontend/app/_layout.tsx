import {
  useFonts,
  BarlowCondensed_400Regular,
  BarlowCondensed_500Medium,
  BarlowCondensed_700Bold,
  // Not in the brand brief's closed list of 3 font strings, but loaded
  // anyway for the splash screen's italicized "IDEAS" — fontStyle:
  // 'italic' applied to a custom loaded font frequently fails to render
  // as italic on Android (the renderer needs the actual italic font
  // file), so this is the only reliable cross-platform way to satisfy
  // the brief's own "italic style" requirement for that one word.
  BarlowCondensed_700Bold_Italic,
} from '@expo-google-fonts/barlow-condensed';
import { Stack } from 'expo-router';
import { ThemeProvider, useTheme } from '../src/ThemeContext';
import { SessionProvider } from '../src/SessionContext';
import { JobsProvider } from '../src/JobsContext';
import { ToastProvider } from '../src/ToastContext';
import ErrorBoundary from '../src/components/ErrorBoundary';

// This file (not root App.tsx) is what expo-router/entry actually mounts —
// see package.json's "main": "expo-router/entry". App.tsx's ThemeProvider/
// SessionProvider/JobsProvider wrapping and font loading were dead code:
// they never ran, so every useTheme()/useSession()/useJobs() call in the
// app was silently hitting each context's default stub value instead of
// real state (SessionContext's default login/register even throw
// "SessionProvider not mounted"). Moved that setup here.
function RootStack() {
  const { colors } = useTheme();
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(app)" options={{ headerShown: false }} />
      <Stack.Screen name="jobs" options={{ headerShown: false }} />
      <Stack.Screen name="admin" options={{ headerShown: false }} />
      <Stack.Screen name="staff" options={{ headerShown: false }} />
      <Stack.Screen name="profile" options={{ headerShown: false }} />
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function AppLayout() {
  const [fontsLoaded] = useFonts({
    BarlowCondensed_400Regular,
    BarlowCondensed_500Medium,
    BarlowCondensed_700Bold,
    BarlowCondensed_700Bold_Italic,
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ToastProvider>
          <SessionProvider>
            <JobsProvider>
              <RootStack />
            </JobsProvider>
          </SessionProvider>
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
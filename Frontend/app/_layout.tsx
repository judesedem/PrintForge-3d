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
      {/*
        Each name below must match an actual resolvable route: either a
        group with its own _layout.tsx (only "(app)" qualifies — it has
        app/(app)/_layout.tsx), or a literal file/index route. "(auth)" has
        no _layout.tsx or index route of its own (only login.tsx and
        register.tsx), so it must be registered as its two real leaf
        routes. Same for "staff" (only staff/queue.tsx exists, no
        staff/index.tsx). "profile" never existed at this level at all —
        the only profile.tsx in the app lives at app/(app)/(tabs)/profile.tsx,
        rendered directly by that layout's SwipePager, not routed here —
        this was a stale leftover from before profile.tsx was moved into
        (tabs). All three previously fired an Expo Router "[Layout
        children]: No route named ... exists in nested children" warning
        on every launch.
      */}
      <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)/register" options={{ headerShown: false }} />
      <Stack.Screen
        name="(auth)/forgot-password"
        options={{ headerShown: false }}
      />
      <Stack.Screen name="(app)" options={{ headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="jobs" options={{ headerShown: false }} />
      <Stack.Screen name="admin" options={{ headerShown: false }} />
      <Stack.Screen name="staff/queue" options={{ headerShown: false }} />
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
import 'expo-router/entry';
import { Slot } from 'expo-router';
import { useFonts, JetBrainsMono_400Regular } from '@expo-google-fonts/jetbrains-mono';
import {
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
} from '@expo-google-fonts/outfit';
import { ThemeProvider } from './src/ThemeContext';
import { SessionProvider } from './src/SessionContext';
import { JobsProvider } from './src/JobsContext';

export default function App() {
  const [fontsLoaded] = useFonts({
    JetBrainsMono_400Regular,
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <ThemeProvider>
      <SessionProvider>
        <JobsProvider>
          <Slot />
        </JobsProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}

// PrintForge 3D — ThemeContext
// Lets the user choose Dark / Light / System, persists the choice across
// app restarts, and exposes the *current resolved* palette via useTheme().
//
// Usage in any screen:
//   const { Colors, mode, setMode } = useTheme();
// Then use Colors.background, Colors.textPrimary, etc. exactly as before —
// just from the hook instead of a static import.

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DarkColors, LightColors } from '../constants/theme';

export type ThemeMode = 'dark' | 'light' | 'system';
type ResolvedTheme = 'dark' | 'light';

const THEME_STORAGE_KEY = '@printforge_theme_mode';

interface ThemeContextType {
  /** The user's chosen preference: 'dark' | 'light' | 'system' */
  mode: ThemeMode;
  /** What's actually being shown right now ('system' resolves to dark/light) */
  resolvedTheme: ResolvedTheme;
  /** The active color palette — swap every Colors.xxx reference to come from here */
  Colors: typeof DarkColors;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('dark');
  const [systemScheme, setSystemScheme] = useState(Appearance.getColorScheme() ?? 'dark');
  const [isLoaded, setIsLoaded] = useState(false);

  // Restore saved preference on mount
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (saved === 'dark' || saved === 'light') {
          setModeState(saved);
        }
        // Note: 'system' is intentionally not restored here even though it's
        // still a valid stored value — the toggle UI only offers Dark/Light
        // right now (see ProfileScreen), so anyone who picked System before
        // this change falls back to 'dark' instead of being stuck on a mode
        // with no visible way to change it.
      } catch (_) {
        // No saved preference yet — default to 'dark' stands
      } finally {
        setIsLoaded(true);
      }
    })();
  }, []);

  // Track OS-level scheme changes (only matters when mode === 'system')
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme(colorScheme ?? 'dark');
    });
    return () => subscription.remove();
  }, []);

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
    AsyncStorage.setItem(THEME_STORAGE_KEY, newMode).catch(() => {
      // Non-fatal — preference just won't survive an app restart
    });
  };

  const resolvedTheme: ResolvedTheme = mode === 'system' ? systemScheme : mode;
  const Colors = resolvedTheme === 'light' ? LightColors : DarkColors;

  // Avoid a flash of the wrong theme while AsyncStorage is still loading
  if (!isLoaded) return null;

  return (
    <ThemeContext.Provider value={{ mode, resolvedTheme, Colors, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

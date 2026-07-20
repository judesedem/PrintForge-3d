import { createContext, useContext, useState, ReactNode } from 'react';
import { themes, Colors, Theme } from './theme';

type ThemeContextType = {
  theme: Theme;
  colors: Colors;
  toggleTheme: () => void;
  isDark: boolean;
};

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  colors: themes.dark,
  toggleTheme: () => {},
  isDark: true,
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Dark mode is this app's default per the brand guide — always starts
  // dark regardless of the device's system color-scheme setting (no
  // useColorScheme() read here on purpose).
  const [theme, setTheme] = useState<Theme>('dark');

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  return (
    <ThemeContext.Provider value={{
      theme,
      colors: themes[theme],
      toggleTheme,
      isDark: theme === 'dark',
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

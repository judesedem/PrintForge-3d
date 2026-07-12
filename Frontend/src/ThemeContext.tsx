import { createContext, useContext, useState, ReactNode } from 'react';
import { themes, Colors, Theme } from './theme';

type ThemeContextType = {
  theme: Theme;
  colors: Colors;
  toggleTheme: () => void;
  isDark: boolean;
};

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  colors: themes.light,
  toggleTheme: () => {},
  isDark: false,
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');

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

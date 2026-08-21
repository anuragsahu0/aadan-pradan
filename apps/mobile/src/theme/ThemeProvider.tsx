import React, { createContext, useContext, useEffect, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { darkColors, lightColors, type ThemeColors, typography, spacing, radii, shadows } from './tokens';
import { useThemeStore, type ThemeMode } from '../store/themeStore';

interface ThemeContextType {
  colors: ThemeColors;
  typography: typeof typography;
  spacing: typeof spacing;
  radii: typeof radii;
  shadows: typeof shadows;
  themeMode: ThemeMode;
  isDark: boolean;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  colors: darkColors,
  typography,
  spacing,
  radii,
  shadows,
  themeMode: 'dark',
  isDark: true,
  setThemeMode: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const { themeMode, setThemeMode, loadPersistedTheme } = useThemeStore();

  useEffect(() => {
    loadPersistedTheme();
  }, [loadPersistedTheme]);

  const isDark = useMemo(() => {
    if (themeMode === 'system') {
      return systemColorScheme !== 'light';
    }
    return themeMode === 'dark';
  }, [themeMode, systemColorScheme]);

  const colors = useMemo(() => (isDark ? darkColors : lightColors), [isDark]);

  const value = useMemo(
    () => ({
      colors,
      typography,
      spacing,
      radii,
      shadows,
      themeMode,
      isDark,
      setThemeMode,
    }),
    [colors, themeMode, isDark, setThemeMode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export function useTheme(): ThemeContextType {
  return useContext(ThemeContext);
}

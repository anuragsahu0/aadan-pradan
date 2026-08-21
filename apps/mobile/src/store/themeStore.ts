import { create } from 'zustand';
import { storageService } from '../services/storageService';

export type ThemeMode = 'system' | 'dark' | 'light';

interface ThemeState {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  loadPersistedTheme: () => Promise<void>;
}

const THEME_STORAGE_KEY = 'aadan_pradan_theme_mode';

export const useThemeStore = create<ThemeState>((set) => ({
  themeMode: 'dark', // Default dark mode
  setThemeMode: (themeMode: ThemeMode) => {
    set({ themeMode });
    storageService.setItem(THEME_STORAGE_KEY, themeMode).catch(() => {});
  },
  loadPersistedTheme: async () => {
    try {
      const stored = await storageService.getItem(THEME_STORAGE_KEY);
      if (stored === 'system' || stored === 'dark' || stored === 'light') {
        set({ themeMode: stored });
      }
    } catch {
      // Keep default
    }
  },
}));

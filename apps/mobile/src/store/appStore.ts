import { create } from 'zustand';

interface AppState {
  serverConnected: boolean;
  socketConnected: boolean;
  themeMode: 'dark' | 'tactical-amber' | 'tactical-cyan';
  setServerConnected: (connected: boolean) => void;
  setSocketConnected: (connected: boolean) => void;
  setThemeMode: (mode: 'dark' | 'tactical-amber' | 'tactical-cyan') => void;
}

export const useAppStore = create<AppState>((set) => ({
  serverConnected: false,
  socketConnected: false,
  themeMode: 'dark',
  setServerConnected: (serverConnected) => set({ serverConnected }),
  setSocketConnected: (socketConnected) => set({ socketConnected }),
  setThemeMode: (themeMode) => set({ themeMode }),
}));

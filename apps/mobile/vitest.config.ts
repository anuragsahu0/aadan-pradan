import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
  },
  resolve: {
    alias: {
      'react-native': 'react-native-web',
      'expo-secure-store': path.resolve(__dirname, './tests/__mocks__/expo-secure-store.ts'),
      'expo-network': path.resolve(__dirname, './tests/__mocks__/expo-network.ts'),
      'expo-av': path.resolve(__dirname, './tests/__mocks__/expo-av.ts'),
      'expo-haptics': path.resolve(__dirname, './tests/__mocks__/expo-haptics.ts'),
    },
  },
});

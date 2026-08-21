import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const memoryFallbackStorage = new Map<string, string>();

export const storageService = {
  async getItem(key: string): Promise<string | null> {
    try {
      if (Platform.OS === 'web' && typeof sessionStorage !== 'undefined') {
        return sessionStorage.getItem(key) ?? memoryFallbackStorage.get(key) ?? null;
      }
      return await SecureStore.getItemAsync(key);
    } catch {
      return memoryFallbackStorage.get(key) ?? null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    try {
      if (Platform.OS === 'web' && typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem(key, value);
        return;
      }
      await SecureStore.setItemAsync(key, value);
    } catch {
      memoryFallbackStorage.set(key, value);
    }
  },

  async deleteItem(key: string): Promise<void> {
    try {
      if (Platform.OS === 'web' && typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem(key);
        return;
      }
      await SecureStore.deleteItemAsync(key);
    } catch {
      memoryFallbackStorage.delete(key);
    }
  },
};

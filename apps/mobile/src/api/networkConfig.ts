import { Platform } from 'react-native';

function getHostAddress(): string {
  // 1. If explicit environment variable is set and not localhost, use it
  if (process.env.EXPO_PUBLIC_API_URL && !process.env.EXPO_PUBLIC_API_URL.includes('localhost')) {
    return process.env.EXPO_PUBLIC_API_URL.replace(/\/api\/?$/, '');
  }

  // 2. In Web browser, use the current page hostname or Cloudflare cloud backend
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.hostname) {
    if (window.location.hostname.endsWith('vercel.app')) {
      return 'https://hash-assurance-crimes-hewlett.trycloudflare.com';
    }
    if (window.location.hostname.endsWith('trycloudflare.com')) {
      return `https://${window.location.hostname}`;
    }
    return `http://${window.location.hostname}:5001`;
  }

  // 3. In Native Expo Go / Dev Client, extract hostUri from Expo Constants
  try {
    const Constants = require('expo-constants').default;
    const hostUri = Constants?.expoConfig?.hostUri;
    if (hostUri) {
      const hostIp = hostUri.split(':')[0];
      if (hostIp) {
        return `http://${hostIp}:5001`;
      }
    }
  } catch {
    // Non-native / test environment
  }

  // 4. Default fallback to local LAN IP
  return 'http://192.168.1.40:5001';
}

const BASE_URL = getHostAddress();

export const API_BASE_URL = `${BASE_URL}/api`;
export const SOCKET_BASE_URL = BASE_URL;

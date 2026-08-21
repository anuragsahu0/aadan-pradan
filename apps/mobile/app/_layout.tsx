import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { ThemeProvider, useTheme } from '../src/theme';
import { useAuthStore } from '../src/store/authStore';
import { socketManager } from '../src/services/socket/socketManager';
import { appLifecycleManager } from '../src/services/lifecycle/appLifecycleManager';
import { ConnectionStatusBar } from '../src/components/common/ConnectionStatusBar';
import { ErrorBoundary } from '../src/components/common/ErrorBoundary';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 10000,
    },
  },
});

function AppNavigation() {
  const { colors, isDark } = useTheme();
  const restoreSession = useAuthStore((s) => s.restoreSession);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const accessToken = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    // Initialize global app lifecycle manager (background safety & foreground resume)
    appLifecycleManager.initialize();
    return () => {
      appLifecycleManager.cleanup();
    };
  }, []);

  useEffect(() => {
    // Attempt session restoration on mount
    restoreSession().catch(() => {});
  }, [restoreSession]);

  useEffect(() => {
    // Connect socket if authenticated, disconnect if logged out
    if (isAuthenticated && accessToken) {
      socketManager.connect();
    } else {
      socketManager.disconnect();
    }
  }, [isAuthenticated, accessToken]);

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor={colors.background} />
      <ConnectionStatusBar />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="splash" options={{ headerShown: false, animation: 'none' }} />
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding/index" options={{ headerShown: false }} />
        <Stack.Screen name="auth/index" options={{ headerShown: false }} />
        <Stack.Screen name="auth/login" options={{ headerShown: false }} />
        <Stack.Screen name="auth/register" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="admin/index" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <AppNavigation />
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

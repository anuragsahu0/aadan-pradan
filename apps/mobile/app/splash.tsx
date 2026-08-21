import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../src/theme';
import { storageService } from '../src/services/storageService';
import { useAuthStore } from '../src/store/authStore';
import { APP_NAME, APP_TAGLINE } from '@aadan-pradan/config';

export const ONBOARDING_STORAGE_KEY = 'aadan_pradan_onboarding_completed';

export default function SplashScreen() {
  const router = useRouter();
  const { colors, typography, spacing } = useTheme();

  // Animation values
  const pulseAnim = useRef(new Animated.Value(0.4)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Start pulse and fade entrance
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 0.4, duration: 600, useNativeDriver: true }),
        ])
      ),
    ]).start();

    // Automatically assign operator and navigate directly to virtual walkie-talkie
    const timer = setTimeout(async () => {
      try {
        const isAuthed = useAuthStore.getState().isAuthenticated;
        const hasToken = await storageService.getItem('ap_refresh_token');

        if (isAuthed || hasToken) {
          router.replace('/(tabs)');
        } else {
          // Automatic operator callsign assignment on arrival
          await useAuthStore.getState().autoAssignGuest();
          router.replace('/(tabs)');
        }
      } catch {
        await useAuthStore.getState().autoAssignGuest();
        router.replace('/(tabs)');
      }
    }, 800); // Snappy 800ms splash entrance

    return () => clearTimeout(timer);
  }, [router, fadeAnim, scaleAnim, pulseAnim]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl }}>
        <Animated.View
          style={{
            alignItems: 'center',
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          }}
        >
          {/* Official Logo Emblem */}
          <View style={{ alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg }}>
            <Image
              source={require('../assets/icon.png')}
              style={{
                width: 140,
                height: 140,
                borderRadius: 28,
              }}
              resizeMode="contain"
            />
          </View>

          {/* Brand Name & Tagline */}
          <Text
            style={{
              color: colors.textPrimary,
              fontSize: typography.fontSize.xxl,
              fontWeight: '900',
              letterSpacing: typography.letterSpacing.wide,
              textAlign: 'center',
            }}
          >
            {APP_NAME.toUpperCase()}
          </Text>

          <Text
            style={{
              color: colors.primary,
              fontSize: typography.fontSize.xs,
              fontWeight: '800',
              letterSpacing: typography.letterSpacing.tactical,
              marginTop: spacing.xs,
              textAlign: 'center',
            }}
          >
            {APP_TAGLINE.toUpperCase()}
          </Text>

          <Text
            style={{
              color: colors.textMuted,
              fontSize: typography.fontSize.xxs,
              marginTop: spacing.sm,
              textAlign: 'center',
              letterSpacing: 1,
            }}
          >
            VIRTUAL FREQUENCY NETWORK
          </Text>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

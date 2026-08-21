import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/theme';
import { Button } from '../../src/components/common/Button';
import { storageService } from '../../src/services/storageService';
import { ONBOARDING_STORAGE_KEY } from '../splash';
import { hapticFeedback } from '../../src/utils/haptics';

interface OnboardingSlide {
  badge: string;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  highlight: string;
}

const SLIDES: OnboardingSlide[] = [
  {
    badge: 'STEP 01 // VIRTUAL FREQUENCY',
    title: 'Your Voice. Your Frequency.',
    subtitle: 'Simulated radio channels over IP',
    description:
      'Communicate in real time with anyone on the planet using dedicated virtual frequencies (e.g. 145.800). No analog RF hardware or antennas required.',
    icon: '📻',
    highlight: 'Pure Internet Voice Channels',
  },
  {
    badge: 'STEP 02 // PUSH-TO-TALK',
    title: 'Push. Talk. Release.',
    subtitle: 'Single-speaker floor arbitration',
    description:
      'Experience zero-interference, half-duplex communication. Press and hold to transmit your voice instantly to up to 40 operators on your channel.',
    icon: '🎙️',
    highlight: '1 Active Speaker at a Time',
  },
  {
    badge: 'STEP 03 // COMMUNITY & TEAMS',
    title: 'Stay Connected.',
    subtitle: 'Low-latency global connectivity',
    description:
      'Join tactical groups, coordinate team operations, or tune in to open calling channels. Fast, minimal, and always accessible.',
    icon: '🌐',
    highlight: 'Up to 40 Users per Frequency',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { colors, typography, spacing, radii } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleNext = () => {
    hapticFeedback.light();
    if (currentIndex < SLIDES.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    hapticFeedback.light();
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleComplete = async () => {
    hapticFeedback.success();
    await storageService.setItem(ONBOARDING_STORAGE_KEY, 'true');
    router.replace('/(tabs)');
  };

  const currentSlide = SLIDES[currentIndex];
  const isLast = currentIndex === SLIDES.length - 1;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flex: 1, padding: spacing.lg, justifyContent: 'space-between' }}>
        {/* Top Header & Skip Action */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ color: colors.primary, fontSize: typography.fontSize.xs, fontWeight: '900', letterSpacing: 2 }}>
              AADAN PRADAN
            </Text>
          </View>

          {!isLast ? (
            <TouchableOpacity
              onPress={handleComplete}
              style={{
                paddingVertical: 6,
                paddingHorizontal: spacing.sm,
                backgroundColor: colors.surfaceElevated,
                borderRadius: radii.full,
              }}
            >
              <Text style={{ color: colors.textSecondary, fontSize: typography.fontSize.xs, fontWeight: '700' }}>
                SKIP
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Center Content Card */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderColor: colors.borderStrong,
            borderWidth: 1.5,
            borderRadius: radii.xl,
            padding: spacing.xl,
            alignItems: 'center',
            gap: spacing.md,
          }}
        >
          {/* Icon Badge */}
          <View
            style={{
              width: 84,
              height: 84,
              borderRadius: 42,
              backgroundColor: colors.surfaceElevated,
              borderColor: colors.border,
              borderWidth: 2,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: spacing.xs,
            }}
          >
            <Text style={{ fontSize: 40 }}>{currentSlide.icon}</Text>
          </View>

          {/* Step Tag */}
          <Text
            style={{
              color: colors.primary,
              fontSize: typography.fontSize.xxs,
              fontWeight: '800',
              letterSpacing: typography.letterSpacing.tactical,
            }}
          >
            {currentSlide.badge}
          </Text>

          {/* Title */}
          <Text
            style={{
              color: colors.textPrimary,
              fontSize: typography.fontSize.xl,
              fontWeight: '900',
              textAlign: 'center',
              letterSpacing: typography.letterSpacing.wide,
            }}
          >
            {currentSlide.title}
          </Text>

          {/* Subtitle */}
          <Text
            style={{
              color: colors.amber,
              fontSize: typography.fontSize.xs,
              fontWeight: '700',
              letterSpacing: 1,
              textAlign: 'center',
            }}
          >
            {currentSlide.subtitle}
          </Text>

          {/* Description */}
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: typography.fontSize.sm,
              textAlign: 'center',
              lineHeight: typography.lineHeight.base,
            }}
          >
            {currentSlide.description}
          </Text>

          {/* Feature Pill */}
          <View
            style={{
              backgroundColor: colors.primaryMuted,
              borderColor: colors.primary,
              borderWidth: 1,
              paddingVertical: 4,
              paddingHorizontal: spacing.md,
              borderRadius: radii.full,
              marginTop: spacing.xs,
            }}
          >
            <Text
              style={{
                color: colors.primary,
                fontSize: typography.fontSize.xs,
                fontWeight: '800',
              }}
            >
              ✓ {currentSlide.highlight}
            </Text>
          </View>
        </View>

        {/* Bottom Navigation & Indicators */}
        <View style={{ gap: spacing.md }}>
          {/* Dot Indicators */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.xs }}>
            {SLIDES.map((_, i) => (
              <View
                key={i}
                style={{
                  width: i === currentIndex ? 24 : 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: i === currentIndex ? colors.primary : colors.borderStrong,
                }}
              />
            ))}
          </View>

          {/* Action Buttons */}
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {currentIndex > 0 && (
              <Button
                label="BACK"
                variant="secondary"
                size="lg"
                onPress={handlePrev}
                style={{ flex: 1 }}
              />
            )}
            <Button
              label={isLast ? 'GET STARTED' : 'CONTINUE'}
              variant="primary"
              size="lg"
              onPress={handleNext}
              style={{ flex: currentIndex > 0 ? 2 : 1 }}
            />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

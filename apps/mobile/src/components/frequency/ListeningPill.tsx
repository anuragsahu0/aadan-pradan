import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

export interface ListeningPillProps {
  isSpeaking?: boolean;
  speakerName?: string;
  isListening?: boolean;
}

export const ListeningPill: React.FC<ListeningPillProps> = ({
  isSpeaking = false,
  speakerName,
  isListening = true,
}) => {
  // Animated waveform bars
  const anim1 = useRef(new Animated.Value(6)).current;
  const anim2 = useRef(new Animated.Value(14)).current;
  const anim3 = useRef(new Animated.Value(8)).current;
  const anim4 = useRef(new Animated.Value(16)).current;
  const anim5 = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    const createBarLoop = (val: Animated.Value, min: number, max: number, duration: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(val, { toValue: max, duration, useNativeDriver: false }),
          Animated.timing(val, { toValue: min, duration, useNativeDriver: false }),
        ])
      );
    };

    const l1 = createBarLoop(anim1, 4, 14, 250);
    const l2 = createBarLoop(anim2, 6, 18, 320);
    const l3 = createBarLoop(anim3, 4, 16, 280);
    const l4 = createBarLoop(anim4, 8, 20, 350);
    const l5 = createBarLoop(anim5, 4, 12, 220);

    l1.start();
    l2.start();
    l3.start();
    l4.start();
    l5.start();

    return () => {
      l1.stop();
      l2.stop();
      l3.stop();
      l4.stop();
      l5.stop();
    };
  }, []);

  const color = isSpeaking ? '#22C55E' : '#22C55E';
  const label = isSpeaking
    ? speakerName
      ? `${speakerName} is speaking...`
      : 'Speaking...'
    : 'Listening...';

  return (
    <View style={styles.pillContainer}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={styles.label}>{label}</Text>

      {/* Real-time audio waveform graphic */}
      <View style={styles.waveformContainer}>
        <Animated.View style={[styles.waveBar, { height: anim1, backgroundColor: color }]} />
        <Animated.View style={[styles.waveBar, { height: anim2, backgroundColor: color }]} />
        <Animated.View style={[styles.waveBar, { height: anim3, backgroundColor: color }]} />
        <Animated.View style={[styles.waveBar, { height: anim4, backgroundColor: color }]} />
        <Animated.View style={[styles.waveBar, { height: anim5, backgroundColor: color }]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  pillContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#151A24',
    borderWidth: 1,
    borderColor: '#242C3C',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#E2E8F0',
    letterSpacing: 0.3,
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 20,
    marginLeft: 4,
  },
  waveBar: {
    width: 2.5,
    borderRadius: 1.5,
  },
});

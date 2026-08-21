import React from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../../theme';
import { Card } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';

interface Props {
  visible: boolean;
  onGrant: () => void;
  onDismiss: () => void;
}

export function MicrophonePermissionModal({ visible, onGrant, onDismiss }: Props) {
  const { colors, typography, spacing, radii } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.backdrop}>
        <Card variant="tactical" style={[styles.card, { backgroundColor: colors.surfaceElevated, borderColor: colors.primary }]}>
          <Text style={[styles.icon, { color: colors.primary }]}>🎙️</Text>
          <Text style={[styles.title, { color: colors.textPrimary, fontSize: typography.fontSize.md }]}>
            MICROPHONE AUTHORIZATION
          </Text>
          <Text style={[styles.description, { color: colors.textSecondary, fontSize: typography.fontSize.xs }]}>
            Aadan Pradan requires temporary microphone access exclusively while holding the Push-to-Talk button to transmit live voice to operators on this virtual frequency.
          </Text>

          <View style={styles.noticeBox}>
            <Text style={[styles.noticeText, { color: colors.primaryMuted, fontSize: typography.fontSize.xxs }]}>
              🔒 Background Safety Guarantee: Microphone audio capture is strictly halted whenever the app is closed, minimized, or placed in the background. No audio is recorded or persisted.
            </Text>
          </View>

          <View style={styles.buttonRow}>
            <Button
              label="CANCEL"
              variant="secondary"
              size="sm"
              onPress={onDismiss}
              style={{ flex: 1 }}
            />
            <Button
              label="ALLOW ACCESS"
              variant="tactical"
              size="sm"
              onPress={onGrant}
              style={{ flex: 1 }}
            />
          </View>
        </Card>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    gap: 12,
  },
  icon: {
    fontSize: 42,
  },
  title: {
    fontWeight: '900',
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  description: {
    textAlign: 'center',
    lineHeight: 18,
  },
  noticeBox: {
    backgroundColor: 'rgba(0, 229, 255, 0.05)',
    padding: 10,
    borderRadius: 6,
    borderLeftWidth: 2,
    borderLeftColor: '#00E5FF',
    width: '100%',
  },
  noticeText: {
    lineHeight: 14,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
    width: '100%',
  },
});

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { appLifecycleManager } from '../src/services/lifecycle/appLifecycleManager';
import { usePttStore } from '../src/features/voice/store/pttStore';
import { notificationService } from '../src/services/notifications/notificationService';
import { errorReporter } from '../src/services/error/errorReporter';

describe('Phase 8 Mobile Lifecycle, Recovery & Notifications', () => {
  beforeEach(() => {
    usePttStore.getState().resetPtt();
  });

  describe('App Lifecycle & Background Safety', () => {
    it('should immediately release PTT floor transmission when app enters background', () => {
      // Simulate user talking
      usePttStore.setState({
        buttonState: 'talking',
        isTalking: true,
        activeSpeaker: { id: 'usr_me', username: 'me', displayName: 'Me' },
      });

      expect(usePttStore.getState().isTalking).toBe(true);

      // Simulate AppState transition to background
      (appLifecycleManager as any).handleAppStateChange('background');

      expect(usePttStore.getState().isTalking).toBe(false);
      expect(usePttStore.getState().buttonState).not.toBe('talking');
    });

    it('should never auto-resume PTT on foreground return', () => {
      (appLifecycleManager as any).handleAppStateChange('background');
      (appLifecycleManager as any).handleAppStateChange('active');

      expect(usePttStore.getState().isTalking).toBe(false);
      expect(usePttStore.getState().buttonState).toBe('idle');
    });
  });

  describe('Deep Linking & Notification Navigation', () => {
    it('should parse valid aadanpradan:// frequency deep links', () => {
      const link = notificationService.parseDeepLink('aadanpradan://frequency/145.800');
      expect(link).not.toBeNull();
      expect(link?.type).toBe('frequency');
      expect(link?.frequencyCode).toBe('145.800');
    });

    it('should parse valid https:// web frequency deep links', () => {
      const link = notificationService.parseDeepLink('https://aadanpradan.io/frequency/146.200');
      expect(link).not.toBeNull();
      expect(link?.type).toBe('frequency');
      expect(link?.frequencyCode).toBe('146.200');
    });

    it('should safely reject malformed deep links', () => {
      expect(notificationService.parseDeepLink('aadanpradan://invalid/xyz')).toBeNull();
      expect(notificationService.parseDeepLink('')).toBeNull();
    });
  });

  describe('Sanitized Error Reporting', () => {
    it('should redact sensitive tokens and passwords from report context', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      errorReporter.reportError(new Error('Network error test'), {
        screen: 'Frequency',
        token: 'secret_jwt_token_12345',
        authorization: 'Bearer secret_auth_token',
        userId: 'usr_safe_id',
      });

      expect(consoleSpy).toHaveBeenCalled();
      const loggedContext = consoleSpy.mock.calls[0][2]?.context;
      expect(loggedContext.token).toBe('[REDACTED]');
      expect(loggedContext.authorization).toBe('[REDACTED]');
      expect(loggedContext.userId).toBe('usr_safe_id');

      consoleSpy.mockRestore();
    });
  });
});

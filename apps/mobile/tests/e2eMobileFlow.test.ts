import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAuthStore } from '../src/store/authStore';
import { useFrequencyStore } from '../src/store/frequencyStore';
import { usePttStore } from '../src/features/voice/store/pttStore';
import { appLifecycleManager } from '../src/services/lifecycle/appLifecycleManager';
import { errorReporter } from '../src/services/error/errorReporter';

describe('Phase 10 Mobile End-to-End Workflow & State Machine QA', () => {
  beforeEach(() => {
    useAuthStore.getState().logout();
    useFrequencyStore.setState({
      currentFrequencyCode: '145.800',
      channelName: 'Tactical Main',
      connectionStatus: 'DISCONNECTED',
      activeUsers: [],
    });
    usePttStore.getState().resetPtt();
  });

  it('Complete Mobile Flow: Auth Session -> Frequency Sync -> PTT State Machine -> Background Safety', async () => {
    // 1. Authenticate user
    await useAuthStore.getState().setAuth(
      {
        id: 'usr_operator_alpha',
        username: 'alpha',
        displayName: 'Operator Alpha',
        email: 'alpha@aadanpradan.io',
        role: 'USER',
        status: 'ACTIVE',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastSeenAt: null,
      },
      'valid.mock.token',
      'valid.mock.refresh'
    );

    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().user?.displayName).toBe('Operator Alpha');

    // 2. Frequency State Synchronization
    useFrequencyStore.setState({
      connectionStatus: 'CONNECTED',
      activeUsers: [
        {
          id: 'usr_operator_alpha',
          username: 'alpha',
          displayName: 'Operator Alpha',
          status: 'online',
          avatar: null,
        },
        {
          id: 'usr_operator_bravo',
          username: 'bravo',
          displayName: 'Operator Bravo',
          status: 'online',
          avatar: null,
        },
      ],
    });

    expect(useFrequencyStore.getState().connectionStatus).toBe('CONNECTED');
    expect(useFrequencyStore.getState().activeUsers.length).toBe(2);

    // 3. PTT Floor State Machine: Current user acquires floor
    usePttStore.getState().setPttState({
      frequencyCode: '145.800',
      state: 'ACTIVE',
      speaker: { id: 'usr_operator_alpha', username: 'alpha', displayName: 'Operator Alpha' },
      expiresAt: Date.now() + 30000,
    });

    expect(usePttStore.getState().buttonState).toBe('talking');
    expect(usePttStore.getState().isTalking).toBe(true);
    expect(usePttStore.getState().isBusy).toBe(false);

    // 4. Background Safety Transition: User minimizes app while talking
    (appLifecycleManager as any).handleAppStateChange('background');

    // Transmission must be immediately terminated
    expect(usePttStore.getState().isTalking).toBe(false);
    expect(usePttStore.getState().buttonState).not.toBe('talking');

    // 5. Another user acquires floor -> UI enters BUSY state
    usePttStore.getState().setPttState({
      frequencyCode: '145.800',
      state: 'ACTIVE',
      speaker: { id: 'usr_operator_bravo', username: 'bravo', displayName: 'Operator Bravo' },
      expiresAt: Date.now() + 30000,
    });

    expect(usePttStore.getState().buttonState).toBe('busy');
    expect(usePttStore.getState().isBusy).toBe(true);
    expect(usePttStore.getState().activeSpeaker?.displayName).toBe('Operator Bravo');

    // 6. Floor released by remote operator -> UI enters IDLE (CHANNEL CLEAR)
    usePttStore.getState().setPttState({
      frequencyCode: '145.800',
      state: 'FREE',
      speaker: null,
    });

    expect(usePttStore.getState().buttonState).toBe('idle');
    expect(usePttStore.getState().isBusy).toBe(false);
    expect(usePttStore.getState().activeSpeaker).toBeNull();
  });

  it('Sanitized error reporting during network anomalies', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    errorReporter.reportError(new Error('Signaling gateway disconnect'), {
      frequencyCode: '145.800',
      token: 'jwt_secret_token_123',
      password: 'mypassword',
    });

    expect(spy).toHaveBeenCalled();
    const context = spy.mock.calls[0][2]?.context;
    expect(context.token).toBe('[REDACTED]');
    expect(context.password).toBe('[REDACTED]');
    expect(context.frequencyCode).toBe('145.800');

    spy.mockRestore();
  });
});

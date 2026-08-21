import { describe, it, expect, beforeEach } from 'vitest';
import { usePttStore } from '../src/features/voice/store/pttStore';
import { useAuthStore } from '../src/store/authStore';

describe('Phase 7 Mobile Push-to-Talk Store', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: {
        id: 'usr_anurag',
        username: 'anurag',
        displayName: 'Anurag',
        email: 'anurag@aadanpradan.io',
        avatar: null,
        role: 'USER',
        status: 'ACTIVE',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });

    usePttStore.getState().resetPtt();
  });

  it('should initialize with default idle floor states', () => {
    const state = usePttStore.getState();
    expect(state.buttonState).toBe('idle');
    expect(state.isTalking).toBe(false);
    expect(state.isBusy).toBe(false);
    expect(state.activeSpeaker).toBeNull();
  });

  it('should update to talking state when current user is active speaker', () => {
    usePttStore.getState().setPttState({
      frequencyCode: '145.800',
      state: 'ACTIVE',
      speaker: { id: 'usr_anurag', username: 'anurag', displayName: 'Anurag' },
      expiresAt: Date.now() + 30000,
    });

    const state = usePttStore.getState();
    expect(state.buttonState).toBe('talking');
    expect(state.isTalking).toBe(true);
    expect(state.isBusy).toBe(false);
    expect(state.activeSpeaker?.id).toBe('usr_anurag');
  });

  it('should update to busy state when another user is active speaker', () => {
    usePttStore.getState().setPttState({
      frequencyCode: '145.800',
      state: 'ACTIVE',
      speaker: { id: 'usr_rahul', username: 'rahul', displayName: 'Rahul' },
      expiresAt: Date.now() + 30000,
    });

    const state = usePttStore.getState();
    expect(state.buttonState).toBe('busy');
    expect(state.isTalking).toBe(false);
    expect(state.isBusy).toBe(true);
    expect(state.activeSpeaker?.id).toBe('usr_rahul');
  });

  it('should reset to idle state when floor is released (FREE)', () => {
    usePttStore.getState().setPttState({
      frequencyCode: '145.800',
      state: 'ACTIVE',
      speaker: { id: 'usr_rahul', username: 'rahul', displayName: 'Rahul' },
      expiresAt: Date.now() + 30000,
    });

    usePttStore.getState().setPttState({
      frequencyCode: '145.800',
      state: 'FREE',
      speaker: null,
    });

    const state = usePttStore.getState();
    expect(state.buttonState).toBe('idle');
    expect(state.isTalking).toBe(false);
    expect(state.isBusy).toBe(false);
    expect(state.activeSpeaker).toBeNull();
  });
});

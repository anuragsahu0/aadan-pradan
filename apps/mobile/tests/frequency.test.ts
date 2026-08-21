import { describe, it, expect, beforeEach } from 'vitest';
import { useFrequencyStore } from '../src/store/frequencyStore';
import { DEFAULT_FREQUENCY, MAX_USERS_PER_FREQUENCY } from '@aadan-pradan/config';
import type { UserSummary } from '@aadan-pradan/types';

describe('Phase 4 Mobile Frequency Store & Capacity Management', () => {
  beforeEach(() => {
    useFrequencyStore.setState({
      currentFrequencyCode: DEFAULT_FREQUENCY,
      channelName: 'PRIMARY CALLING CHANNEL',
      userCount: 0,
      maxUsers: MAX_USERS_PER_FREQUENCY,
      connectionStatus: 'IDLE',
      activeUsers: [],
      activeSpeaker: null,
      activeSpeakerId: null,
      isTransmitting: false,
      recentFrequencies: ['145.800', '146.200', '433.500'],
      errorMessage: null,
    });
  });

  it('should initialize with default frequency and 40-user maximum capacity', () => {
    const state = useFrequencyStore.getState();
    expect(state.currentFrequencyCode).toBe('145.800');
    expect(state.maxUsers).toBe(40);
    expect(state.connectionStatus).toBe('IDLE');
  });

  it('should normalize and update frequency code', () => {
    useFrequencyStore.getState().setFrequency('433.5');
    expect(useFrequencyStore.getState().currentFrequencyCode).toBe('433.500');
    expect(useFrequencyStore.getState().recentFrequencies).toContain('433.500');
  });

  it('should update active user roster and compute count', () => {
    const mockUsers: UserSummary[] = [
      { id: 'usr_1', username: 'alpha', displayName: 'Alpha Operator', status: 'online' },
      { id: 'usr_2', username: 'bravo', displayName: 'Bravo Operator', status: 'idle' },
    ];

    useFrequencyStore.getState().setActiveUsers(mockUsers);

    const state = useFrequencyStore.getState();
    expect(state.activeUsers.length).toBe(2);
    expect(state.userCount).toBe(2);
  });

  it('should reject invalid frequency codes with ERROR status', async () => {
    const success = await useFrequencyStore.getState().connectToFrequency('not-a-freq');
    expect(success).toBe(false);
    expect(useFrequencyStore.getState().connectionStatus).toBe('ERROR');
    expect(useFrequencyStore.getState().errorMessage).toContain('Invalid virtual frequency format');
  });

  it('should handle disconnect cleanup', async () => {
    useFrequencyStore.setState({
      connectionStatus: 'CONNECTED',
      activeUsers: [{ id: 'usr_1', username: 'a', displayName: 'A', status: 'online' }],
      userCount: 1,
    });

    await useFrequencyStore.getState().disconnectFromFrequency();

    const state = useFrequencyStore.getState();
    expect(state.connectionStatus).toBe('DISCONNECTED');
    expect(state.activeUsers.length).toBe(0);
    expect(state.userCount).toBe(0);
  });
});

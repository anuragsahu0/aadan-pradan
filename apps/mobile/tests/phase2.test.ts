import { describe, it, expect } from 'vitest';
import { darkColors, lightColors } from '../src/theme/tokens';
import { MOCK_40_USERS } from '../src/features/frequency/mocks/mockUsers';
import { MOCK_FREQUENCIES } from '../src/features/frequency/mocks/mockFrequencies';
import { MOCK_ACTIVITIES } from '../src/features/activity/mocks/mockActivity';
import { isValidFrequencyCode, normalizeFrequencyCode } from '@aadan-pradan/utils';

describe('Phase 2 Theme & Token Validation', () => {
  it('should have complete contrast palettes for dark and light modes', () => {
    expect(darkColors.background).toBe('#080C14');
    expect(lightColors.background).toBe('#F8FAFC');
    expect(darkColors.primary).toBeDefined();
    expect(lightColors.primary).toBeDefined();
    expect(darkColors.lcdText).toBe('#00FFCC');
    expect(lightColors.lcdText).toBe('#00FFCC');
  });
});

describe('Phase 2 40-User & Mock Data Specifications', () => {
  it('should contain exactly 40 realistic mock operators for capacity testing', () => {
    expect(MOCK_40_USERS.length).toBe(40);
    expect(MOCK_40_USERS[0].displayName).toBe('Anurag Sahu');
    expect(MOCK_40_USERS[39].displayName).toBeDefined();
  });

  it('should validate mock frequencies', () => {
    expect(MOCK_FREQUENCIES.length).toBeGreaterThanOrEqual(5);
    for (const freq of MOCK_FREQUENCIES) {
      expect(isValidFrequencyCode(freq.code)).toBe(true);
      expect(freq.maxUsers).toBe(40);
    }
  });

  it('should contain valid mock activity log', () => {
    expect(MOCK_ACTIVITIES.length).toBeGreaterThan(0);
    for (const act of MOCK_ACTIVITIES) {
      expect(isValidFrequencyCode(act.frequencyCode)).toBe(true);
      expect(act.action).toMatch(/joined|left|transmitted/);
    }
  });
});

describe('Phase 2 Virtual Frequency Normalization in UI', () => {
  it('should normalize partial frequency inputs', () => {
    expect(normalizeFrequencyCode('145.8')).toBe('145.800');
    expect(normalizeFrequencyCode('433.5')).toBe('433.500');
  });
});

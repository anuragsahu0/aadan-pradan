import { describe, it, expect } from 'vitest';
import {
  isValidFrequencyCode,
  normalizeFrequencyCode,
  validateFrequencyCode,
} from '@aadan-pradan/utils';

describe('Virtual Frequency Validator', () => {
  it('should validate valid frequency codes', () => {
    expect(isValidFrequencyCode('145.800')).toBe(true);
    expect(isValidFrequencyCode('433.500')).toBe(true);
    expect(isValidFrequencyCode('144.200')).toBe(true);
  });

  it('should reject invalid frequency codes', () => {
    expect(isValidFrequencyCode('')).toBe(false);
    expect(isValidFrequencyCode('abc')).toBe(false);
    expect(isValidFrequencyCode('145')).toBe(false);
    expect(isValidFrequencyCode('145.8')).toBe(false);
    expect(isValidFrequencyCode('99.000')).toBe(false);
    expect(isValidFrequencyCode('1000.000')).toBe(false);
  });

  it('should normalize input into 3-digit dot 3-digit format', () => {
    expect(normalizeFrequencyCode('145.8')).toBe('145.800');
    expect(normalizeFrequencyCode('145.800')).toBe('145.800');
  });

  it('should return informative errors on invalid input', () => {
    const emptyResult = validateFrequencyCode('');
    expect(emptyResult.isValid).toBe(false);
    expect(emptyResult.error).toBeDefined();

    const invalidResult = validateFrequencyCode('invalid-channel');
    expect(invalidResult.isValid).toBe(false);
  });
});

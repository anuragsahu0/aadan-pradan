import { DEFAULT_FREQUENCY } from '@aadan-pradan/config';

/**
 * Virtual Frequency Validation and Formatting Utilities
 *
 * NOTE: Virtual frequencies in Aadan Pradan are simulated channels
 * indexed in the format XXX.XXX (e.g. 145.800).
 * No physical RF hardware is used.
 */

// Matches standard 3-digit . 3-digit virtual frequency format (100.000 - 999.999)
export const VIRTUAL_FREQUENCY_REGEX = /^([1-9]\d{2})\.(\d{3})$/;

export interface FrequencyValidationResult {
  isValid: boolean;
  normalized: string;
  error?: string;
}

/**
 * Validates whether a given string is a syntactically valid virtual frequency.
 */
export function isValidFrequencyCode(code: string | null | undefined): boolean {
  if (!code || typeof code !== 'string') {
    return false;
  }
  const trimmed = code.trim();
  return VIRTUAL_FREQUENCY_REGEX.test(trimmed);
}

/**
 * Normalizes input string to canonical virtual frequency format (e.g. "145.8" -> "145.800")
 */
export function normalizeFrequencyCode(input: string | null | undefined): string {
  if (!input || typeof input !== 'string') {
    return DEFAULT_FREQUENCY;
  }

  const sanitized = input.trim().replace(/[^\d.]/g, '');

  if (VIRTUAL_FREQUENCY_REGEX.test(sanitized)) {
    return sanitized;
  }

  const parts = sanitized.split('.');
  if (parts.length === 1 && parts[0].length >= 3) {
    const whole = parts[0].substring(0, 3);
    const decimal = parts[0].substring(3).padEnd(3, '0').substring(0, 3);
    return `${whole}.${decimal}`;
  }

  if (parts.length >= 2) {
    const whole = parts[0].padStart(3, '0').substring(0, 3);
    const decimal = parts[1].padEnd(3, '0').substring(0, 3);
    const candidate = `${whole}.${decimal}`;
    if (VIRTUAL_FREQUENCY_REGEX.test(candidate)) {
      return candidate;
    }
  }

  return DEFAULT_FREQUENCY;
}

/**
 * Full validator returning detailed validation errors
 */
export function validateFrequencyCode(code: string | null | undefined): FrequencyValidationResult {
  if (!code || typeof code !== 'string' || code.trim().length === 0) {
    return {
      isValid: false,
      normalized: DEFAULT_FREQUENCY,
      error: 'Frequency code cannot be empty.',
    };
  }

  const trimmed = code.trim();

  if (!VIRTUAL_FREQUENCY_REGEX.test(trimmed)) {
    return {
      isValid: false,
      normalized: normalizeFrequencyCode(trimmed),
      error: 'Invalid frequency format. Must be formatted as XXX.XXX (e.g. 145.800).',
    };
  }

  const numericValue = parseFloat(trimmed);
  if (numericValue < 100.0 || numericValue > 999.999) {
    return {
      isValid: false,
      normalized: trimmed,
      error: 'Virtual frequency must be between 100.000 and 999.999.',
    };
  }

  return {
    isValid: true,
    normalized: trimmed,
  };
}

/**
 * Formats frequency code with MHz virtual unit suffix
 */
export function formatFrequencyDisplay(code: string): string {
  const norm = normalizeFrequencyCode(code);
  return `${norm} MHz`;
}

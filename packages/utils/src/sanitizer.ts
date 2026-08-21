/**
 * Input sanitization helpers
 */

/**
 * Sanitizes usernames/callsigns: strips dangerous HTML/script characters, trims whitespace.
 */
export function sanitizeUsername(username: string): string {
  if (!username) return '';
  return username
    .trim()
    .replace(/[<>'"&]/g, '')
    .substring(0, 32);
}

/**
 * Sanitizes frequency name descriptions.
 */
export function sanitizeFrequencyName(name?: string | null): string | null {
  if (!name) return null;
  const sanitized = name.trim().replace(/[<>'"&]/g, '').substring(0, 50);
  return sanitized.length > 0 ? sanitized : null;
}

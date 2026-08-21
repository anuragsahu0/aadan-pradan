/**
 * Logger Utilities & Redaction Helpers
 */

const SENSITIVE_KEYS = new Set([
  'password',
  'jwt_secret',
  'jwtsecret',
  'token',
  'authorization',
  'secret',
  'cookie',
  'session',
  'apikey',
  'api_key',
]);

/**
 * Recursively redacts sensitive keys in objects before logging
 */
export function redactSensitiveData<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => redactSensitiveData(item)) as unknown as T;
  }

  const redacted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      redacted[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      redacted[key] = redactSensitiveData(value);
    } else {
      redacted[key] = value;
    }
  }

  return redacted as T;
}

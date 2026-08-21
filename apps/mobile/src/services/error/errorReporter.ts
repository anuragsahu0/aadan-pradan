interface ErrorReportContext {
  userId?: string;
  screen?: string;
  action?: string;
  [key: string]: unknown;
}

class ErrorReporter {
  /**
   * Log and report sanitized errors
   */
  public reportError(error: Error | unknown, context?: ErrorReportContext): void {
    const sanitized = this.sanitizeContext(context);
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;

    const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV !== 'production';

    if (isDev) {
      console.error('[ErrorReporter]', message, { context: sanitized, stack });
    }
  }

  private sanitizeContext(context?: ErrorReportContext): ErrorReportContext | undefined {
    if (!context) return undefined;

    const copy = { ...context };
    const sensitiveKeys = ['token', 'password', 'refreshToken', 'secret', 'authorization'];

    for (const key of Object.keys(copy)) {
      if (sensitiveKeys.some((s) => key.toLowerCase().includes(s))) {
        copy[key] = '[REDACTED]';
      }
    }

    return copy;
  }
}

export const errorReporter = new ErrorReporter();

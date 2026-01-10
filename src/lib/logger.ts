/**
 * Secure logging utility that only logs in development mode.
 * In production, detailed logs are suppressed to prevent information leakage.
 */

const isDev = import.meta.env.DEV;

interface Logger {
  log: (message: string, data?: unknown) => void;
  error: (message: string, data?: unknown) => void;
  warn: (message: string, data?: unknown) => void;
  info: (message: string, data?: unknown) => void;
  debug: (message: string, data?: unknown) => void;
}

/**
 * Sanitize error objects to remove sensitive information before logging
 */
function sanitizeError(error: unknown): unknown {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      // Stack trace only in development
      ...(isDev && { stack: error.stack }),
    };
  }
  return error;
}

export const logger: Logger = {
  log: (message: string, data?: unknown) => {
    if (isDev) {
      console.log(`[LOG] ${message}`, data !== undefined ? data : '');
    }
  },

  error: (message: string, data?: unknown) => {
    if (isDev) {
      console.error(`[ERROR] ${message}`, data !== undefined ? sanitizeError(data) : '');
    }
    // In production, you could send to an error tracking service here
    // e.g., Sentry.captureException(data);
  },

  warn: (message: string, data?: unknown) => {
    if (isDev) {
      console.warn(`[WARN] ${message}`, data !== undefined ? data : '');
    }
  },

  info: (message: string, data?: unknown) => {
    if (isDev) {
      console.info(`[INFO] ${message}`, data !== undefined ? data : '');
    }
  },

  debug: (message: string, data?: unknown) => {
    if (isDev) {
      console.debug(`[DEBUG] ${message}`, data !== undefined ? data : '');
    }
  },
};

export default logger;

/**
 * Centralized logging system
 * Provides structured logging across the application
 */

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: string;
  data?: any;
  error?: {
    message: string;
    stack?: string;
  };
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private minLogLevel = this.isDevelopment ? LogLevel.DEBUG : LogLevel.INFO;

  /**
   * Format log entry as JSON for better parsing in production
   */
  private formatLog(entry: LogEntry): string {
    if (this.isDevelopment) {
      // Pretty print in development
      return JSON.stringify(entry, null, 2);
    }
    // Single line in production for log aggregation services
    return JSON.stringify(entry);
  }

  /**
   * Check if log level should be output
   */
  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    return levels.indexOf(level) >= levels.indexOf(this.minLogLevel);
  }

  debug(message: string, context?: string, data?: any) {
    if (!this.shouldLog(LogLevel.DEBUG)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel.DEBUG,
      message,
      context,
      data,
    };

    console.log(`[${entry.level}]`, this.formatLog(entry));
  }

  info(message: string, context?: string, data?: any) {
    if (!this.shouldLog(LogLevel.INFO)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel.INFO,
      message,
      context,
      data,
    };

    console.log(`[${entry.level}]`, this.formatLog(entry));
  }

  warn(message: string, context?: string, data?: any) {
    if (!this.shouldLog(LogLevel.WARN)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel.WARN,
      message,
      context,
      data,
    };

    console.warn(`[${entry.level}]`, this.formatLog(entry));
  }

  error(message: string, error?: Error | unknown, context?: string, data?: any) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel.ERROR,
      message,
      context,
      data,
      error:
        error instanceof Error
          ? {
              message: error.message,
              stack: error.stack,
            }
          : {
              message: String(error),
            },
    };

    console.error(`[${entry.level}]`, this.formatLog(entry));

    // Could integrate with error tracking service like Sentry here
    // Sentry.captureException(error);
  }
}

// Export singleton instance
export const logger = new Logger();

/**
 * Helper for API route logging
 */
export function logApiRequest(
  method: string,
  path: string,
  userId?: string,
  data?: any
) {
  logger.info(`API ${method} ${path}`, 'API_REQUEST', { userId, data });
}

export function logApiResponse(
  method: string,
  path: string,
  statusCode: number,
  duration?: number
) {
  logger.info(`API ${method} ${path} - ${statusCode}`, 'API_RESPONSE', { duration });
}

export function logApiError(
  method: string,
  path: string,
  error: unknown,
  userId?: string
) {
  logger.error(
    `API ${method} ${path} failed`,
    error instanceof Error ? error : new Error(String(error)),
    'API_ERROR',
    { userId }
  );
}

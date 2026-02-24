/**
 * Centralized logging system with Winston
 * Provides structured logging with file rotation and error tracking
 * 
 * Features:
 * - JSON structured logs for production analysis
 * - Daily rotating log files
 * - Separate error log file
 * - Pretty printing in development
 * - Environment-based log levels
 */

import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
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

/**
 * Initialize Winston logger with appropriate transports for environment
 */
function createLogger(): winston.Logger {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const logsDir = process.env.LOG_DIR || path.join(process.cwd(), 'logs');

  const baseFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  );

  const consoleFormat = isDevelopment
    ? winston.format.combine(
        baseFormat,
        winston.format.colorize(),
        winston.format.printf(({ level, message, timestamp, context, data, error }) => {
          let output = `${timestamp} [${level}] ${message}`;
          if (context) output += ` (${context})`;
          if (data) output += ` - ${JSON.stringify(data, null, 2)}`;
          if (error) {
            const errorObj = error as any;
            output += `\n${errorObj.stack || errorObj.message || String(error)}`;
          }
          return output;
        })
      )
    : baseFormat;

  const transports: winston.transport[] = [
    // Console output
    new winston.transports.Console({
      format: consoleFormat,
      level: isDevelopment ? 'debug' : 'info',
    }),
  ];

  // File transports only in production
  if (!isDevelopment) {
    // Combined logs (all levels)
    transports.push(
      new DailyRotateFile({
        filename: path.join(logsDir, 'app-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        format: baseFormat,
        level: 'info',
      })
    );

    // Error logs (errors only)
    transports.push(
      new DailyRotateFile({
        filename: path.join(logsDir, 'error-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        format: baseFormat,
        level: 'error',
      })
    );
  }

  return winston.createLogger({
    level: isDevelopment ? 'debug' : 'info',
    format: baseFormat,
    defaultMeta: { service: 'loanpro-api' },
    transports,
    exceptionHandlers: transports,
    rejectionHandlers: transports,
  });
}

const winstonLogger = createLogger();

/**
 * Custom Logger class wrapping Winston
 */
class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';

  debug(message: string, context?: string, data?: any) {
    const meta = this.buildMeta(context, data);
    winstonLogger.debug(message, meta);
  }

  info(message: string, context?: string, data?: any) {
    const meta = this.buildMeta(context, data);
    winstonLogger.info(message, meta);
  }

  warn(message: string, context?: string, data?: any) {
    const meta = this.buildMeta(context, data);
    winstonLogger.warn(message, meta);
  }

  error(message: string, error?: Error | unknown, context?: string, data?: any) {
    const meta = this.buildMeta(context, data);
    
    if (error instanceof Error) {
      winstonLogger.error(message, {
        ...meta,
        error: {
          message: error.message,
          stack: error.stack,
        },
      });
    } else if (error) {
      winstonLogger.error(message, {
        ...meta,
        error: {
          message: String(error),
        },
      });
    } else {
      winstonLogger.error(message, meta);
    }
  }

  private buildMeta(context?: string, data?: any): any {
    const meta: any = {};
    if (context) meta.context = context;
    if (data) meta.data = data;
    return Object.keys(meta).length > 0 ? meta : undefined;
  }
}


// Export singleton instance
export const logger = new Logger();

/**
 * Helper for API request logging
 * Call at the start of API route
 */
export function logApiRequest(
  method: string,
  path: string,
  userId?: string,
  data?: any
) {
  logger.info(`API ${method} ${path}`, 'API_REQUEST', { 
    userId, 
    dataSize: data ? JSON.stringify(data).length : 0 
  });
}

/**
 * Helper for API response logging
 * Call at the end of successful API route
 */
export function logApiResponse(
  method: string,
  path: string,
  statusCode: number,
  duration?: number
) {
  const level = statusCode >= 400 ? 'warn' : 'info';
  const message = `API ${method} ${path} - ${statusCode}`;
  
  if (level === 'warn') {
    logger.warn(message, 'API_RESPONSE', { duration, statusCode });
  } else {
    logger.info(message, 'API_RESPONSE', { duration, statusCode });
  }
}

/**
 * Helper for API error logging
 * Call when API encounters an error
 */
export function logApiError(
  method: string,
  path: string,
  error: unknown,
  userId?: string
) {
  const errorObj = error instanceof Error ? error : new Error(String(error));
  logger.error(
    `API ${method} ${path} failed`,
    errorObj,
    'API_ERROR',
    { userId }
  );
}

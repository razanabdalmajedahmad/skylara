/**
 * Structured logger for the SkyLara API.
 *
 * In development: structured JSON logs to stdout.
 * In production: integrates with Sentry and/or structured log aggregator.
 *
 * Usage:
 *   import { logger } from '../utils/logger';
 *   logger.error('Payment failed', { service: 'stripe', userId: 123 });
 *   logger.warn('SendGrid unavailable', { service: 'email' });
 *   logger.info('Gift card issued', { giftCardId: 42, amount: 500 });
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  service?: string;
  route?: string;
  userId?: string | number;
  dropzoneId?: string | number;
  [key: string]: unknown;
}

const isDev = process.env.NODE_ENV !== 'production';

function emit(level: LogLevel, message: string, context?: LogContext): void {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...context,
  };

  switch (level) {
    case 'error':
      console.error(JSON.stringify(entry));
      break;
    case 'warn':
      console.warn(JSON.stringify(entry));
      break;
    case 'info':
      console.info(JSON.stringify(entry));
      break;
    case 'debug':
      if (isDev) console.debug(JSON.stringify(entry));
      break;
  }

  // Production: report errors/warnings to Sentry
  // if (!isDev && (level === 'error' || level === 'warn')) {
  //   import('@sentry/node').then(Sentry => {
  //     Sentry.captureMessage(message, { level: level === 'error' ? 'error' : 'warning', extra: context });
  //   });
  // }
}

export const logger = {
  debug(message: string, context?: LogContext): void {
    emit('debug', message, context);
  },
  info(message: string, context?: LogContext): void {
    emit('info', message, context);
  },
  warn(message: string, context?: LogContext): void {
    emit('warn', message, context);
  },
  error(message: string, context?: LogContext): void {
    emit('error', message, context);
  },
};

/**
 * Structured logger for the SkyLara web app.
 *
 * In development: logs to console with structured context.
 * In production: integrates with Sentry/error-reporting.
 *
 * Usage:
 *   import { logger } from '@/lib/logger';
 *   logger.error('Failed to fetch loads', { page: 'manifest', endpoint: '/loads' });
 *   logger.warn('API unavailable, using fallback data', { page: 'dashboard' });
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  page?: string;
  endpoint?: string;
  userId?: string | number;
  [key: string]: unknown;
}

const isDev = process.env.NODE_ENV !== 'production';

function formatMessage(level: LogLevel, message: string, context?: LogContext): string {
  const timestamp = new Date().toISOString();
  const ctx = context ? ` ${JSON.stringify(context)}` : '';
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${ctx}`;
}

function reportToSentry(level: LogLevel, message: string, context?: LogContext): void {
  // Sentry integration placeholder — wire up when SENTRY_DSN is configured
  // import * as Sentry from '@sentry/nextjs';
  // if (level === 'error') Sentry.captureMessage(message, { level: 'error', extra: context });
  // if (level === 'warn') Sentry.captureMessage(message, { level: 'warning', extra: context });
}

export const logger = {
  debug(message: string, context?: LogContext): void {
    if (isDev) {
      console.debug(formatMessage('debug', message, context));
    }
  },

  info(message: string, context?: LogContext): void {
    if (isDev) {
      console.info(formatMessage('info', message, context));
    }
  },

  warn(message: string, context?: LogContext): void {
    if (isDev) {
      console.warn(formatMessage('warn', message, context));
    }
    if (!isDev) {
      reportToSentry('warn', message, context);
    }
  },

  error(message: string, context?: LogContext): void {
    if (isDev) {
      console.error(formatMessage('error', message, context));
    }
    if (!isDev) {
      reportToSentry('error', message, context);
    }
  },
};

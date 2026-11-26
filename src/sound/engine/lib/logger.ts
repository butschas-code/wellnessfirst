/**
 * Wellness Waves — Diagnostics Logger with Privacy Redaction
 * Ensures zero sensitive wellness data or credentials ever leak to console/telemetry.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  timestamp: string;
}

const REDACTED_KEYS = [
  'password',
  'token',
  'key',
  'secret',
  'auth',
  'email',
  'health',
  'medical',
  'diagnosis',
  'credit_card',
];

export const Logger = {
  sanitize(obj: unknown): unknown {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map((item) => Logger.sanitize(item));

    const clean: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
      const lower = key.toLowerCase();
      if (REDACTED_KEYS.some((bad) => lower.includes(bad))) {
        clean[key] = '[REDACTED]';
      } else if (typeof val === 'object' && val !== null) {
        clean[key] = Logger.sanitize(val);
      } else {
        clean[key] = val;
      }
    }
    return clean;
  },

  log(level: LogLevel, message: string, context?: Record<string, unknown>): LogEntry {
    const entry: LogEntry = {
      level,
      message,
      context: context ? (Logger.sanitize(context) as Record<string, unknown>) : undefined,
      timestamp: new Date().toISOString(),
    };

    if (process.env.NODE_ENV !== 'production' || level === 'error') {
      const style = level === 'error' ? 'color: #ff6b6b' : level === 'warn' ? 'color: #feca57' : 'color: #48dbfb';
      console.log(`%c[WW:${level.toUpperCase()}] ${message}`, style, entry.context || '');
    }

    return entry;
  },

  info(msg: string, ctx?: Record<string, unknown>) {
    return this.log('info', msg, ctx);
  },
  warn(msg: string, ctx?: Record<string, unknown>) {
    return this.log('warn', msg, ctx);
  },
  error(msg: string, ctx?: Record<string, unknown>) {
    return this.log('error', msg, ctx);
  },
  debug(msg: string, ctx?: Record<string, unknown>) {
    return this.log('debug', msg, ctx);
  },
};

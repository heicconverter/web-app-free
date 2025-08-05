import { LogLevel, LogEntry, LoggerConfig } from './types';

class LoggerService {
  private config: LoggerConfig;
  private logs: LogEntry[] = [];

  constructor(config: LoggerConfig = { level: 'info' }) {
    this.config = config;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3,
    };
    return levels[level] <= levels[this.config.level];
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    meta?: Record<string, unknown>
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      meta,
    };
  }

  private writeLog(entry: LogEntry): void {
    this.logs.push(entry);

    if (typeof window !== 'undefined') {
      const consoleMethod =
        entry.level === 'error'
          ? console.error
          : entry.level === 'warn'
            ? console.warn
            : entry.level === 'debug'
              ? console.debug
              : console.log;

      consoleMethod(
        `[${entry.timestamp}] ${entry.level.toUpperCase()}: ${entry.message}`,
        entry.meta || ''
      );
    }
  }

  error(message: string, meta?: Record<string, unknown>): void {
    if (this.shouldLog('error')) {
      this.writeLog(this.createLogEntry('error', message, meta));
    }
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    if (this.shouldLog('warn')) {
      this.writeLog(this.createLogEntry('warn', message, meta));
    }
  }

  info(message: string, meta?: Record<string, unknown>): void {
    if (this.shouldLog('info')) {
      this.writeLog(this.createLogEntry('info', message, meta));
    }
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    if (this.shouldLog('debug')) {
      this.writeLog(this.createLogEntry('debug', message, meta));
    }
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  clearLogs(): void {
    this.logs = [];
  }

  setConfig(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

export const Logger = new LoggerService({
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  service: 'heic-converter',
});

export * from './types';

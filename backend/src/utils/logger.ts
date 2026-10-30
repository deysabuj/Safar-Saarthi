export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogPayload {
  level: LogLevel;
  message: string;
  timestamp: string;
  service: string;
  context?: string;
  data?: unknown;
}

export class Logger {
  private static serviceName = 'safar-saarthi-backend';

  static info(message: string, context?: string, data?: unknown) {
    this.log('info', message, context, data);
  }

  static warn(message: string, context?: string, data?: unknown) {
    this.log('warn', message, context, data);
  }

  static error(message: string, context?: string, data?: unknown) {
    this.log('error', message, context, data);
  }

  static debug(message: string, context?: string, data?: unknown) {
    if (process.env.NODE_ENV === 'development') {
      this.log('debug', message, context, data);
    }
  }

  private static log(level: LogLevel, message: string, context?: string, data?: unknown) {
    const payload: LogPayload = {
      level,
      message,
      timestamp: new Date().toISOString(),
      service: this.serviceName,
      context,
      data,
    };

    if (process.env.NODE_ENV === 'test') {
      return; // Keep test runner output clean
    }

    if (level === 'error') {
      console.error(JSON.stringify(payload));
    } else if (level === 'warn') {
      console.warn(JSON.stringify(payload));
    } else {
      console.log(JSON.stringify(payload));
    }
  }
}

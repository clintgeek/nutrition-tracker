import { apiService } from './apiService';

class LoggingService {
  private static instance: LoggingService;
  private isEnabled: boolean = true;

  private constructor() {}

  static getInstance(): LoggingService {
    if (!LoggingService.instance) {
      LoggingService.instance = new LoggingService();
    }
    return LoggingService.instance;
  }

  async log(level: 'info' | 'error' | 'debug', message: string, data?: any) {
    if (!this.isEnabled) return;

    try {
      await apiService.post('/logging/log', {
        level,
        message,
        data,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        platform: navigator.platform,
      });
    } catch (error) {
      console.error('Failed to send log:', error);
    }
  }

  info(message: string, data?: any) {
    this.log('info', message, data);
  }

  error(message: string, data?: any) {
    this.log('error', message, data);
  }

  debug(message: string, data?: any) {
    this.log('debug', message, data);
  }

  enable() {
    this.isEnabled = true;
  }

  disable() {
    this.isEnabled = false;
  }
}

export const loggingService = LoggingService.getInstance();
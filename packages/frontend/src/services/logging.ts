export interface LogEntry {
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
  details?: any;
  category?: string;
  source?: string;
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface ConnectivityError {
  type: 'network' | 'cors' | 'dns' | 'timeout' | 'auth' | 'server' | 'unknown';
  message: string;
  details?: any;
  troubleshooting?: string[];
}

class LoggingService {
  private logs: LogEntry[] = [];
  private listeners: ((logs: LogEntry[]) => void)[] = [];
  private logLevel: LogLevel = 'info';
  private maxLogs: number = 1000; // Prevent memory leaks
  private consoleIntegrationEnabled: boolean = true;

  setLogLevel(level: LogLevel) {
    this.logLevel = level;
  }

  setMaxLogs(max: number) {
    this.maxLogs = max;
    this.trimLogs();
  }

  setConsoleIntegration(enabled: boolean) {
    this.consoleIntegrationEnabled = enabled;
  }

  private trimLogs() {
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
      this.notifyListeners();
    }
  }

  private shouldLog(level: LogEntry['level']): boolean {
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    const currentLevel = levels[this.logLevel];
    const messageLevel = levels[level === 'success' ? 'info' : level];
    return messageLevel >= currentLevel;
  }

  log(level: LogEntry['level'], message: string, details?: any, category?: string, source?: string) {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      details,
      category,
      source
    };

    this.logs.push(entry);
    this.trimLogs();
    
    // Enhanced console integration for debugging
    if (this.consoleIntegrationEnabled) {
      const consoleMethod = level === 'success' ? 'info' : level;
      const timestamp = entry.timestamp.toISOString();
      const categoryPrefix = category ? `[${category}]` : '';
      const sourcePrefix = source ? `[${source}]` : '';
      const prefix = `[${timestamp}] [${level.toUpperCase()}]${categoryPrefix}${sourcePrefix}`;
      
      if (details) {
        console[consoleMethod](`${prefix} ${message}`, details);
      } else {
        console[consoleMethod](`${prefix} ${message}`);
      }
    }

    this.notifyListeners();
  }

  info(message: string, details?: any, category?: string, source?: string) {
    this.log('info', message, details, category, source);
  }

  warn(message: string, details?: any, category?: string, source?: string) {
    this.log('warn', message, details, category, source);
  }

  error(message: string, details?: any, category?: string, source?: string) {
    this.log('error', message, details, category, source);
  }

  success(message: string, details?: any, category?: string, source?: string) {
    this.log('success', message, details, category, source);
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  getLogsByLevel(level: LogEntry['level']): LogEntry[] {
    return this.logs.filter(log => log.level === level);
  }

  getLogsCount(): number {
    return this.logs.length;
  }

  getLogsSince(timestamp: Date): LogEntry[] {
    return this.logs.filter(log => log.timestamp >= timestamp);
  }

  clearLogs() {
    this.logs = [];
    this.notifyListeners();
  }

  subscribe(listener: (logs: LogEntry[]) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener([...this.logs]));
  }

  // Enhanced connectivity testing and error analysis
  analyzeConnectivityError(error: any, url: string): ConnectivityError {
    const errorMessage = error?.message?.toLowerCase() || '';
    const errorName = error?.name?.toLowerCase() || '';
    
    // CORS Error Detection
    if (errorMessage.includes('cors') || 
        errorMessage.includes('cross-origin') ||
        errorName.includes('cors')) {
      return {
        type: 'cors',
        message: 'CORS (Cross-Origin Resource Sharing) error detected',
        details: error,
        troubleshooting: [
          'The backend server needs to allow requests from your domain',
          'Check if the API Gateway has proper CORS configuration',
          'Verify the backend is running and accessible',
          'Try switching to Demo Mode for immediate testing'
        ]
      };
    }

    // Network/DNS Error Detection
    if (errorMessage.includes('failed to fetch') ||
        errorMessage.includes('network error') ||
        errorMessage.includes('net::err_name_not_resolved') ||
        errorMessage.includes('net::err_connection_refused')) {
      return {
        type: 'network',
        message: 'Network connectivity error - cannot reach the server',
        details: error,
        troubleshooting: [
          'Check your internet connection',
          'Verify the backend URL is correct',
          'Ensure the backend server is running',
          'Check if there are any firewall restrictions',
          'Try switching to a different environment (Demo/Development/Staging)'
        ]
      };
    }

    // Timeout Error Detection
    if (errorMessage.includes('timeout') ||
        errorMessage.includes('aborted')) {
      return {
        type: 'timeout',
        message: 'Request timed out - server is not responding',
        details: error,
        troubleshooting: [
          'The server may be overloaded or slow',
          'Try again in a few moments',
          'Check server status and performance',
          'Consider switching to Demo Mode if the issue persists'
        ]
      };
    }

    // Authentication Error Detection
    if (errorMessage.includes('401') ||
        errorMessage.includes('unauthorized') ||
        errorMessage.includes('authentication')) {
      return {
        type: 'auth',
        message: 'Authentication error - invalid or expired credentials',
        details: error,
        troubleshooting: [
          'Check your login credentials',
          'Try logging out and logging back in',
          'Verify your account has proper permissions',
          'Contact support if the issue persists'
        ]
      };
    }

    // Server Error Detection
    if (errorMessage.includes('500') ||
        errorMessage.includes('502') ||
        errorMessage.includes('503') ||
        errorMessage.includes('504') ||
        errorMessage.includes('internal server error')) {
      return {
        type: 'server',
        message: 'Server error - the backend is experiencing issues',
        details: error,
        troubleshooting: [
          'The backend server is experiencing technical difficulties',
          'Try again in a few minutes',
          'Switch to Demo Mode for immediate testing',
          'Contact support if the issue persists'
        ]
      };
    }

    // DNS Error Detection
    if (errorMessage.includes('dns') ||
        errorMessage.includes('name resolution')) {
      return {
        type: 'dns',
        message: 'DNS resolution error - cannot find the server',
        details: error,
        troubleshooting: [
          'Check if the server URL is correct',
          'Verify your DNS settings',
          'Try using a different DNS server (8.8.8.8)',
          'Check if the domain exists and is accessible'
        ]
      };
    }

    // Default unknown error
    return {
      type: 'unknown',
      message: 'Unknown connectivity error occurred',
      details: error,
      troubleshooting: [
        'Check your internet connection',
        'Verify the backend URL is correct',
        'Try refreshing the page',
        'Switch to Demo Mode for immediate testing',
        'Contact support with error details'
      ]
    };
  }

  logConnectivityError(error: any, url: string, context?: string) {
    const analysis = this.analyzeConnectivityError(error, url);
    const contextPrefix = context ? `${context}: ` : '';
    
    this.error(
      `${contextPrefix}${analysis.message}`,
      {
        url,
        errorType: analysis.type,
        originalError: analysis.details,
        troubleshooting: analysis.troubleshooting
      },
      'CONNECTIVITY',
      'API_TEST'
    );

    // Log troubleshooting steps as info messages
    this.info('Troubleshooting steps:', undefined, 'CONNECTIVITY', 'HELP');
    analysis.troubleshooting.forEach((step, index) => {
      this.info(`${index + 1}. ${step}`, undefined, 'CONNECTIVITY', 'HELP');
    });

    return analysis;
  }

  logEnvironmentSwitch(fromEnv: string, toEnv: string, reason?: string) {
    const message = reason 
      ? `Switching from ${fromEnv} to ${toEnv}: ${reason}`
      : `Environment switched from ${fromEnv} to ${toEnv}`;
    
    this.info(message, { fromEnv, toEnv, reason }, 'ENVIRONMENT', 'CONFIG');
  }

  logDemoModeRecommendation(currentEnv: string, issue: string) {
    this.warn(
      `⚠️  ${issue} in ${currentEnv} environment`,
      undefined,
      'ENVIRONMENT',
      'RECOMMENDATION'
    );
    this.info(
      '💡 Recommendation: Switch to "Demo Mode" for immediate testing with mock backend',
      undefined,
      'ENVIRONMENT',
      'RECOMMENDATION'
    );
  }
}

export const loggingService = new LoggingService();
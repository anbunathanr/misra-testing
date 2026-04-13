import { loggingService } from '../logging';

describe('LoggingService', () => {
  beforeEach(() => {
    loggingService.clearLogs();
    loggingService.setLogLevel('debug');
    loggingService.setConsoleIntegration(false); // Disable console for tests
  });

  afterEach(() => {
    jest.restoreAllMocks();
    loggingService.setConsoleIntegration(true); // Re-enable console
  });

  test('logs messages with correct format', () => {
    loggingService.info('Test message');
    
    const logs = loggingService.getLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0].level).toBe('info');
    expect(logs[0].message).toBe('Test message');
    expect(logs[0].timestamp).toBeInstanceOf(Date);
  });

  test('filters logs based on log level', () => {
    loggingService.setLogLevel('warn');
    
    loggingService.info('Info message');
    loggingService.warn('Warning message');
    
    const logs = loggingService.getLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0].level).toBe('warn');
    expect(logs[0].message).toBe('Warning message');
  });

  test('notifies subscribers when logs change', () => {
    const mockListener = jest.fn();
    const unsubscribe = loggingService.subscribe(mockListener);
    
    loggingService.info('Test message');
    
    expect(mockListener).toHaveBeenCalledWith([
      expect.objectContaining({
        level: 'info',
        message: 'Test message'
      })
    ]);
    
    unsubscribe();
  });

  test('clears logs correctly', () => {
    const mockListener = jest.fn();
    loggingService.subscribe(mockListener);
    
    loggingService.info('Test message');
    expect(loggingService.getLogs()).toHaveLength(1);
    
    loggingService.clearLogs();
    expect(loggingService.getLogs()).toHaveLength(0);
    expect(mockListener).toHaveBeenCalledWith([]);
  });

  test('handles different log levels', () => {
    loggingService.info('Info message');
    loggingService.warn('Warning message');
    loggingService.error('Error message');
    loggingService.success('Success message');
    
    const logs = loggingService.getLogs();
    expect(logs).toHaveLength(4);
    expect(logs[0].level).toBe('info');
    expect(logs[1].level).toBe('warn');
    expect(logs[2].level).toBe('error');
    expect(logs[3].level).toBe('success');
  });

  test('console integration can be enabled/disabled', () => {
    const consoleSpy = jest.spyOn(console, 'info').mockImplementation();
    
    loggingService.setConsoleIntegration(true);
    loggingService.info('Test message');
    expect(consoleSpy).toHaveBeenCalled();
    
    consoleSpy.mockClear();
    
    loggingService.setConsoleIntegration(false);
    loggingService.info('Another message');
    expect(consoleSpy).not.toHaveBeenCalled();
    
    consoleSpy.mockRestore();
  });

  test('trims logs when max limit is exceeded', () => {
    loggingService.setMaxLogs(3);
    
    loggingService.info('Message 1');
    loggingService.info('Message 2');
    loggingService.info('Message 3');
    loggingService.info('Message 4');
    loggingService.info('Message 5');
    
    const logs = loggingService.getLogs();
    expect(logs).toHaveLength(3);
    expect(logs[0].message).toBe('Message 3');
    expect(logs[1].message).toBe('Message 4');
    expect(logs[2].message).toBe('Message 5');
  });

  test('getLogsByLevel filters correctly', () => {
    loggingService.info('Info message');
    loggingService.warn('Warning message');
    loggingService.error('Error message');
    
    const errorLogs = loggingService.getLogsByLevel('error');
    expect(errorLogs).toHaveLength(1);
    expect(errorLogs[0].message).toBe('Error message');
    
    const warnLogs = loggingService.getLogsByLevel('warn');
    expect(warnLogs).toHaveLength(1);
    expect(warnLogs[0].message).toBe('Warning message');
  });

  test('getLogsSince filters by timestamp', () => {
    const startTime = new Date();
    
    loggingService.info('Old message');
    
    // Wait a bit to ensure different timestamps
    const cutoffTime = new Date(Date.now() + 10);
    
    loggingService.info('New message');
    
    const recentLogs = loggingService.getLogsSince(cutoffTime);
    expect(recentLogs).toHaveLength(1);
    expect(recentLogs[0].message).toBe('New message');
  });

  test('getLogsCount returns correct count', () => {
    expect(loggingService.getLogsCount()).toBe(0);
    
    loggingService.info('Message 1');
    loggingService.warn('Message 2');
    
    expect(loggingService.getLogsCount()).toBe(2);
  });
});
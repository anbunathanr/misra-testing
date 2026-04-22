export class EnhancedRetryService {
  async retry<T>(fn: () => Promise<T>, maxAttempts: number = 3): Promise<T> {
    let lastError: Error | undefined;
    for (let i = 0; i < maxAttempts; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 100));
      }
    }
    throw lastError;
  }

  async executeWithRetry<T>(
    fn: () => Promise<T>,
    options?: number | { maxAttempts?: number; initialDelayMs?: number; retryableErrors?: string[] }
  ): Promise<T> {
    const maxAttempts = typeof options === 'number' ? options : (options?.maxAttempts || 3);
    return this.retry(fn, maxAttempts);
  }
}

export const enhancedRetryService = new EnhancedRetryService();

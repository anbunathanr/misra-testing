export declare class EnhancedRetryService {
    retry<T>(fn: () => Promise<T>, maxAttempts?: number): Promise<T>;
    executeWithRetry<T>(fn: () => Promise<T>, options?: number | {
        maxAttempts?: number;
        initialDelayMs?: number;
        retryableErrors?: string[];
    }): Promise<T>;
}
export declare const enhancedRetryService: EnhancedRetryService;

export declare class CentralizedErrorHandler {
    static handle(error: unknown): {
        statusCode: number;
        body: string;
    };
    executeWithErrorHandling<T>(fn: () => Promise<T>, serviceName?: string, metadata?: any): Promise<T>;
    wrapLambdaHandler(handler: any, serviceName?: string): any;
}
export declare const centralizedErrorHandler: CentralizedErrorHandler;

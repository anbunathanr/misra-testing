export class CentralizedErrorHandler {
  static handle(error: unknown): { statusCode: number; body: string } {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      statusCode: 500,
      body: JSON.stringify({ error: message })
    };
  }

  async executeWithErrorHandling<T>(
    fn: () => Promise<T>,
    serviceName?: string,
    metadata?: any
  ): Promise<T> {
    return fn();
  }

  wrapLambdaHandler(handler: any, serviceName?: string): any {
    return handler;
  }
}

export const centralizedErrorHandler = new CentralizedErrorHandler();

/**
 * CORS (Cross-Origin Resource Sharing) utilities
 * Provides headers for API Gateway Lambda functions
 */
/**
 * Standard CORS headers for API responses
 * Allows requests from any origin in development, specific origins in production
 */
export declare const corsHeaders: {
    'Access-Control-Allow-Origin': string;
    'Access-Control-Allow-Headers': string;
    'Access-Control-Allow-Methods': string;
    'Access-Control-Allow-Credentials': string;
    'Content-Type': string;
};
/**
 * Get CORS headers with custom origin
 */
export declare function getCorsHeaders(origin?: string): Record<string, string>;
/**
 * Handle OPTIONS preflight requests
 */
export declare function handleOptionsRequest(): {
    statusCode: number;
    headers: {
        'Access-Control-Allow-Origin': string;
        'Access-Control-Allow-Headers': string;
        'Access-Control-Allow-Methods': string;
        'Access-Control-Allow-Credentials': string;
        'Content-Type': string;
    };
    body: string;
};
/**
 * Validate origin against allowed origins
 */
export declare function isOriginAllowed(origin: string): boolean;

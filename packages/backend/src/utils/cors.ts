/**
 * CORS (Cross-Origin Resource Sharing) utilities
 * Provides headers for API Gateway Lambda functions
 */

/**
 * Standard CORS headers for API responses
 * Allows requests from any origin in development, specific origins in production
 */
export const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGINS || '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS,PATCH',
  'Access-Control-Allow-Credentials': 'true',
  'Content-Type': 'application/json'
};

/**
 * Get CORS headers with custom origin
 */
export function getCorsHeaders(origin?: string): Record<string, string> {
  return {
    ...corsHeaders,
    'Access-Control-Allow-Origin': origin || corsHeaders['Access-Control-Allow-Origin']
  };
}

/**
 * Handle OPTIONS preflight requests
 */
export function handleOptionsRequest() {
  return {
    statusCode: 200,
    headers: corsHeaders,
    body: ''
  };
}

/**
 * Validate origin against allowed origins
 */
export function isOriginAllowed(origin: string): boolean {
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['*'];
  
  if (allowedOrigins.includes('*')) {
    return true;
  }
  
  return allowedOrigins.some(allowed => {
    // Support wildcard subdomains like *.example.com
    if (allowed.startsWith('*.')) {
      const domain = allowed.substring(2);
      return origin.endsWith(domain);
    }
    return origin === allowed;
  });
}

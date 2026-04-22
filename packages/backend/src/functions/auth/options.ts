/**
 * OPTIONS Handler Lambda Function
 * 
 * Handles CORS preflight requests for all API endpoints
 * Returns appropriate CORS headers for browser preflight checks
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { corsHeaders } from '../../utils/cors';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return {
    statusCode: 200,
    headers: {
      ...corsHeaders,
      'Access-Control-Allow-Origin': event.headers.origin || '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS,PATCH',
      'Access-Control-Allow-Headers': event.headers['access-control-request-headers'] || 'Content-Type,Authorization,X-Requested-With,X-Amz-Date,X-Api-Key,X-Amz-Security-Token,X-Correlation-ID',
      'Access-Control-Max-Age': '86400',
    },
    body: ''
  };
};

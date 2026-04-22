/**
 * Fetch OTP Lambda Function
 * 
 * Retrieves OTP from DynamoDB (stored by webhook)
 * This enables automatic OTP extraction from user's email
 * 
 * Request:
 * {
 *   "email": "user@example.com"
 * }
 * 
 * Response:
 * {
 *   "otp": "123456",
 *   "message": "OTP fetched successfully"
 * }
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient, QueryCommand } from '@aws-sdk/client-dynamodb';
import { corsHeaders } from '../../utils/cors';
import { createLogger } from '../../utils/logger';

const logger = createLogger('FetchOTP');
const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });

interface FetchOTPRequest {
  email: string;
}

interface FetchOTPResponse {
  otp: string;
  message: string;
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const correlationId = event.headers['X-Correlation-ID'] || Math.random().toString(36).substring(7);
  
  logger.info('Fetch OTP request received', {
    correlationId,
    path: event.path,
    method: event.httpMethod
  });

  try {
    // Parse request body
    if (!event.body) {
      return errorResponse(400, 'MISSING_BODY', 'Request body is required', correlationId);
    }

    const request: FetchOTPRequest = JSON.parse(event.body);

    // Validate required fields
    if (!request.email) {
      return errorResponse(400, 'MISSING_EMAIL', 'Email is required', correlationId);
    }

    logger.info('Fetching OTP for email', {
      correlationId,
      email: request.email
    });

    const tableName = process.env.OTP_STORAGE_TABLE || 'OTPStorage';

    // Query DynamoDB for most recent OTP for this email
    const queryCommand = new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: 'email = :email',
      ExpressionAttributeValues: {
        ':email': { S: request.email }
      },
      ScanIndexForward: false, // Sort by timestamp descending (most recent first)
      Limit: 1
    });

    const result = await dynamoClient.send(queryCommand);

    if (!result.Items || result.Items.length === 0) {
      logger.warn('No OTP found for email', {
        correlationId,
        email: request.email
      });

      // For testing/development: generate mock OTP if none found
      // In production, this would indicate the email wasn't received
      const mockOTP = generateMockOTP();
      logger.info('Generated mock OTP for testing', {
        correlationId,
        email: request.email
      });

      const response: FetchOTPResponse = {
        otp: mockOTP,
        message: 'OTP generated (no email received yet - using mock for testing)'
      };

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify(response)
      };
    }

    // Extract OTP from DynamoDB item
    const otpItem = result.Items[0];
    const otp = otpItem.otp?.S;

    if (!otp) {
      return errorResponse(500, 'INVALID_OTP_DATA', 'Invalid OTP data in storage', correlationId);
    }

    logger.info('OTP fetched successfully from storage', {
      correlationId,
      email: request.email,
      otp: otp.substring(0, 3) + '***'
    });

    const response: FetchOTPResponse = {
      otp,
      message: 'OTP fetched successfully from email'
    };

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(response)
    };

  } catch (error: any) {
    logger.error('Fetch OTP failed', {
      correlationId,
      error: error.message,
      stack: error.stack
    });

    return errorResponse(500, 'FETCH_OTP_FAILED', 'Failed to fetch OTP', correlationId);
  }
};

/**
 * Generate mock OTP for testing (fallback)
 * Used when email hasn't been received yet
 */
function generateMockOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Standard error response
 */
function errorResponse(
  statusCode: number,
  code: string,
  message: string,
  correlationId: string
): APIGatewayProxyResult {
  return {
    statusCode,
    headers: corsHeaders,
    body: JSON.stringify({
      error: {
        code,
        message,
        timestamp: new Date().toISOString(),
        requestId: correlationId
      }
    })
  };
}

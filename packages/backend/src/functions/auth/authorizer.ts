import { JWTService } from '../../services/auth/jwt-service';

// API Gateway Lambda Authorizer Event (REQUEST type)
export interface AuthorizerEvent {
  type: 'REQUEST';
  methodArn: string;
  headers?: {
    authorization?: string;
    Authorization?: string;
  };
  requestContext: {
    accountId: string;
    apiId: string;
    domainName: string;
    requestId: string;
  };
}

// IAM Policy Document for API Gateway HTTP API
export interface AuthorizerResponse {
  principalId: string;
  policyDocument: {
    Version: '2012-10-17';
    Statement: Array<{
      Action: 'execute-api:Invoke';
      Effect: 'Allow' | 'Deny';
      Resource: string;
    }>;
  };
  context?: {
    userId: string;
    email: string;
    organizationId: string;
    role: string;
  };
}

// Initialize JWT service (module-level for caching)
const jwtService = new JWTService();

/**
 * Generate IAM policy document for API Gateway authorization
 * @param principalId - User identifier (userId for Allow, 'unauthorized' for Deny)
 * @param effect - Allow or Deny
 * @param resource - API Gateway method ARN
 * @param context - User context (only for Allow policies)
 * @returns IAM policy document
 */
function generatePolicy(
  principalId: string,
  effect: 'Allow' | 'Deny',
  resource: string,
  context?: {
    userId: string;
    email: string;
    organizationId: string;
    role: string;
  }
): AuthorizerResponse {
  // For HTTP API, use wildcard to allow/deny all routes
  // Extract API Gateway ARN prefix (arn:aws:execute-api:region:account:apiId)
  const apiGatewayArn = resource.split('/').slice(0, 2).join('/') + '/*';

  const response: AuthorizerResponse = {
    principalId,
    policyDocument: {
      Version: '2012-10-17',
      Statement: [
        {
          Action: 'execute-api:Invoke',
          Effect: effect,
          Resource: apiGatewayArn,
        },
      ],
    },
  };

  // Add user context for Allow policies
  // API Gateway requires context values to be strings
  if (effect === 'Allow' && context) {
    response.context = {
      userId: context.userId,
      email: context.email,
      organizationId: context.organizationId,
      role: context.role,
    };
  }

  return response;
}

/**
 * Lambda Authorizer handler for API Gateway JWT authentication
 * Validates JWT tokens and returns IAM policy documents
 * 
 * @param event - API Gateway authorizer event
 * @returns IAM policy document with user context
 */
export const handler = async (event: AuthorizerEvent): Promise<AuthorizerResponse> => {
  try {
    // Log request (excluding sensitive token data)
    console.log('Authorization request:', {
      requestId: event.requestContext.requestId,
      apiId: event.requestContext.apiId,
      hasAuthHeader: !!(event.headers?.authorization || event.headers?.Authorization),
    });

    // Extract Authorization header (case-insensitive)
    const authHeader = event.headers?.authorization || event.headers?.Authorization;

    if (!authHeader) {
      console.log('Authorization header missing');
      return generatePolicy('unauthorized', 'Deny', event.methodArn);
    }

    // Extract token from "Bearer <token>" format
    const token = jwtService.extractTokenFromHeader(authHeader);

    if (!token) {
      console.log('Invalid Authorization header format (expected "Bearer <token>")');
      return generatePolicy('unauthorized', 'Deny', event.methodArn);
    }

    // Verify JWT token using existing JWT_Service
    try {
      const user = await jwtService.verifyAccessToken(token);

      console.log('Authorization successful', {
        userId: user.userId,
        email: user.email,
        role: user.role,
      });

      // Generate Allow policy with user context
      return generatePolicy(user.userId, 'Allow', event.methodArn, {
        userId: user.userId,
        email: user.email,
        organizationId: user.organizationId,
        role: user.role,
      });
    } catch (verifyError) {
      // Handle JWT verification errors
      const errorMessage = verifyError instanceof Error ? verifyError.message : 'Unknown error';
      console.error('JWT verification failed:', errorMessage);

      // Log specific error types for troubleshooting
      if (errorMessage.includes('expired')) {
        console.log('Token expired');
      } else if (errorMessage.includes('invalid')) {
        console.log('Invalid token signature or format');
      } else if (errorMessage.includes('Secrets Manager')) {
        console.error('Secrets Manager access failed:', errorMessage);
      }

      return generatePolicy('unauthorized', 'Deny', event.methodArn);
    }
  } catch (error) {
    // Handle unexpected errors
    console.error('Unexpected authorization error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    return generatePolicy('unauthorized', 'Deny', event.methodArn);
  }
};

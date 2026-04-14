import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { TestSuiteService } from '../../services/test-suite-service';
import { getUserFromContext } from '../../utils/auth-util';
import { CreateTestSuiteInput } from '../../types/test-suite';

const testSuiteService = new TestSuiteService();

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log('Create test suite request', { path: event.path });

  try {
    // Extract user from request context (populated by Lambda Authorizer)
    const user = getUserFromContext(event);

    if (!user.userId) {
      return {
        statusCode: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: {
            code: 'UNAUTHORIZED',
            message: 'User context not found',
            timestamp: new Date().toISOString(),
          },
        }),
      };
    }

    const input: CreateTestSuiteInput = JSON.parse(event.body || '{}');

    if (!input.projectId || !input.name || !input.description) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Missing required fields: projectId, name, description',
            timestamp: new Date().toISOString(),
          },
        }),
      };
    }

    const suite = await testSuiteService.createTestSuite(user.userId, input);

    return {
      statusCode: 201,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(suite),
    };
  } catch (error) {
    console.error('Error creating test suite', { error });
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create test suite',
          timestamp: new Date().toISOString(),
        },
      }),
    };
  }
};

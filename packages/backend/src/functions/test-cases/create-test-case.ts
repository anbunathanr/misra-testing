import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { TestCaseService } from '../../services/test-case-service';
import { getUserFromContext } from '../../utils/auth-util';
import { CreateTestCaseInput } from '../../types/test-case';

const testCaseService = new TestCaseService();

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log('Create test case request', { path: event.path });

  try {
    // Extract user from request context (populated by Lambda Authorizer)
    const user = await getUserFromContext(event);

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

    const input: CreateTestCaseInput = JSON.parse(event.body || '{}');

    if (!input.suiteId || !input.projectId || !input.name || !input.description || !input.type || !input.steps) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Missing required fields: suiteId, projectId, name, description, type, steps',
            timestamp: new Date().toISOString(),
          },
        }),
      };
    }

    const testCase = await testCaseService.createTestCase(user.userId, input);

    return {
      statusCode: 201,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(testCase),
    };
  } catch (error) {
    console.error('Error creating test case', { error });
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create test case',
          timestamp: new Date().toISOString(),
        },
      }),
    };
  }
};

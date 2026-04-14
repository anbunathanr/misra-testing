import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { TestCaseService } from '../../services/test-case-service';
import { getUserFromContext } from '../../utils/auth-util';
import { UpdateTestCaseInput } from '../../types/test-case';

const testCaseService = new TestCaseService();

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log('Update test case request', { path: event.path });

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

    const testCaseId = event.pathParameters?.testCaseId;
    if (!testCaseId) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Missing testCaseId parameter',
            timestamp: new Date().toISOString(),
          },
        }),
      };
    }

    const input: UpdateTestCaseInput = {
      testCaseId,
      ...JSON.parse(event.body || '{}'),
    };

    const testCase = await testCaseService.updateTestCase(input);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(testCase),
    };
  } catch (error) {
    console.error('Error updating test case', { error });
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update test case',
          timestamp: new Date().toISOString(),
        },
      }),
    };
  }
};

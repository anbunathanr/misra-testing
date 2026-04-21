import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { TestSuiteService } from '../../services/test-suite-service';
import { getUserFromContext } from '../../utils/auth-util';
import { UpdateTestSuiteInput } from '../../types/test-suite';

const testSuiteService = new TestSuiteService();

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log('Update test suite request', { path: event.path });

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

    const suiteId = event.pathParameters?.suiteId;
    if (!suiteId) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Missing suiteId parameter',
            timestamp: new Date().toISOString(),
          },
        }),
      };
    }

    const input: UpdateTestSuiteInput = {
      suiteId,
      ...JSON.parse(event.body || '{}'),
    };

    const suite = await testSuiteService.updateTestSuite(input);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(suite),
    };
  } catch (error) {
    console.error('Error updating test suite', { error });
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update test suite',
          timestamp: new Date().toISOString(),
        },
      }),
    };
  }
};

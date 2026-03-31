import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { TestSuiteService } from '../../services/test-suite-service';
import { getUserFromContext } from '../../utils/auth-util';

const testSuiteService = new TestSuiteService();

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log('Get test suites request', { path: event.path });

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

    const projectId = event.queryStringParameters?.projectId;

    let suites;
    if (projectId) {
      suites = await testSuiteService.getProjectTestSuites(projectId);
    } else {
      suites = await testSuiteService.getUserTestSuites(user.userId);
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(suites),
    };
  } catch (error) {
    console.error('Error getting test suites', { error });
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get test suites',
          timestamp: new Date().toISOString(),
        },
      }),
    };
  }
};

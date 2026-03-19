import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    console.log('Event:', JSON.stringify(event));
    console.log('Environment:', {
      PROJECTS_TABLE_NAME: process.env.PROJECTS_TABLE_NAME,
      JWT_SECRET_NAME: process.env.JWT_SECRET_NAME,
      AWS_REGION: process.env.AWS_REGION,
    });

    // Extract token
    const authHeader = event.headers.Authorization || event.headers.authorization;
    if (!authHeader) {
      return {
        statusCode: 401,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Missing Authorization header' }),
      };
    }

    // For now, just return mock data to test the flow
    const userId = 'test-user-123';

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projects: [
          {
            projectId: 'proj-1',
            userId,
            name: 'Test Project',
            description: 'A test project',
            targetUrl: 'https://example.com',
            environment: 'dev',
            createdAt: Math.floor(Date.now() / 1000),
            updatedAt: Math.floor(Date.now() / 1000),
          },
        ],
      }),
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};

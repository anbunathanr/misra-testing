import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    // Extract token from Authorization header
    const authHeader = event.headers.Authorization || event.headers.authorization;
    if (!authHeader) {
      return {
        statusCode: 401,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Missing Authorization header' }),
      };
    }

    // Return demo projects for working demo
    return {
      statusCode: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        projects: [
          {
            projectId: 'demo-proj-1',
            name: 'E-Commerce Platform',
            description: 'Test automation for e-commerce site',
            targetUrl: 'https://example-ecommerce.com',
            environment: 'dev',
            createdAt: Math.floor(Date.now() / 1000),
            updatedAt: Math.floor(Date.now() / 1000),
          },
          {
            projectId: 'demo-proj-2',
            name: 'Social Media App',
            description: 'Test automation for social platform',
            targetUrl: 'https://example-social.com',
            environment: 'staging',
            createdAt: Math.floor(Date.now() / 1000),
            updatedAt: Math.floor(Date.now() / 1000),
          },
        ] 
      }),
    };
  } catch (error) {
    console.error('Error getting projects:', error);
    return {
      statusCode: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ projects: [] }),
    };
  }
};

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { TestSuiteService } from '../../services/test-suite-service';
import * as jwt from 'jsonwebtoken';

const testSuiteService = new TestSuiteService();

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const authHeader = event.headers.Authorization || event.headers.authorization;
    if (!authHeader) {
      return {
        statusCode: 401,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Missing Authorization header' }),
      };
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = jwt.decode(token) as any;
    const userId = decoded?.userId || decoded?.sub;

    if (!userId) {
      return {
        statusCode: 401,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Invalid token' }),
      };
    }

    const projectId = event.queryStringParameters?.projectId;

    let suites;
    if (projectId) {
      suites = await testSuiteService.getProjectTestSuites(projectId);
    } else {
      suites = await testSuiteService.getUserTestSuites(userId);
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(suites),
    };
  } catch (error) {
    console.error('Error getting test suites:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};

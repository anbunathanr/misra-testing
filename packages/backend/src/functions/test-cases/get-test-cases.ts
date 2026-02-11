import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { TestCaseService } from '../../services/test-case-service';
import * as jwt from 'jsonwebtoken';

const testCaseService = new TestCaseService();

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

    const suiteId = event.queryStringParameters?.suiteId;
    const projectId = event.queryStringParameters?.projectId;

    let testCases;
    if (suiteId) {
      testCases = await testCaseService.getSuiteTestCases(suiteId);
    } else if (projectId) {
      testCases = await testCaseService.getProjectTestCases(projectId);
    } else {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Either suiteId or projectId query parameter is required' }),
      };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testCases),
    };
  } catch (error) {
    console.error('Error getting test cases:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { TestCaseService } from '../../services/test-case-service';
import { UpdateTestCaseInput } from '../../types/test-case';
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

    const testCaseId = event.pathParameters?.testCaseId;
    if (!testCaseId) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Missing testCaseId parameter' }),
      };
    }

    const input: UpdateTestCaseInput = {
      testCaseId,
      ...JSON.parse(event.body || '{}'),
    };

    const testCase = await testCaseService.updateTestCase(input);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testCase),
    };
  } catch (error) {
    console.error('Error updating test case:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};

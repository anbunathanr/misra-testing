import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { TestCaseService } from '../../services/test-case-service';
import { CreateTestCaseInput } from '../../types/test-case';
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

    const input: CreateTestCaseInput = JSON.parse(event.body || '{}');

    if (!input.suiteId || !input.projectId || !input.name || !input.description || !input.type || !input.steps) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Missing required fields: suiteId, projectId, name, description, type, steps' }),
      };
    }

    const testCase = await testCaseService.createTestCase(userId, input);

    return {
      statusCode: 201,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testCase),
    };
  } catch (error) {
    console.error('Error creating test case:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};

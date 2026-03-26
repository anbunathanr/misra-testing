import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { TestSuiteService } from '../../services/test-suite-service';
import { CreateTestSuiteInput } from '../../types/test-suite';
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

    const input: CreateTestSuiteInput = JSON.parse(event.body || '{}');

    if (!input.projectId || !input.name || !input.description) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Missing required fields: projectId, name, description' }),
      };
    }

    const suite = await testSuiteService.createTestSuite(userId, input);

    return {
      statusCode: 201,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(suite),
    };
  } catch (error) {
    console.error('Error creating test suite:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ProjectService } from '../../services/project-service';
import { CreateProjectInput } from '../../types/test-project';
import * as jwt from 'jsonwebtoken';

const projectService = new ProjectService();

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    // Extract token from Authorization header
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

    const input: CreateProjectInput = JSON.parse(event.body || '{}');

    // Validation
    if (!input.name || !input.targetUrl || !input.environment) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Missing required fields: name, targetUrl, environment' }),
      };
    }

    const project = await projectService.createProject(userId, input);

    return {
      statusCode: 201,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(project),
    };
  } catch (error) {
    console.error('Error creating project:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};

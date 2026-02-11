import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ProjectService } from '../../services/project-service';
import { UpdateProjectInput } from '../../types/test-project';
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

    const projectId = event.pathParameters?.projectId;
    if (!projectId) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Missing projectId' }),
      };
    }

    const input: UpdateProjectInput = {
      projectId,
      ...JSON.parse(event.body || '{}'),
    };

    const project = await projectService.updateProject(input);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(project),
    };
  } catch (error) {
    console.error('Error updating project:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};

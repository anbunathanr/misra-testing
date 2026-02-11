import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ProjectService } from '../../services/project-service';
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

    const projects = await projectService.getUserProjects(userId);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projects }),
    };
  } catch (error) {
    console.error('Error getting projects:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};

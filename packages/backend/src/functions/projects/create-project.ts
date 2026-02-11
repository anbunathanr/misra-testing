import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ProjectService } from '../../services/project-service';
import { CreateProjectInput } from '../../types/test-project';

const projectService = new ProjectService();

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const userId = event.requestContext.authorizer?.claims?.sub;
    if (!userId) {
      return {
        statusCode: 401,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Unauthorized' }),
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

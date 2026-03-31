import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ProjectService } from '../../services/project-service';
import { getUserFromContext } from '../../utils/auth-util';
import { CreateProjectInput } from '../../types/test-project';

const projectService = new ProjectService();

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log('Create project request', { path: event.path });

  try {
    // Extract user from request context (populated by Lambda Authorizer)
    const user = getUserFromContext(event);

    if (!user.userId) {
      return {
        statusCode: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: {
            code: 'UNAUTHORIZED',
            message: 'User context not found',
            timestamp: new Date().toISOString(),
          },
        }),
      };
    }

    const input = JSON.parse(event.body || '{}');

    // Validation
    if (!input.name || !input.targetUrl || !input.environment) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Missing required fields: name, targetUrl, environment',
            timestamp: new Date().toISOString(),
          },
        }),
      };
    }

    // Create project input
    const createInput: CreateProjectInput = {
      name: input.name,
      description: input.description || '',
      targetUrl: input.targetUrl,
      environment: input.environment,
    };

    // Create project using service
    const project = await projectService.createProject(user.userId, createInput);

    return {
      statusCode: 201,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(project),
    };
  } catch (error) {
    console.error('Error creating project', { error });
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create project',
          timestamp: new Date().toISOString(),
        },
      }),
    };
  }
};

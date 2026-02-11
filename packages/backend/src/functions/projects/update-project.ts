import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ProjectService } from '../../services/project-service';
import { UpdateProjectInput } from '../../types/test-project';

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

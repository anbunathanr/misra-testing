import { APIGatewayProxyResult } from 'aws-lambda';
import { ProjectService } from '../../services/project-service';
import { withAuth, AuthenticatedEvent, getUser } from '../../middleware/auth-middleware';

const projectService = new ProjectService();

export const handler = withAuth(async (event: AuthenticatedEvent): Promise<APIGatewayProxyResult> => {
  try {
    // ✅ Get authenticated user from middleware
    const user = getUser(event);

    if (!user) {
      return {
        statusCode: 401,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'Unauthorized' }),
      };
    }

    console.log("Authenticated user:", user.userId);

    // ✅ Fetch projects for this user
    const projects = await projectService.getUserProjects(user.userId);

    return {
      statusCode: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ projects }),
    };
  } catch (error) {
    console.error('Error getting projects:', error);

    return {
      statusCode: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
});
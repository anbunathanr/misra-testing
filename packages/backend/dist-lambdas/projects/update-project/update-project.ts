import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ProjectService } from '../../services/project-service';
import { UpdateProjectInput } from '../../types/test-project';
import { JWTService } from '../../services/auth/jwt-service';

const projectService = new ProjectService();
const jwtService = new JWTService();

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    // Extract token from Authorization header
    const authHeader = event.headers.Authorization || event.headers.authorization;
    if (!authHeader) {
      return {
        statusCode: 401,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Missing Authorization header' }),
      };
    }

    // Verify JWT token
    const token = authHeader.substring(7);
    let tokenPayload;
    
    try {
      tokenPayload = await jwtService.verifyAccessToken(token);
    } catch (error) {
      return {
        statusCode: 401,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Invalid or expired token' }),
      };
    }

    const projectId = event.pathParameters?.projectId;
    if (!projectId) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
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
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(project),
    };
  } catch (error) {
    console.error('Error updating project:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};

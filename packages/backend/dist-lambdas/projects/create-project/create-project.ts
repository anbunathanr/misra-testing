import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ProjectService } from '../../services/project-service';
import { JWTService } from '../../services/auth/jwt-service';
import { CreateProjectInput } from '../../types/test-project';

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

    const input = JSON.parse(event.body || '{}');

    // Validation
    if (!input.name || !input.targetUrl || !input.environment) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Missing required fields: name, targetUrl, environment' }),
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
    const project = await projectService.createProject(tokenPayload.userId, createInput);

    return {
      statusCode: 201,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(project),
    };
  } catch (error) {
    console.error('Error creating project:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};

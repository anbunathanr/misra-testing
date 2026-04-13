import { APIGatewayProxyEvent } from 'aws-lambda';
import { handler } from '../quick-register';

// Simple integration test without complex mocking
describe('Quick Register Lambda - Basic Tests', () => {
  const createEvent = (body: any): APIGatewayProxyEvent => ({
    body: JSON.stringify(body),
    headers: {},
    multiValueHeaders: {},
    httpMethod: 'POST',
    isBase64Encoded: false,
    path: '/auth/quick-register',
    pathParameters: null,
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {} as any,
    resource: ''
  });

  it('should return error for missing body', async () => {
    const event = { ...createEvent({}), body: null };
    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    
    const response = JSON.parse(result.body);
    expect(response.error.code).toBe('MISSING_BODY');
    expect(response.error.message).toBe('Request body is required');
  });

  it('should return error for invalid email', async () => {
    const event = createEvent({ email: 'invalid-email' });
    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    
    const response = JSON.parse(result.body);
    expect(response.error.code).toBe('INVALID_EMAIL');
    expect(response.error.message).toBe('Valid email address is required');
  });

  it('should return error for empty email', async () => {
    const event = createEvent({ email: '' });
    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    
    const response = JSON.parse(result.body);
    expect(response.error.code).toBe('INVALID_EMAIL');
  });

  it('should return error for missing email', async () => {
    const event = createEvent({ name: 'Test User' });
    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    
    const response = JSON.parse(result.body);
    expect(response.error.code).toBe('INVALID_EMAIL');
  });

  it('should have proper CORS headers', async () => {
    const event = createEvent({ email: 'invalid-email' });
    const result = await handler(event);

    expect(result.headers).toEqual({
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    });
  });

  it('should include error timestamp and request ID', async () => {
    const event = createEvent({ email: 'invalid-email' });
    const result = await handler(event);

    const response = JSON.parse(result.body);
    expect(response.error.timestamp).toBeDefined();
    expect(response.error.requestId).toBeDefined();
    expect(typeof response.error.timestamp).toBe('string');
    expect(typeof response.error.requestId).toBe('string');
  });
});
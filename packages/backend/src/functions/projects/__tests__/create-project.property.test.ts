/**
 * Property-Based Tests for create-project Lambda function
 *
 * **Property 5: Refactored functions maintain behavior**
 * **Validates: Requirements 7.5**
 *
 * Verifies that the refactored create-project function (using getUserFromContext
 * instead of JWT middleware) produces consistent, well-structured responses
 * across all valid and invalid inputs.
 */

// ─── Top-level mocks ─────────────────────────────────────────────────────────

const mockCreateProject = jest.fn();

jest.mock('../../../services/project-service', () => ({
  ProjectService: jest.fn().mockImplementation(() => ({
    createProject: (...args: any[]) => mockCreateProject(...args),
  })),
}));

import * as fc from 'fast-check';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { handler } from '../create-project';

// ─── Helpers ─────────────────────────────────────────────────────────────────

interface UserContext {
  userId: string;
  email: string;
  organizationId: string;
  role: string;
}

interface ProjectData {
  name: string;
  targetUrl: string;
  environment: string;
}

function buildEvent(
  userContext: Partial<UserContext>,
  body: Record<string, unknown> | null,
): APIGatewayProxyEvent {
  return {
    httpMethod: 'POST',
    path: '/projects',
    headers: {},
    multiValueHeaders: {},
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    pathParameters: null,
    stageVariables: null,
    body: body !== null ? JSON.stringify(body) : null,
    isBase64Encoded: false,
    resource: '/projects',
    requestContext: {
      authorizer: {
        userId: userContext.userId ?? '',
        email: userContext.email ?? '',
        organizationId: userContext.organizationId ?? '',
        role: userContext.role ?? '',
      },
    } as any,
  } as APIGatewayProxyEvent;
}

// ─── Arbitraries ─────────────────────────────────────────────────────────────

const userContextArb = fc.record({
  userId: fc.uuid(),
  email: fc.emailAddress(),
  organizationId: fc.uuid(),
  role: fc.constantFrom('admin', 'developer', 'viewer'),
});

const projectDataArb = fc.record({
  name: fc.string({ minLength: 1, maxLength: 100 }),
  targetUrl: fc.webUrl(),
  environment: fc.constantFrom('development', 'staging', 'production'),
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('create-project property-based tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Property 5: Refactored functions maintain behavior', () => {
    /**
     * **Validates: Requirements 7.5**
     *
     * The refactored function must produce consistent output for the same input
     * and maintain the same response structure as before refactoring.
     */

    it('should produce consistent output for the same input (deterministic behavior)', async () => {
      await fc.assert(
        fc.asyncProperty(userContextArb, projectDataArb, async (userCtx, projectData) => {
          // Arrange: mock service to return a predictable project
          const mockProject = {
            projectId: 'proj-fixed',
            userId: userCtx.userId,
            ...projectData,
            createdAt: 1000,
            updatedAt: 1000,
          };
          mockCreateProject.mockResolvedValue(mockProject);

          const event = buildEvent(userCtx, projectData);

          // Act: invoke twice with the same input
          const result1 = await handler(event);
          const result2 = await handler(event);

          // Assert: both calls produce the same status code and body
          expect(result1.statusCode).toBe(result2.statusCode);
          expect(result1.body).toBe(result2.body);
        }),
        { numRuns: 100 },
      );
    });

    it('should always return a response with statusCode, headers, and body', async () => {
      await fc.assert(
        fc.asyncProperty(userContextArb, projectDataArb, async (userCtx, projectData) => {
          mockCreateProject.mockResolvedValue({
            projectId: 'proj-1',
            userId: userCtx.userId,
            ...projectData,
            createdAt: 1000,
            updatedAt: 1000,
          });

          const event = buildEvent(userCtx, projectData);
          const result = await handler(event);

          // Assert: response structure is always consistent
          expect(typeof result.statusCode).toBe('number');
          expect(result.headers).toBeDefined();
          expect(typeof result.body).toBe('string');
        }),
        { numRuns: 100 },
      );
    });

    it('should always include CORS headers in every response', async () => {
      await fc.assert(
        fc.asyncProperty(userContextArb, projectDataArb, async (userCtx, projectData) => {
          mockCreateProject.mockResolvedValue({
            projectId: 'proj-1',
            userId: userCtx.userId,
            ...projectData,
            createdAt: 1000,
            updatedAt: 1000,
          });

          const event = buildEvent(userCtx, projectData);
          const result = await handler(event);

          // Assert: CORS header is always present regardless of outcome
          expect(result.headers?.['Access-Control-Allow-Origin']).toBe('*');
        }),
        { numRuns: 100 },
      );
    });

    it('should return 401 when userId is empty', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            email: fc.emailAddress(),
            organizationId: fc.uuid(),
            role: fc.constantFrom('admin', 'developer', 'viewer'),
          }),
          projectDataArb,
          async (partialCtx, projectData) => {
            // userId is explicitly empty
            const event = buildEvent({ ...partialCtx, userId: '' }, projectData);
            const result = await handler(event);

            expect(result.statusCode).toBe(401);
            expect(result.headers?.['Access-Control-Allow-Origin']).toBe('*');

            const body = JSON.parse(result.body);
            expect(body.error).toBeDefined();
            expect(body.error.code).toBe('UNAUTHORIZED');
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should return 400 when required fields are missing', async () => {
      await fc.assert(
        fc.asyncProperty(
          userContextArb,
          // Generate bodies that are missing at least one required field
          fc.oneof(
            fc.constant({}),
            fc.record({ name: fc.string({ minLength: 1 }) }),
            fc.record({ targetUrl: fc.webUrl() }),
            fc.record({ environment: fc.constantFrom('staging', 'production') }),
            fc.record({
              name: fc.string({ minLength: 1 }),
              targetUrl: fc.webUrl(),
              // missing environment
            }),
            fc.record({
              name: fc.string({ minLength: 1 }),
              environment: fc.constantFrom('staging', 'production'),
              // missing targetUrl
            }),
            fc.record({
              targetUrl: fc.webUrl(),
              environment: fc.constantFrom('staging', 'production'),
              // missing name
            }),
          ),
          async (userCtx, incompleteBody) => {
            const event = buildEvent(userCtx, incompleteBody);
            const result = await handler(event);

            expect(result.statusCode).toBe(400);
            expect(result.headers?.['Access-Control-Allow-Origin']).toBe('*');

            const body = JSON.parse(result.body);
            expect(body.error).toBeDefined();
            expect(body.error.code).toBe('VALIDATION_ERROR');
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should return 201 with project data when all inputs are valid', async () => {
      await fc.assert(
        fc.asyncProperty(userContextArb, projectDataArb, async (userCtx, projectData) => {
          const mockProject = {
            projectId: 'proj-abc',
            userId: userCtx.userId,
            ...projectData,
            description: '',
            createdAt: 1000,
            updatedAt: 1000,
          };
          mockCreateProject.mockResolvedValue(mockProject);

          const event = buildEvent(userCtx, projectData);
          const result = await handler(event);

          expect(result.statusCode).toBe(201);
          expect(result.headers?.['Access-Control-Allow-Origin']).toBe('*');

          const body = JSON.parse(result.body);
          expect(body.projectId).toBe('proj-abc');
          expect(body.userId).toBe(userCtx.userId);
        }),
        { numRuns: 100 },
      );
    });

    it('should always return valid JSON in the body', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            // Valid authenticated request
            userContextArb.chain(ctx =>
              projectDataArb.map(data => ({ ctx, body: data as Record<string, unknown> })),
            ),
            // Unauthenticated request
            fc.constant({ ctx: { userId: '' }, body: {} as Record<string, unknown> }),
            // Missing fields
            userContextArb.map(ctx => ({ ctx, body: { name: 'only-name' } as Record<string, unknown> })),
          ),
          async ({ ctx, body }) => {
            mockCreateProject.mockResolvedValue({
              projectId: 'proj-1',
              userId: ctx.userId,
              name: 'test',
              targetUrl: 'https://example.com',
              environment: 'staging',
              createdAt: 1000,
              updatedAt: 1000,
            });

            const event = buildEvent(ctx, body);
            const result = await handler(event);

            // Assert: body is always parseable JSON
            expect(() => JSON.parse(result.body)).not.toThrow();
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});

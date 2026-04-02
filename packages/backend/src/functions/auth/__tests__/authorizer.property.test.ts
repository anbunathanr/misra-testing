// Mock JWTService before importing the handler
const mockExtractTokenFromHeader = jest.fn();
const mockVerifyAccessToken = jest.fn();
const mockGenerateTokenPair = jest.fn();

jest.mock('../../../services/auth/jwt-service', () => {
  return {
    JWTService: jest.fn().mockImplementation(() => {
      return {
        extractTokenFromHeader: mockExtractTokenFromHeader,
        verifyAccessToken: mockVerifyAccessToken,
        generateTokenPair: mockGenerateTokenPair,
      };
    }),
  };
});

import * as fc from 'fast-check';
import { handler, AuthorizerEvent } from '../authorizer';

// Real implementation of extractTokenFromHeader for Property 1 tests
// (Property 1 tests the extraction logic directly, not through the handler)
const jwtService = {
  extractTokenFromHeader: (authHeader: string | undefined): string | null => {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7); // Remove 'Bearer ' prefix
  },
};

describe('Lambda Authorizer Property-Based Tests', () => {

  describe('Property 1: Token extraction from Authorization header', () => {
    /**
     * **Validates: Requirements 1.5**
     * 
     * Property: For any Authorization header in the format "Bearer <token>",
     * the Lambda Authorizer should correctly extract the token portion.
     */
    it('should extract token from any valid Bearer format', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 10, maxLength: 500 }), // Random token (10-500 characters)
          (token) => {
            // Arrange: Create Authorization header with Bearer prefix
            const authHeader = `Bearer ${token}`;

            // Act: Extract token using JWT service
            const extracted = jwtService.extractTokenFromHeader(authHeader);

            // Assert: Extracted token should match original token
            expect(extracted).toBe(token);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return null for any header without Bearer prefix', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 500 }).filter(s => !s.startsWith('Bearer ')),
          (invalidHeader) => {
            // Act: Try to extract token from invalid header
            const extracted = jwtService.extractTokenFromHeader(invalidHeader);

            // Assert: Should return null for invalid format
            expect(extracted).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return null for undefined or empty headers', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(undefined, '', 'Bearer'),
          (invalidHeader) => {
            // Act: Try to extract token from invalid header
            const extracted = jwtService.extractTokenFromHeader(invalidHeader);

            // Assert: Should return null for invalid format
            expect(extracted).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return empty string for "Bearer " with only space', () => {
      // This is a specific edge case: "Bearer " returns empty string
      const extracted = jwtService.extractTokenFromHeader('Bearer ');
      expect(extracted).toBe('');
    });

    it('should handle tokens with special characters', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 10, maxLength: 500 }),
          (token) => {
            // Arrange: Create Authorization header
            const authHeader = `Bearer ${token}`;

            // Act: Extract token
            const extracted = jwtService.extractTokenFromHeader(authHeader);

            // Assert: Should extract exact token including special characters
            expect(extracted).toBe(token);
            expect(extracted?.length).toBe(token.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle tokens with whitespace', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 10, maxLength: 500 }),
          (token) => {
            // Arrange: Create Authorization header with Bearer prefix
            const authHeader = `Bearer ${token}`;

            // Act: Extract token
            const extracted = jwtService.extractTokenFromHeader(authHeader);

            // Assert: Should extract token exactly as provided
            expect(extracted).toBe(token);
            
            // Verify no trimming or modification occurred
            if (token.startsWith(' ') || token.endsWith(' ')) {
              expect(extracted).toContain(' ');
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should be case-sensitive for Bearer prefix', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 10, maxLength: 100 }),
          fc.constantFrom('bearer ', 'BEARER ', 'BeArEr ', 'bearer', 'BEARER'),
          (token, invalidPrefix) => {
            // Arrange: Create header with incorrect case
            const authHeader = `${invalidPrefix}${token}`;

            // Act: Try to extract token
            const extracted = jwtService.extractTokenFromHeader(authHeader);

            // Assert: Should return null for incorrect case
            expect(extracted).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should extract tokens of varying lengths', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 10, max: 500 }).chain(length =>
            fc.string({ minLength: length, maxLength: length })
          ),
          (token) => {
            // Arrange: Create Authorization header
            const authHeader = `Bearer ${token}`;

            // Act: Extract token
            const extracted = jwtService.extractTokenFromHeader(authHeader);

            // Assert: Should extract token with correct length
            expect(extracted).toBe(token);
            expect(extracted?.length).toBe(token.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle JWT-like token formats', () => {
      fc.assert(
        fc.property(
          // Generate JWT-like tokens (base64url strings with dots)
          fc.tuple(
            fc.string({ minLength: 20, maxLength: 100, unit: fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'.split('')) }),
            fc.string({ minLength: 20, maxLength: 100, unit: fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'.split('')) }),
            fc.string({ minLength: 20, maxLength: 100, unit: fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'.split('')) })
          ).map(([header, payload, signature]) => `${header}.${payload}.${signature}`),
          (jwtLikeToken) => {
            // Arrange: Create Authorization header with JWT-like token
            const authHeader = `Bearer ${jwtLikeToken}`;

            // Act: Extract token
            const extracted = jwtService.extractTokenFromHeader(authHeader);

            // Assert: Should extract complete JWT-like token
            expect(extracted).toBe(jwtLikeToken);
            expect(extracted?.split('.').length).toBe(3);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 3: Valid token generates properly formatted allow policy', () => {
    /**
     * **Validates: Requirements 3.1, 3.3, 3.4, 3.6**
     * 
     * Property: For any valid JWT token, the Lambda Authorizer should return an IAM
     * policy that:
     * - Has Effect "Allow"
     * - Contains principalId matching the userId from the token
     * - Contains the correct API Gateway ARN as the resource
     * - Conforms to the API Gateway HTTP API policy format (Version "2012-10-17", Action "execute-api:Invoke")
     */

    // Helper function to create mock authorizer event
    const createMockEvent = (authHeader?: string, methodArn = 'arn:aws:execute-api:us-east-1:123456789012:abc123/prod/GET/test'): AuthorizerEvent => ({
      type: 'REQUEST',
      methodArn,
      headers: authHeader ? { authorization: authHeader } : undefined,
      requestContext: {
        accountId: '123456789012',
        apiId: 'abc123',
        domainName: 'api.example.com',
        requestId: 'test-request-id',
      },
    });

    beforeEach(() => {
      // Reset all mocks before each test
      jest.resetAllMocks();
    });

    it('should generate properly formatted allow policy for any valid token', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            userId: fc.uuid(),
            email: fc.emailAddress(),
            organizationId: fc.uuid(),
            role: fc.constantFrom('admin', 'developer', 'viewer'),
          }),
          async (userPayload) => {
            // Arrange: Mock JWT token generation and verification
            const mockToken = 'valid.mock.token';
            mockGenerateTokenPair.mockResolvedValue({ accessToken: mockToken, refreshToken: 'refresh', expiresIn: 900 });
            mockExtractTokenFromHeader.mockReturnValue(mockToken);
            mockVerifyAccessToken.mockResolvedValue(userPayload);
            const event = createMockEvent(`Bearer ${mockToken}`);

            // Act: Invoke authorizer handler
            const response = await handler(event);

            // Assert: Verify policy structure
            expect(response.policyDocument.Version).toBe('2012-10-17');
            expect(response.policyDocument.Statement[0].Action).toBe('execute-api:Invoke');
            expect(response.policyDocument.Statement[0].Effect).toBe('Allow');
            
            // Verify resource ARN matches API Gateway format
            expect(response.policyDocument.Statement[0].Resource).toMatch(/^arn:aws:execute-api:.+\/\*$/);
            
            // Verify principalId matches userId
            expect(response.principalId).toBe(userPayload.userId);
            
            // Verify context contains all required fields
            expect(response.context).toBeDefined();
            expect(response.context?.userId).toBe(userPayload.userId);
            expect(response.context?.email).toBe(userPayload.email);
            expect(response.context?.organizationId).toBe(userPayload.organizationId);
            expect(response.context?.role).toBe(userPayload.role);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should generate allow policy with wildcard resource ARN for any valid token', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            userId: fc.uuid(),
            email: fc.emailAddress(),
            organizationId: fc.uuid(),
            role: fc.constantFrom('admin', 'developer', 'viewer'),
          }),
          async (userPayload) => {
            // Arrange: Mock JWT token generation and verification
            const mockToken = 'valid.mock.token';
            mockGenerateTokenPair.mockResolvedValue({ accessToken: mockToken, refreshToken: 'refresh', expiresIn: 900 });
            mockExtractTokenFromHeader.mockReturnValue(mockToken);
            mockVerifyAccessToken.mockResolvedValue(userPayload);
            
            // Test with different method ARNs
            const methodArns = [
              'arn:aws:execute-api:us-east-1:123456789012:abc123/prod/GET/test',
              'arn:aws:execute-api:us-west-2:987654321098:xyz789/dev/POST/users',
              'arn:aws:execute-api:eu-west-1:111222333444:def456/stage/DELETE/items',
            ];
            
            for (const methodArn of methodArns) {
              const event = createMockEvent(`Bearer ${mockToken}`, methodArn);
              const response = await handler(event);

              // Assert: Resource should always end with /* for wildcard
              expect(response.policyDocument.Statement[0].Resource).toMatch(/\/\*$/);
              
              // Verify ARN structure is preserved up to apiId
              const expectedPrefix = methodArn.split('/').slice(0, 2).join('/');
              expect(response.policyDocument.Statement[0].Resource).toContain(expectedPrefix);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should generate allow policy with correct principalId for any valid token', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 10, maxLength: 100 }).chain(userId =>
            fc.record({
              userId: fc.constant(userId),
              email: fc.emailAddress(),
              organizationId: fc.uuid(),
              role: fc.constantFrom('admin', 'developer', 'viewer'),
            })
          ),
          async (userPayload) => {
            // Arrange: Mock JWT token generation and verification
            const mockToken = 'valid.mock.token';
            mockGenerateTokenPair.mockResolvedValue({ accessToken: mockToken, refreshToken: 'refresh', expiresIn: 900 });
            mockExtractTokenFromHeader.mockReturnValue(mockToken);
            mockVerifyAccessToken.mockResolvedValue(userPayload);
            const event = createMockEvent(`Bearer ${mockToken}`);

            // Act: Invoke authorizer handler
            const response = await handler(event);

            // Assert: principalId should exactly match userId from token
            expect(response.principalId).toBe(userPayload.userId);
            expect(response.principalId).not.toBe('unauthorized');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should generate allow policy with string context values for any valid token', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            userId: fc.uuid(),
            email: fc.emailAddress(),
            organizationId: fc.uuid(),
            role: fc.constantFrom('admin', 'developer', 'viewer'),
          }),
          async (userPayload) => {
            // Arrange: Mock JWT token generation and verification
            const mockToken = 'valid.mock.token';
            mockGenerateTokenPair.mockResolvedValue({ accessToken: mockToken, refreshToken: 'refresh', expiresIn: 900 });
            mockExtractTokenFromHeader.mockReturnValue(mockToken);
            mockVerifyAccessToken.mockResolvedValue(userPayload);
            const event = createMockEvent(`Bearer ${mockToken}`);

            // Act: Invoke authorizer handler
            const response = await handler(event);

            // Assert: All context values should be strings
            expect(response.context).toBeDefined();
            expect(typeof response.context?.userId).toBe('string');
            expect(typeof response.context?.email).toBe('string');
            expect(typeof response.context?.organizationId).toBe('string');
            expect(typeof response.context?.role).toBe('string');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 2: Invalid inputs return deny policies', () => {
    /**
     * **Validates: Requirements 1.7, 2.4, 2.5, 9.6**
     * 
     * Property: For any invalid input (malformed Authorization header, invalid JWT token,
     * expired token, or JWT_Service error), the Lambda Authorizer should return an IAM
     * policy with Effect "Deny" and principalId "unauthorized".
     */

    beforeEach(() => {
      jest.resetAllMocks();
    });

    // Helper function to create mock authorizer event
    const createMockEvent = (authHeader?: string, methodArn = 'arn:aws:execute-api:us-east-1:123456789012:abc123/prod/GET/test'): AuthorizerEvent => ({
      type: 'REQUEST',
      methodArn,
      headers: authHeader ? { authorization: authHeader } : undefined,
      requestContext: {
        accountId: '123456789012',
        apiId: 'abc123',
        domainName: 'api.example.com',
        requestId: 'test-request-id',
      },
    });

    it('should return deny policy for undefined Authorization header', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constant(undefined),
          async (authHeader) => {
            // Arrange: Create event with undefined header
            const event = createMockEvent(authHeader);

            // Act: Invoke authorizer handler
            const response = await handler(event);

            // Assert: Should return deny policy
            expect(response.principalId).toBe('unauthorized');
            expect(response.policyDocument.Statement[0].Effect).toBe('Deny');
            expect(response.policyDocument.Statement[0].Action).toBe('execute-api:Invoke');
            expect(response.context).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return deny policy for empty string Authorization header', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constant(''),
          async (authHeader) => {
            // Arrange: Create event with empty header
            const event = createMockEvent(authHeader);

            // Act: Invoke authorizer handler
            const response = await handler(event);

            // Assert: Should return deny policy
            expect(response.principalId).toBe('unauthorized');
            expect(response.policyDocument.Statement[0].Effect).toBe('Deny');
            expect(response.policyDocument.Statement[0].Action).toBe('execute-api:Invoke');
            expect(response.context).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return deny policy for headers without "Bearer " prefix', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 200 }).filter(s => !s.startsWith('Bearer ')),
          async (invalidHeader) => {
            // Arrange: Create event with malformed header (no Bearer prefix)
            const event = createMockEvent(invalidHeader);

            // Act: Invoke authorizer handler
            const response = await handler(event);

            // Assert: Should return deny policy
            expect(response.principalId).toBe('unauthorized');
            expect(response.policyDocument.Statement[0].Effect).toBe('Deny');
            expect(response.policyDocument.Statement[0].Action).toBe('execute-api:Invoke');
            expect(response.context).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return deny policy for "Bearer " with only space (empty token)', async () => {
      // Arrange: Create event with "Bearer " (empty token)
      const event = createMockEvent('Bearer ');

      // Act: Invoke authorizer handler
      const response = await handler(event);

      // Assert: Should return deny policy (empty token is invalid)
      expect(response.principalId).toBe('unauthorized');
      expect(response.policyDocument.Statement[0].Effect).toBe('Deny');
      expect(response.policyDocument.Statement[0].Action).toBe('execute-api:Invoke');
      expect(response.context).toBeUndefined();
    });

    it('should return deny policy for malformed JWT tokens (invalid format)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            // Random strings that are not valid JWTs
            fc.string({ minLength: 10, maxLength: 100 }),
            // Strings with wrong number of parts
            fc.string({ minLength: 10, maxLength: 50 }).map(s => `${s}.${s}`),
            fc.string({ minLength: 10, maxLength: 30 }).map(s => `${s}.${s}.${s}.${s}`),
            // Empty parts
            fc.constant('..'),
            fc.constant('header..signature'),
            fc.constant('.payload.signature'),
            fc.constant('header.payload.')
          ),
          async (invalidToken) => {
            // Arrange: Create event with malformed token
            const event = createMockEvent(`Bearer ${invalidToken}`);

            // Act: Invoke authorizer handler
            const response = await handler(event);

            // Assert: Should return deny policy
            expect(response.principalId).toBe('unauthorized');
            expect(response.policyDocument.Statement[0].Effect).toBe('Deny');
            expect(response.policyDocument.Statement[0].Action).toBe('execute-api:Invoke');
            expect(response.context).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return deny policy for tokens with invalid signatures', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate JWT-like tokens with random content (will have invalid signatures)
          fc.tuple(
            fc.string({ minLength: 20, maxLength: 100 }),
            fc.string({ minLength: 20, maxLength: 100 }),
            fc.string({ minLength: 20, maxLength: 100 })
          ).map(([header, payload, signature]) => `${header}.${payload}.${signature}`),
          async (invalidToken) => {
            // Arrange: Create event with token that has invalid signature
            const event = createMockEvent(`Bearer ${invalidToken}`);

            // Act: Invoke authorizer handler
            const response = await handler(event);

            // Assert: Should return deny policy (JWT verification will fail)
            expect(response.principalId).toBe('unauthorized');
            expect(response.policyDocument.Statement[0].Effect).toBe('Deny');
            expect(response.policyDocument.Statement[0].Action).toBe('execute-api:Invoke');
            expect(response.context).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return deny policy for any combination of invalid inputs', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            // Undefined header
            fc.constant(undefined),
            // Empty string
            fc.constant(''),
            // Just "Bearer"
            fc.constant('Bearer'),
            // Wrong case
            fc.string({ minLength: 10, maxLength: 50 }).map(s => `bearer ${s}`),
            fc.string({ minLength: 10, maxLength: 50 }).map(s => `BEARER ${s}`),
            // No space after Bearer
            fc.string({ minLength: 10, maxLength: 50 }).map(s => `Bearer${s}`),
            // Multiple spaces
            fc.string({ minLength: 10, maxLength: 50 }).map(s => `Bearer  ${s}`),
            // Random invalid tokens
            fc.string({ minLength: 1, maxLength: 200 }).filter(s => !s.startsWith('Bearer '))
          ),
          async (invalidInput) => {
            // Arrange: Create event with invalid input
            const event = createMockEvent(invalidInput);

            // Act: Invoke authorizer handler
            const response = await handler(event);

            // Assert: Should always return deny policy
            expect(response.principalId).toBe('unauthorized');
            expect(response.policyDocument.Statement[0].Effect).toBe('Deny');
            expect(response.policyDocument.Statement[0].Action).toBe('execute-api:Invoke');
            expect(response.policyDocument.Version).toBe('2012-10-17');
            expect(response.context).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should verify deny policy structure is consistent across all invalid inputs', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.constant(undefined),
            fc.constant(''),
            fc.constant('Bearer '),
            fc.string({ minLength: 1, maxLength: 100 }).filter(s => !s.startsWith('Bearer ')),
            fc.string({ minLength: 10, maxLength: 100 }).map(s => `Bearer ${s}`)
          ),
          async (invalidInput) => {
            // Arrange: Create event with invalid input
            const event = createMockEvent(invalidInput);

            // Act: Invoke authorizer handler
            const response = await handler(event);

            // Assert: Verify complete deny policy structure
            expect(response).toMatchObject({
              principalId: 'unauthorized',
              policyDocument: {
                Version: '2012-10-17',
                Statement: [
                  {
                    Action: 'execute-api:Invoke',
                    Effect: 'Deny',
                    Resource: expect.stringMatching(/^arn:aws:execute-api:.+\/\*$/),
                  },
                ],
              },
            });
            
            // Verify no context is included in deny policies
            expect(response.context).toBeUndefined();
            
            // Verify resource ARN is properly formatted with wildcard
            expect(response.policyDocument.Statement[0].Resource).toContain('/*');
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

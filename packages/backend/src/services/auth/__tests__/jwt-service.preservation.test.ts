/**
 * Property 2: Preservation - Authentication Flows Remain Unchanged
 * 
 * This test suite verifies that authentication operations that do NOT involve
 * token verification with uncached secrets continue to work correctly after the fix.
 * 
 * Testing approach: Property-based testing to generate many test cases across
 * various token payloads, user roles, and expiration scenarios.
 */

import * as fc from 'fast-check';
import { JWTService, JWTPayload } from '../jwt-service';
import jwt from 'jsonwebtoken';

describe('Property 2: Preservation - Authentication Flows Remain Unchanged', () => {
  let jwtService: JWTService;

  beforeEach(() => {
    // Set environment variable for JWT secret to avoid Secrets Manager calls
    process.env.JWT_SECRET = 'test-jwt-secret-for-preservation-tests';
    jwtService = new JWTService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Token Generation Preservation', () => {
    // Generator for JWT payload (without iat and exp)
    const jwtPayloadGenerator = fc.record({
      userId: fc.uuid(),
      email: fc.emailAddress(),
      organizationId: fc.uuid(),
      role: fc.constantFrom('admin', 'developer', 'viewer') as fc.Arbitrary<'admin' | 'developer' | 'viewer'>,
    });

    it('Property: generateTokenPair produces valid tokens with correct structure', async () => {
      await fc.assert(
        fc.asyncProperty(jwtPayloadGenerator, async (payload) => {
          // Act
          const tokenPair = await jwtService.generateTokenPair(payload);

          // Assert: Token pair has expected structure
          expect(tokenPair).toHaveProperty('accessToken');
          expect(tokenPair).toHaveProperty('refreshToken');
          expect(tokenPair).toHaveProperty('expiresIn');
          expect(typeof tokenPair.accessToken).toBe('string');
          expect(typeof tokenPair.refreshToken).toBe('string');
          expect(tokenPair.expiresIn).toBe(60 * 60); // 1 hour in seconds (updated for production SaaS)

          // Assert: Access token is valid JWT
          const decoded = jwt.decode(tokenPair.accessToken) as any;
          expect(decoded).toBeTruthy();
          expect(decoded.userId).toBe(payload.userId);
          expect(decoded.email).toBe(payload.email);
          expect(decoded.organizationId).toBe(payload.organizationId);
          expect(decoded.role).toBe(payload.role);
          expect(decoded.iss).toBe('misra-platform');
          expect(decoded.aud).toBe('misra-platform-users');

          // Assert: Refresh token is valid JWT
          const decodedRefresh = jwt.decode(tokenPair.refreshToken) as any;
          expect(decodedRefresh).toBeTruthy();
          expect(decodedRefresh.userId).toBe(payload.userId);
          expect(decodedRefresh.type).toBe('refresh');
          expect(decodedRefresh.iss).toBe('misra-platform');
          expect(decodedRefresh.aud).toBe('misra-platform-users');
        }),
        { numRuns: 50 } // Run 50 test cases
      );
    });

    it('Property: generated tokens have correct expiration times', async () => {
      await fc.assert(
        fc.asyncProperty(jwtPayloadGenerator, async (payload) => {
          // Act
          const beforeGeneration = Math.floor(Date.now() / 1000);
          const tokenPair = await jwtService.generateTokenPair(payload);
          const afterGeneration = Math.floor(Date.now() / 1000);

          // Assert: Access token expires in ~1 hour (updated for production SaaS)
          const decoded = jwt.decode(tokenPair.accessToken) as any;
          const accessTokenExpiry = decoded.exp;
          const expectedAccessExpiry = beforeGeneration + 60 * 60; // 1 hour
          
          // Allow 5 second tolerance for test execution time
          expect(accessTokenExpiry).toBeGreaterThanOrEqual(expectedAccessExpiry - 5);
          expect(accessTokenExpiry).toBeLessThanOrEqual(afterGeneration + 60 * 60 + 5); // 1 hour

          // Assert: Refresh token expires in ~7 days
          const decodedRefresh = jwt.decode(tokenPair.refreshToken) as any;
          const refreshTokenExpiry = decodedRefresh.exp;
          const expectedRefreshExpiry = beforeGeneration + 7 * 24 * 60 * 60;
          
          // Allow 5 second tolerance
          expect(refreshTokenExpiry).toBeGreaterThanOrEqual(expectedRefreshExpiry - 5);
          expect(refreshTokenExpiry).toBeLessThanOrEqual(afterGeneration + 7 * 24 * 60 * 60 + 5);
        }),
        { numRuns: 30 }
      );
    });
  });

  describe('Cached Token Verification Preservation', () => {
    const jwtPayloadGenerator = fc.record({
      userId: fc.uuid(),
      email: fc.emailAddress(),
      organizationId: fc.uuid(),
      role: fc.constantFrom('admin', 'developer', 'viewer') as fc.Arbitrary<'admin' | 'developer' | 'viewer'>,
    });

    it('Property: verifyAccessToken returns correct payload for valid tokens', async () => {
      await fc.assert(
        fc.asyncProperty(jwtPayloadGenerator, async (payload) => {
          // Arrange: Generate a valid token
          const tokenPair = await jwtService.generateTokenPair(payload);

          // Act: Verify the token
          const verified = await jwtService.verifyAccessToken(tokenPair.accessToken);

          // Assert: Verified payload matches original
          expect(verified.userId).toBe(payload.userId);
          expect(verified.email).toBe(payload.email);
          expect(verified.organizationId).toBe(payload.organizationId);
          expect(verified.role).toBe(payload.role);
          expect(verified.iat).toBeDefined();
          expect(verified.exp).toBeDefined();
        }),
        { numRuns: 50 }
      );
    });

    it('Property: verifyAccessToken completes within 2 seconds for cached secret', async () => {
      await fc.assert(
        fc.asyncProperty(jwtPayloadGenerator, async (payload) => {
          // Arrange: Generate a valid token
          const tokenPair = await jwtService.generateTokenPair(payload);

          // Act: Measure verification time
          const startTime = Date.now();
          await jwtService.verifyAccessToken(tokenPair.accessToken);
          const duration = Date.now() - startTime;

          // Assert: Verification completes within 2 seconds
          expect(duration).toBeLessThan(2000);
        }),
        { numRuns: 30 }
      );
    });
  });

  describe('Token Expiration Preservation', () => {
    it('Property: expired tokens return "Token expired" error', async () => {
      // Use a fixed payload for expired token testing
      const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
        userId: 'test-user-id',
        email: 'test@example.com',
        organizationId: 'test-org-id',
        role: 'developer',
      };

      // Generate an expired token (expires in 1 second)
      const secret = process.env.JWT_SECRET!;
      const expiredToken = jwt.sign(payload, secret, {
        expiresIn: '1s',
        issuer: 'misra-platform',
        audience: 'misra-platform-users',
      });

      // Wait for token to expire
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Act & Assert
      await expect(jwtService.verifyAccessToken(expiredToken)).rejects.toThrow('Token expired');
    });
  });

  describe('Invalid Token Preservation', () => {
    const invalidTokenGenerator = fc.oneof(
      fc.constant(''), // Empty string
      fc.constant('invalid-token'), // Not a JWT
      fc.constant('Bearer token'), // Contains Bearer prefix
      fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes('.')), // String without JWT structure
    );

    it('Property: malformed tokens return "Invalid token" error', async () => {
      await fc.assert(
        fc.asyncProperty(invalidTokenGenerator, async (invalidToken) => {
          // Act & Assert
          await expect(jwtService.verifyAccessToken(invalidToken)).rejects.toThrow();
        }),
        { numRuns: 20 }
      );
    });

    it('Property: tokens with wrong signature return "Invalid token" error', async () => {
      const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
        userId: 'test-user-id',
        email: 'test@example.com',
        organizationId: 'test-org-id',
        role: 'developer',
      };

      // Generate token with wrong secret
      const wrongSecret = 'wrong-secret-key';
      const tokenWithWrongSignature = jwt.sign(payload, wrongSecret, {
        expiresIn: '15m',
        issuer: 'misra-platform',
        audience: 'misra-platform-users',
      });

      // Act & Assert
      await expect(jwtService.verifyAccessToken(tokenWithWrongSignature)).rejects.toThrow('Invalid token');
    });
  });

  describe('Refresh Token Flow Preservation', () => {
    const jwtPayloadGenerator = fc.record({
      userId: fc.uuid(),
      email: fc.emailAddress(),
      organizationId: fc.uuid(),
      role: fc.constantFrom('admin', 'developer', 'viewer') as fc.Arbitrary<'admin' | 'developer' | 'viewer'>,
    });

    it('Property: refreshAccessToken generates new valid access token', async () => {
      await fc.assert(
        fc.asyncProperty(jwtPayloadGenerator, async (payload) => {
          // Arrange: Generate initial token pair
          const initialTokenPair = await jwtService.generateTokenPair(payload);

          // Wait 1 second to ensure different iat (issued at) timestamp
          await new Promise(resolve => setTimeout(resolve, 1000));

          // Act: Refresh the access token
          const refreshed = await jwtService.refreshAccessToken(
            initialTokenPair.refreshToken,
            payload
          );

          // Assert: New access token is valid
          expect(refreshed).toHaveProperty('accessToken');
          expect(refreshed).toHaveProperty('expiresIn');
          expect(typeof refreshed.accessToken).toBe('string');
          expect(refreshed.expiresIn).toBe(15 * 60);

          // Assert: New access token can be verified
          const verified = await jwtService.verifyAccessToken(refreshed.accessToken);
          expect(verified.userId).toBe(payload.userId);
          expect(verified.email).toBe(payload.email);
          expect(verified.organizationId).toBe(payload.organizationId);
          expect(verified.role).toBe(payload.role);

          // Assert: New access token is different from original
          expect(refreshed.accessToken).not.toBe(initialTokenPair.accessToken);
        }),
        { numRuns: 5 } // Reduced from 30 to 5 due to 1 second delay per run
      );
    }, 15000); // Increased timeout to 15 seconds (5 runs * 1 second + buffer)

    it('Property: expired refresh tokens are rejected', async () => {
      const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
        userId: 'test-user-id',
        email: 'test@example.com',
        organizationId: 'test-org-id',
        role: 'developer',
      };

      // Generate an expired refresh token
      const secret = process.env.JWT_SECRET!;
      const expiredRefreshToken = jwt.sign(
        { userId: payload.userId, type: 'refresh' },
        secret,
        {
          expiresIn: '1s',
          issuer: 'misra-platform',
          audience: 'misra-platform-users',
        }
      );

      // Wait for token to expire
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Act & Assert
      await expect(
        jwtService.refreshAccessToken(expiredRefreshToken, payload)
      ).rejects.toThrow('Refresh token expired');
    });

    it('Property: invalid refresh tokens are rejected', async () => {
      const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
        userId: 'test-user-id',
        email: 'test@example.com',
        organizationId: 'test-org-id',
        role: 'developer',
      };

      // Generate an access token (not a refresh token)
      const secret = process.env.JWT_SECRET!;
      const accessToken = jwt.sign(payload, secret, {
        expiresIn: '15m',
        issuer: 'misra-platform',
        audience: 'misra-platform-users',
      });

      // Act & Assert: Using access token as refresh token should fail
      await expect(
        jwtService.refreshAccessToken(accessToken, payload)
      ).rejects.toThrow('Invalid refresh token');
    });
  });

  describe('Token Extraction Preservation', () => {
    it('Property: extractTokenFromHeader correctly extracts Bearer tokens', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 10, maxLength: 500 }),
          (token) => {
            // Arrange
            const authHeader = `Bearer ${token}`;

            // Act
            const extracted = jwtService.extractTokenFromHeader(authHeader);

            // Assert
            expect(extracted).toBe(token);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('Property: extractTokenFromHeader returns null for invalid headers', () => {
      const invalidHeaderGenerator = fc.oneof(
        fc.constant(undefined),
        fc.constant(''),
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.startsWith('Bearer ')),
        fc.constant('Basic token123'), // Wrong auth type
      );

      fc.assert(
        fc.property(invalidHeaderGenerator, (invalidHeader) => {
          // Act
          const extracted = jwtService.extractTokenFromHeader(invalidHeader);

          // Assert
          expect(extracted).toBeNull();
        }),
        { numRuns: 30 }
      );
    });
  });

  describe('Cross-Instance Cache Preservation', () => {
    it('Property: module-level cache persists across JWTService instances', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            userId: fc.uuid(),
            email: fc.emailAddress(),
            organizationId: fc.uuid(),
            role: fc.constantFrom('admin', 'developer', 'viewer') as fc.Arbitrary<'admin' | 'developer' | 'viewer'>,
          }),
          async (payload) => {
            // Arrange: Create first instance and generate token
            const service1 = new JWTService();
            const tokenPair1 = await service1.generateTokenPair(payload);

            // Act: Create second instance and verify token
            const service2 = new JWTService();
            const verified = await service2.verifyAccessToken(tokenPair1.accessToken);

            // Assert: Token verified successfully using cached secret
            expect(verified.userId).toBe(payload.userId);
            expect(verified.email).toBe(payload.email);
            expect(verified.organizationId).toBe(payload.organizationId);
            expect(verified.role).toBe(payload.role);
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('Error Handling Preservation', () => {
    it('Property: tokens with wrong issuer are rejected', async () => {
      const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
        userId: 'test-user-id',
        email: 'test@example.com',
        organizationId: 'test-org-id',
        role: 'developer',
      };

      // Generate token with wrong issuer
      const secret = process.env.JWT_SECRET!;
      const tokenWithWrongIssuer = jwt.sign(payload, secret, {
        expiresIn: '15m',
        issuer: 'wrong-issuer',
        audience: 'misra-platform-users',
      });

      // Act & Assert
      await expect(jwtService.verifyAccessToken(tokenWithWrongIssuer)).rejects.toThrow('Invalid token');
    });

    it('Property: tokens with wrong audience are rejected', async () => {
      const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
        userId: 'test-user-id',
        email: 'test@example.com',
        organizationId: 'test-org-id',
        role: 'developer',
      };

      // Generate token with wrong audience
      const secret = process.env.JWT_SECRET!;
      const tokenWithWrongAudience = jwt.sign(payload, secret, {
        expiresIn: '15m',
        issuer: 'misra-platform',
        audience: 'wrong-audience',
      });

      // Act & Assert
      await expect(jwtService.verifyAccessToken(tokenWithWrongAudience)).rejects.toThrow('Invalid token');
    });
  });
});

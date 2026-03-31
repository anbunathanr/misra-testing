/**
 * Unit Tests for Authentication Utility Functions
 */

import { APIGatewayProxyEvent } from 'aws-lambda';
import { getUserFromContext, UserContext } from '../auth-util';

describe('getUserFromContext', () => {
  it('should extract user context from valid event', () => {
    const event = {
      requestContext: {
        authorizer: {
          userId: 'user-123',
          email: 'test@example.com',
          organizationId: 'org-456',
          role: 'developer',
        },
      },
    } as unknown as APIGatewayProxyEvent;

    const user = getUserFromContext(event);

    expect(user).toEqual({
      userId: 'user-123',
      email: 'test@example.com',
      organizationId: 'org-456',
      role: 'developer',
    });
  });

  it('should return all required fields', () => {
    const event = {
      requestContext: {
        authorizer: {
          userId: 'user-789',
          email: 'admin@example.com',
          organizationId: 'org-999',
          role: 'admin',
        },
      },
    } as unknown as APIGatewayProxyEvent;

    const user = getUserFromContext(event);

    expect(user).toHaveProperty('userId');
    expect(user).toHaveProperty('email');
    expect(user).toHaveProperty('organizationId');
    expect(user).toHaveProperty('role');
  });

  it('should handle missing authorizer context', () => {
    const event = {
      requestContext: {},
    } as unknown as APIGatewayProxyEvent;

    const user = getUserFromContext(event);

    expect(user).toEqual({
      userId: '',
      email: '',
      organizationId: '',
      role: '',
    });
  });

  it('should handle missing requestContext', () => {
    const event = {} as APIGatewayProxyEvent;

    const user = getUserFromContext(event);

    expect(user).toEqual({
      userId: '',
      email: '',
      organizationId: '',
      role: '',
    });
  });

  it('should handle partial authorizer context', () => {
    const event = {
      requestContext: {
        authorizer: {
          userId: 'user-456',
          email: 'partial@example.com',
          // Missing organizationId and role
        },
      },
    } as unknown as APIGatewayProxyEvent;

    const user = getUserFromContext(event);

    expect(user).toEqual({
      userId: 'user-456',
      email: 'partial@example.com',
      organizationId: '',
      role: '',
    });
  });

  it('should return correct TypeScript types', () => {
    const event = {
      requestContext: {
        authorizer: {
          userId: 'user-123',
          email: 'test@example.com',
          organizationId: 'org-456',
          role: 'viewer',
        },
      },
    } as unknown as APIGatewayProxyEvent;

    const user: UserContext = getUserFromContext(event);

    expect(typeof user.userId).toBe('string');
    expect(typeof user.email).toBe('string');
    expect(typeof user.organizationId).toBe('string');
    expect(typeof user.role).toBe('string');
  });

  it('should handle all valid role types', () => {
    const roles: Array<'admin' | 'developer' | 'viewer'> = ['admin', 'developer', 'viewer'];

    roles.forEach((role) => {
      const event = {
        requestContext: {
          authorizer: {
            userId: 'user-123',
            email: 'test@example.com',
            organizationId: 'org-456',
            role,
          },
        },
      } as unknown as APIGatewayProxyEvent;

      const user = getUserFromContext(event);

      expect(user.role).toBe(role);
    });
  });
});

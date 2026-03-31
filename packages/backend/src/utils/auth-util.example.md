# Authentication Utility Usage Examples

This document demonstrates how to use the `getUserFromContext` helper function to extract authenticated user information from API Gateway events.

## Overview

The `getUserFromContext` function extracts user information that was populated by the Lambda Authorizer after JWT token verification. This eliminates the need for individual Lambda functions to verify JWT tokens.

## Basic Usage

```typescript
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getUserFromContext } from '../../utils/auth-util';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  // Extract user context from the request
  const user = getUserFromContext(event);
  
  // Use user information in your business logic
  console.log('User ID:', user.userId);
  console.log('Email:', user.email);
  console.log('Organization:', user.organizationId);
  console.log('Role:', user.role);
  
  // Your business logic here
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify({ message: 'Success' }),
  };
};
```

## Before and After Comparison

### Before (with JWT verification in Lambda)

```typescript
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { JWTService } from '../../services/auth/jwt-service';

const jwtService = new JWTService();

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    // Extract and verify JWT token
    const authHeader = event.headers.Authorization || event.headers.authorization;
    if (!authHeader) {
      return {
        statusCode: 401,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Missing Authorization header' }),
      };
    }

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

    // Business logic using tokenPayload.userId
    const userId = tokenPayload.userId;
    // ... rest of business logic
    
  } catch (error) {
    // Error handling
  }
};
```

### After (with Lambda Authorizer and getUserFromContext)

```typescript
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getUserFromContext } from '../../utils/auth-util';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    // Extract user context (no JWT verification needed)
    const user = getUserFromContext(event);
    
    // Business logic using user.userId
    const userId = user.userId;
    // ... rest of business logic (unchanged)
    
  } catch (error) {
    // Error handling
  }
};
```

## Real-World Example: Create Project

### Before

```typescript
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ProjectService } from '../../services/project-service';
import { JWTService } from '../../services/auth/jwt-service';

const projectService = new ProjectService();
const jwtService = new JWTService();

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    // JWT verification (20+ lines of code)
    const authHeader = event.headers.Authorization || event.headers.authorization;
    if (!authHeader) {
      return {
        statusCode: 401,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Missing Authorization header' }),
      };
    }

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

    // Business logic
    const input = JSON.parse(event.body || '{}');
    const project = await projectService.createProject(tokenPayload.userId, input);

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
```

### After

```typescript
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ProjectService } from '../../services/project-service';
import { getUserFromContext } from '../../utils/auth-util';

const projectService = new ProjectService();

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    // Extract user context (1 line of code)
    const user = getUserFromContext(event);

    // Business logic (unchanged)
    const input = JSON.parse(event.body || '{}');
    const project = await projectService.createProject(user.userId, input);

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
```

## Benefits

1. **Simpler Code**: Reduces authentication code from 20+ lines to 1 line
2. **Better Performance**: JWT verification happens once at API Gateway, not in every Lambda
3. **Consistent Authentication**: All routes use the same authentication logic
4. **Easier Testing**: Mock request context instead of JWT tokens
5. **Reduced Latency**: Eliminates redundant Secrets Manager calls and JWT verification

## Error Handling

The `getUserFromContext` function handles missing context gracefully by returning empty strings:

```typescript
const user = getUserFromContext(event);

// If context is missing, all fields will be empty strings
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
```

However, in practice, this check is usually unnecessary because the Lambda Authorizer ensures that only authenticated requests reach your Lambda function. If the JWT token is invalid, the request is rejected at the API Gateway level before reaching your Lambda.

## TypeScript Types

The function returns a `UserContext` object with the following structure:

```typescript
interface UserContext {
  userId: string;
  email: string;
  organizationId: string;
  role: 'admin' | 'developer' | 'viewer' | '';
}
```

All fields are guaranteed to be strings (never undefined or null), making it safe to use without additional null checks.

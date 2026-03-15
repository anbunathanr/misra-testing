# Phase 2 Utilities - Quick Reference Guide

## Overview
This guide provides quick examples for using the new error handling and logging utilities created in Phase 2.

---

## 1. Logger Utility

### Basic Usage

```typescript
import { createLogger } from '../utils/logger';

// Create logger with context
const logger = createLogger('MyFunction');

// Log messages
logger.info('Processing request');
logger.warn('Rate limit approaching');
logger.error('Operation failed', error);
```

### With Metadata

```typescript
const logger = createLogger('ProjectService', { 
  userId: 'user-123',
  environment: 'production'
});

logger.info('Creating project', { 
  projectName: 'My Project',
  projectType: 'web'
});
```

### Child Loggers

```typescript
const parentLogger = createLogger('OrderService');
const childLogger = parentLogger.child('PaymentProcessor', { 
  paymentMethod: 'credit-card'
});

childLogger.info('Processing payment'); // Context: OrderService.PaymentProcessor
```

### Performance Timing

```typescript
const logger = createLogger('DatabaseService');

const endTimer = logger.time('Query execution');
const results = await db.query('SELECT * FROM users');
endTimer(); // Logs: "Query execution completed" with duration in ms
```

---

## 2. Error Classes

### NotFoundError (404)

```typescript
import { NotFoundError } from '../utils/app-error';

const project = await getProject(projectId);
if (!project) {
  throw new NotFoundError('Project', projectId);
}
// Response: { error: "Project with identifier 'proj-123' not found", code: "NOT_FOUND" }
```

### ValidationError (400)

```typescript
import { ValidationError } from '../utils/app-error';

if (!email || !email.includes('@')) {
  throw new ValidationError('Invalid email format', { 
    field: 'email',
    value: email 
  });
}
```

### AuthenticationError (401)

```typescript
import { AuthenticationError, ErrorCode } from '../utils/app-error';

if (!token) {
  throw new AuthenticationError('Missing authentication token', ErrorCode.MISSING_AUTH_HEADER);
}

if (isExpired(token)) {
  throw new AuthenticationError('Token has expired', ErrorCode.TOKEN_EXPIRED);
}
```

### AuthorizationError (403)

```typescript
import { AuthorizationError } from '../utils/app-error';

if (!hasPermission(user, 'projects:delete')) {
  throw new AuthorizationError('Insufficient permissions to delete project');
}
```

### RateLimitError (429)

```typescript
import { RateLimitError } from '../utils/app-error';

if (requestCount > dailyLimit) {
  throw new RateLimitError('Daily API limit exceeded', 3600); // retryAfter in seconds
}
```

### DatabaseError (500)

```typescript
import { DatabaseError } from '../utils/app-error';

try {
  await db.put(item);
} catch (err) {
  throw new DatabaseError('Failed to save project', 'DynamoDB.PutItem');
}
```

### ExternalServiceError (503)

```typescript
import { ExternalServiceError } from '../utils/app-error';

try {
  await openai.createCompletion(...);
} catch (err) {
  throw new ExternalServiceError('OpenAI', 'API request failed');
}
```

### BusinessRuleError (422)

```typescript
import { BusinessRuleError } from '../utils/app-error';

if (project.testCases.length > 1000) {
  throw new BusinessRuleError(
    'Project cannot have more than 1000 test cases',
    'MAX_TEST_CASES_EXCEEDED'
  );
}
```

---

## 3. Error Handler

### Basic Lambda Handler

```typescript
import { handleError } from '../utils/error-handler';
import { createLogger } from '../utils/logger';
import { NotFoundError } from '../utils/app-error';

const logger = createLogger('GetProject');

export const handler = async (event) => {
  try {
    const projectId = event.pathParameters?.projectId;
    
    const project = await getProject(projectId);
    if (!project) {
      throw new NotFoundError('Project', projectId);
    }
    
    logger.info('Project retrieved successfully', { projectId });
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(project),
    };
  } catch (error) {
    return handleError(error, logger);
  }
};
```

### Using Assertions

```typescript
import { assert, assertExists, handleError } from '../utils/error-handler';
import { createLogger } from '../utils/logger';

const logger = createLogger('CreateProject');

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body || '{}');
    
    // Assert conditions
    assert(body.name, 'Project name is required');
    assert(body.name.length >= 3, 'Project name must be at least 3 characters');
    assert(body.name.length <= 100, 'Project name must be less than 100 characters');
    
    // Assert existence
    const user = await getUser(body.userId);
    assertExists(user, 'User not found');
    
    const project = await createProject(body);
    
    return {
      statusCode: 201,
      body: JSON.stringify(project),
    };
  } catch (error) {
    return handleError(error, logger);
  }
};
```

### With Error Handler Wrapper

```typescript
import { withErrorHandler } from '../utils/error-handler';
import { createLogger } from '../utils/logger';

const logger = createLogger('UpdateProject');

const handlerLogic = async (event) => {
  const projectId = event.pathParameters?.projectId;
  const updates = JSON.parse(event.body || '{}');
  
  const project = await updateProject(projectId, updates);
  
  return {
    statusCode: 200,
    body: JSON.stringify(project),
  };
};

export const handler = withErrorHandler(handlerLogic, logger);
```

---

## 4. Complete Example: CRUD Lambda Function

```typescript
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { createLogger } from '../utils/logger';
import { handleError, assert, assertExists } from '../utils/error-handler';
import { 
  NotFoundError, 
  ValidationError, 
  ConflictError 
} from '../utils/app-error';
import { withAuthAndPermission } from '../middleware/auth-middleware';

const logger = createLogger('ProjectCRUD');

// CREATE
export const createHandler = withAuthAndPermission(
  'projects',
  'write',
  async (event, authContext): Promise<APIGatewayProxyResult> => {
    try {
      const body = JSON.parse(event.body || '{}');
      
      // Validation
      assert(body.name, 'Project name is required');
      assert(body.name.length >= 3, 'Project name must be at least 3 characters');
      
      // Check for duplicates
      const existing = await findProjectByName(body.name, authContext.userId);
      if (existing) {
        throw new ConflictError('Project with this name already exists');
      }
      
      // Create project
      const project = await createProject({
        ...body,
        userId: authContext.userId,
        organizationId: authContext.organizationId,
      });
      
      logger.info('Project created', { 
        projectId: project.id,
        userId: authContext.userId 
      });
      
      return {
        statusCode: 201,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify(project),
      };
    } catch (error) {
      return handleError(error, logger);
    }
  }
);

// READ
export const getHandler = withAuthAndPermission(
  'projects',
  'read',
  async (event, authContext): Promise<APIGatewayProxyResult> => {
    try {
      const projectId = event.pathParameters?.projectId;
      assert(projectId, 'Project ID is required');
      
      const endTimer = logger.time('Get project from database');
      const project = await getProject(projectId);
      endTimer();
      
      assertExists(project, 'Project not found');
      
      // Verify ownership
      if (project.userId !== authContext.userId) {
        throw new AuthorizationError('Access denied to this project');
      }
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify(project),
      };
    } catch (error) {
      return handleError(error, logger);
    }
  }
);

// UPDATE
export const updateHandler = withAuthAndPermission(
  'projects',
  'write',
  async (event, authContext): Promise<APIGatewayProxyResult> => {
    try {
      const projectId = event.pathParameters?.projectId;
      const updates = JSON.parse(event.body || '{}');
      
      assert(projectId, 'Project ID is required');
      
      // Get existing project
      const project = await getProject(projectId);
      assertExists(project, 'Project not found');
      
      // Verify ownership
      if (project.userId !== authContext.userId) {
        throw new AuthorizationError('Access denied to this project');
      }
      
      // Update project
      const updated = await updateProject(projectId, updates);
      
      logger.info('Project updated', { 
        projectId,
        userId: authContext.userId,
        fields: Object.keys(updates)
      });
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify(updated),
      };
    } catch (error) {
      return handleError(error, logger);
    }
  }
);

// DELETE
export const deleteHandler = withAuthAndPermission(
  'projects',
  'delete',
  async (event, authContext): Promise<APIGatewayProxyResult> => {
    try {
      const projectId = event.pathParameters?.projectId;
      assert(projectId, 'Project ID is required');
      
      // Get existing project
      const project = await getProject(projectId);
      assertExists(project, 'Project not found');
      
      // Verify ownership
      if (project.userId !== authContext.userId) {
        throw new AuthorizationError('Access denied to this project');
      }
      
      // Delete project
      await deleteProject(projectId);
      
      logger.info('Project deleted', { 
        projectId,
        userId: authContext.userId 
      });
      
      return {
        statusCode: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
        body: '',
      };
    } catch (error) {
      return handleError(error, logger);
    }
  }
);
```

---

## 5. CloudWatch Insights Queries

### Find All Errors
```
fields @timestamp, level, context, message, error.message
| filter level = "ERROR"
| sort @timestamp desc
| limit 100
```

### Errors by Context
```
fields @timestamp, context, message, error.message
| filter level = "ERROR"
| stats count() by context
| sort count desc
```

### Performance Monitoring
```
fields @timestamp, context, message, metadata.duration
| filter message like /completed/
| stats avg(metadata.duration), max(metadata.duration), min(metadata.duration) by context
```

### Authentication Failures
```
fields @timestamp, userId, message, error.code
| filter error.code = "UNAUTHORIZED" or error.code = "FORBIDDEN"
| sort @timestamp desc
```

### Rate Limit Hits
```
fields @timestamp, userId, message
| filter error.code = "RATE_LIMIT_EXCEEDED"
| stats count() by userId
| sort count desc
```

---

## 6. Best Practices

### DO ✅
- Use specific error types (NotFoundError, ValidationError, etc.)
- Include metadata in errors for debugging
- Log at appropriate levels (info for success, warn for issues, error for failures)
- Use assertions for input validation
- Include request IDs in error responses
- Sanitize error messages before returning to users
- Use child loggers for nested operations
- Time performance-critical operations

### DON'T ❌
- Don't log sensitive data (passwords, tokens, API keys)
- Don't use console.log directly (use logger instead)
- Don't return raw error messages to users
- Don't throw generic Error objects (use AppError subclasses)
- Don't forget to handle errors in Lambda handlers
- Don't skip error logging
- Don't expose internal implementation details in error messages

---

## 7. Migration Guide

### Before (Old Code)
```typescript
export const handler = async (event) => {
  console.log('Processing request');
  
  const projectId = event.pathParameters?.projectId;
  if (!projectId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing project ID' }),
    };
  }
  
  try {
    const project = await getProject(projectId);
    if (!project) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Not found' }),
      };
    }
    
    return {
      statusCode: 200,
      body: JSON.stringify(project),
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal error' }),
    };
  }
};
```

### After (New Code)
```typescript
import { createLogger } from '../utils/logger';
import { handleError, assert, assertExists } from '../utils/error-handler';

const logger = createLogger('GetProject');

export const handler = async (event) => {
  try {
    logger.info('Processing get project request');
    
    const projectId = event.pathParameters?.projectId;
    assert(projectId, 'Project ID is required');
    
    const project = await getProject(projectId);
    assertExists(project, 'Project not found');
    
    logger.info('Project retrieved successfully', { projectId });
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(project),
    };
  } catch (error) {
    return handleError(error, logger);
  }
};
```

---

## Summary

The Phase 2 utilities provide:
- ✅ Structured logging for CloudWatch Insights
- ✅ Type-safe error handling with proper HTTP status codes
- ✅ Centralized error handling and sanitization
- ✅ Request ID tracking across services
- ✅ Performance monitoring with timing utilities
- ✅ Authentication middleware integration
- ✅ Production-ready error responses

Use these utilities consistently across all Lambda functions for better observability, debugging, and user experience.

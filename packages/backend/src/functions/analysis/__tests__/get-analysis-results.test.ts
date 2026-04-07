/**
 * Tests for GET /analysis/results/:fileId endpoint
 * 
 * Requirements: 16.2
 * Tests:
 * - Successful retrieval
 * - 404 for missing analysis
 * - 403 for unauthorized access
 */

import { APIGatewayProxyEvent } from 'aws-lambda';
import { DynamoDBClient, QueryCommand, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import { handler } from '../get-analysis-results';
import { mockClient } from 'aws-sdk-client-mock';

const dynamoMock = mockClient(DynamoDBClient);

describe('GET /analysis/results/:fileId', () => {
  beforeEach(() => {
    dynamoMock.reset();
    process.env.ANALYSIS_RESULTS_TABLE = 'AnalysisResults-test';
    process.env.FILE_METADATA_TABLE = 'FileMetadata-test';
    process.env.AWS_REGION = 'us-east-1';
  });

  const createMockEvent = (
    fileId: string,
    userId: string = 'user-123',
    organizationId: string = 'org-123',
    role: string = 'developer'
  ): APIGatewayProxyEvent => {
    return {
      pathParameters: { fileId },
      requestContext: {
        authorizer: {
          userId,
          email: 'test@example.com',
          organizationId,
          role,
        },
      },
    } as any;
  };

  const mockFileMetadata = {
    file_id: 'file-123',
    user_id: 'user-123',
    organization_id: 'org-123',
    filename: 'test.cpp',
    file_type: 'cpp',
    analysis_status: 'completed',
  };

  const mockAnalysisResult = {
    analysisId: 'analysis-123',
    fileId: 'file-123',
    userId: 'user-123',
    organizationId: 'org-123',
    language: 'CPP',
    violations: [
      {
        ruleId: 'MISRA-CPP-0-1-1',
        description: 'All code shall conform to ISO/IEC 14882:2003',
        severity: 'mandatory',
        lineNumber: 10,
        columnNumber: 5,
        message: 'Non-standard extension detected',
        codeSnippet: 'typeof(int) x = 5;',
      },
    ],
    summary: {
      totalViolations: 1,
      violationsBySeverity: {
        mandatory: 1,
        required: 0,
        advisory: 0,
      },
      compliancePercentage: 99.5,
      rulesChecked: 200,
    },
    status: 'completed',
    createdAt: 1234567890,
    timestamp: 1234567890,
  };

  describe('Successful retrieval (Requirement 16.2)', () => {
    it('should return analysis results for valid fileId', async () => {
      // Mock file metadata lookup
      dynamoMock.on(GetItemCommand).resolves({
        Item: marshall(mockFileMetadata),
      });

      // Mock analysis results query
      dynamoMock.on(QueryCommand).resolves({
        Items: [marshall(mockAnalysisResult)],
      });

      const event = createMockEvent('file-123');
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      
      const body = JSON.parse(result.body);
      expect(body.analysisId).toBe('analysis-123');
      expect(body.fileId).toBe('file-123');
      expect(body.language).toBe('CPP');
      expect(body.violations).toHaveLength(1);
      expect(body.violations[0].ruleId).toBe('MISRA-CPP-0-1-1');
      expect(body.summary.compliancePercentage).toBe(99.5);
      expect(body.summary.totalViolations).toBe(1);
      expect(body.metadata).toBeDefined();
      expect(body.metadata.analysisId).toBe('analysis-123');
    });

    it('should return violations with all required details (Requirement 7.3)', async () => {
      dynamoMock.on(GetItemCommand).resolves({
        Item: marshall(mockFileMetadata),
      });

      dynamoMock.on(QueryCommand).resolves({
        Items: [marshall(mockAnalysisResult)],
      });

      const event = createMockEvent('file-123');
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      
      const body = JSON.parse(result.body);
      const violation = body.violations[0];
      
      expect(violation).toHaveProperty('ruleId');
      expect(violation).toHaveProperty('description');
      expect(violation).toHaveProperty('severity');
      expect(violation).toHaveProperty('lineNumber');
      expect(violation).toHaveProperty('columnNumber');
      expect(violation).toHaveProperty('message');
      expect(violation).toHaveProperty('codeSnippet');
    });

    it('should include compliance percentage (Requirement 7.4)', async () => {
      dynamoMock.on(GetItemCommand).resolves({
        Item: marshall(mockFileMetadata),
      });

      dynamoMock.on(QueryCommand).resolves({
        Items: [marshall(mockAnalysisResult)],
      });

      const event = createMockEvent('file-123');
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      
      const body = JSON.parse(result.body);
      expect(body.summary).toHaveProperty('compliancePercentage');
      expect(typeof body.summary.compliancePercentage).toBe('number');
      expect(body.summary.compliancePercentage).toBe(99.5);
    });

    it('should include analysis metadata (Requirement 7.5)', async () => {
      dynamoMock.on(GetItemCommand).resolves({
        Item: marshall(mockFileMetadata),
      });

      dynamoMock.on(QueryCommand).resolves({
        Items: [marshall(mockAnalysisResult)],
      });

      const event = createMockEvent('file-123');
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      
      const body = JSON.parse(result.body);
      expect(body.metadata).toBeDefined();
      expect(body.metadata).toHaveProperty('analysisId');
      expect(body.metadata).toHaveProperty('timestamp');
      expect(body.metadata).toHaveProperty('createdAt');
      expect(body.metadata).toHaveProperty('userId');
      expect(body.metadata).toHaveProperty('organizationId');
    });

    it('should allow admin to access files in their organization', async () => {
      const fileMetadata = {
        ...mockFileMetadata,
        user_id: 'other-user-456', // Different user
        organization_id: 'org-123', // Same organization
      };

      dynamoMock.on(GetItemCommand).resolves({
        Item: marshall(fileMetadata),
      });

      dynamoMock.on(QueryCommand).resolves({
        Items: [marshall(mockAnalysisResult)],
      });

      const event = createMockEvent('file-123', 'admin-789', 'org-123', 'admin');
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      
      const body = JSON.parse(result.body);
      expect(body.analysisId).toBe('analysis-123');
    });

    it('should return most recent analysis when multiple exist', async () => {
      const olderResult = {
        ...mockAnalysisResult,
        analysisId: 'analysis-old',
        timestamp: 1234567800,
      };

      const newerResult = {
        ...mockAnalysisResult,
        analysisId: 'analysis-new',
        timestamp: 1234567900,
      };

      dynamoMock.on(GetItemCommand).resolves({
        Item: marshall(mockFileMetadata),
      });

      // DynamoDB returns in descending order (newest first)
      dynamoMock.on(QueryCommand).resolves({
        Items: [marshall(newerResult), marshall(olderResult)],
      });

      const event = createMockEvent('file-123');
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      
      const body = JSON.parse(result.body);
      expect(body.analysisId).toBe('analysis-new');
    });
  });

  describe('404 for missing analysis (Requirement 16.2, 7.6)', () => {
    it('should return 404 when file does not exist', async () => {
      dynamoMock.on(GetItemCommand).resolves({
        Item: undefined,
      });

      const event = createMockEvent('nonexistent-file');
      const result = await handler(event);

      expect(result.statusCode).toBe(404);
      
      const body = JSON.parse(result.body);
      expect(body.error.code).toBe('FILE_NOT_FOUND');
      expect(body.error.message).toBe('File not found');
    });

    it('should return 404 when analysis does not exist', async () => {
      dynamoMock.on(GetItemCommand).resolves({
        Item: marshall(mockFileMetadata),
      });

      dynamoMock.on(QueryCommand).resolves({
        Items: [],
      });

      const event = createMockEvent('file-123');
      const result = await handler(event);

      expect(result.statusCode).toBe(404);
      
      const body = JSON.parse(result.body);
      expect(body.error.code).toBe('ANALYSIS_NOT_FOUND');
      expect(body.error.message).toBe('No analysis results found for this file');
    });

    it('should return 404 when analysis results are null', async () => {
      dynamoMock.on(GetItemCommand).resolves({
        Item: marshall(mockFileMetadata),
      });

      dynamoMock.on(QueryCommand).resolves({
        Items: undefined,
      });

      const event = createMockEvent('file-123');
      const result = await handler(event);

      expect(result.statusCode).toBe(404);
      
      const body = JSON.parse(result.body);
      expect(body.error.code).toBe('ANALYSIS_NOT_FOUND');
    });
  });

  describe('403 for unauthorized access (Requirement 16.2, 7.7)', () => {
    it('should return 403 when user does not own the file', async () => {
      const fileMetadata = {
        ...mockFileMetadata,
        user_id: 'other-user-456',
        organization_id: 'org-123',
      };

      dynamoMock.on(GetItemCommand).resolves({
        Item: marshall(fileMetadata),
      });

      const event = createMockEvent('file-123', 'user-123', 'org-123', 'developer');
      const result = await handler(event);

      expect(result.statusCode).toBe(403);
      
      const body = JSON.parse(result.body);
      expect(body.error.code).toBe('FORBIDDEN');
      expect(body.error.message).toBe('You do not have permission to access this file');
    });

    it('should return 403 when admin tries to access file from different organization', async () => {
      const fileMetadata = {
        ...mockFileMetadata,
        user_id: 'other-user-456',
        organization_id: 'other-org-999',
      };

      dynamoMock.on(GetItemCommand).resolves({
        Item: marshall(fileMetadata),
      });

      const event = createMockEvent('file-123', 'admin-789', 'org-123', 'admin');
      const result = await handler(event);

      expect(result.statusCode).toBe(403);
      
      const body = JSON.parse(result.body);
      expect(body.error.code).toBe('FORBIDDEN');
    });

    it('should return 401 when user is not authenticated', async () => {
      const event = {
        pathParameters: { fileId: 'file-123' },
        requestContext: {
          authorizer: {},
        },
      } as any;

      const result = await handler(event);

      expect(result.statusCode).toBe(401);
      
      const body = JSON.parse(result.body);
      expect(body.error.code).toBe('UNAUTHORIZED');
      expect(body.error.message).toBe('Authentication required');
    });
  });

  describe('Error handling', () => {
    it('should return 400 when fileId is missing', async () => {
      const event = {
        pathParameters: {},
        requestContext: {
          authorizer: {
            userId: 'user-123',
            email: 'test@example.com',
            organizationId: 'org-123',
            role: 'developer',
          },
        },
      } as any;

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      
      const body = JSON.parse(result.body);
      expect(body.error.code).toBe('INVALID_REQUEST');
      expect(body.error.message).toBe('fileId parameter is required');
    });

    it('should return 500 when DynamoDB query fails', async () => {
      dynamoMock.on(GetItemCommand).rejects(new Error('DynamoDB error'));

      const event = createMockEvent('file-123');
      const result = await handler(event);

      expect(result.statusCode).toBe(500);
      
      const body = JSON.parse(result.body);
      expect(body.error.code).toBe('INTERNAL_SERVER_ERROR');
      expect(body.error.message).toBe('Failed to retrieve analysis results');
    });

    it('should handle empty violations array', async () => {
      const resultWithNoViolations = {
        ...mockAnalysisResult,
        violations: [],
        summary: {
          totalViolations: 0,
          violationsBySeverity: {
            mandatory: 0,
            required: 0,
            advisory: 0,
          },
          compliancePercentage: 100,
          rulesChecked: 200,
        },
      };

      dynamoMock.on(GetItemCommand).resolves({
        Item: marshall(mockFileMetadata),
      });

      dynamoMock.on(QueryCommand).resolves({
        Items: [marshall(resultWithNoViolations)],
      });

      const event = createMockEvent('file-123');
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      
      const body = JSON.parse(result.body);
      expect(body.violations).toEqual([]);
      expect(body.summary.totalViolations).toBe(0);
      expect(body.summary.compliancePercentage).toBe(100);
    });
  });

  describe('CORS headers', () => {
    it('should include CORS headers in successful response', async () => {
      dynamoMock.on(GetItemCommand).resolves({
        Item: marshall(mockFileMetadata),
      });

      dynamoMock.on(QueryCommand).resolves({
        Items: [marshall(mockAnalysisResult)],
      });

      const event = createMockEvent('file-123');
      const result = await handler(event);

      expect(result.headers).toHaveProperty('Access-Control-Allow-Origin', '*');
      expect(result.headers).toHaveProperty('Content-Type', 'application/json');
    });

    it('should include CORS headers in error response', async () => {
      dynamoMock.on(GetItemCommand).resolves({
        Item: undefined,
      });

      const event = createMockEvent('nonexistent-file');
      const result = await handler(event);

      expect(result.headers).toHaveProperty('Access-Control-Allow-Origin', '*');
      expect(result.headers).toHaveProperty('Content-Type', 'application/json');
    });
  });
});

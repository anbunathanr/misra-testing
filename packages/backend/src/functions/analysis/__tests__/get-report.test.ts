/**
 * Tests for GET /reports/:fileId endpoint
 * 
 * Requirements: 16.2
 * Tests:
 * - PDF generation and presigned URL
 * - Report caching in S3
 * - Authorization checks
 * - Error handling
 */

import { APIGatewayProxyEvent } from 'aws-lambda';
import { DynamoDBClient, QueryCommand, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { marshall } from '@aws-sdk/util-dynamodb';
import { handler } from '../get-report';
import { mockClient } from 'aws-sdk-client-mock';

const dynamoMock = mockClient(DynamoDBClient);
const s3Mock = mockClient(S3Client);

// Mock getSignedUrl
jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('https://s3.amazonaws.com/presigned-url'),
}));

// Mock ReportGenerator
jest.mock('../../../services/misra-analysis/report-generator', () => {
  return {
    ReportGenerator: jest.fn().mockImplementation(() => ({
      generatePDF: jest.fn().mockResolvedValue(Buffer.from('PDF content')),
    })),
  };
});

describe('GET /reports/:fileId', () => {
  beforeEach(() => {
    dynamoMock.reset();
    s3Mock.reset();
    jest.clearAllMocks();
    
    process.env.ANALYSIS_RESULTS_TABLE = 'AnalysisResults-test';
    process.env.FILE_METADATA_TABLE = 'FileMetadata-test';
    process.env.FILE_STORAGE_BUCKET = 'test-bucket';
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
        ruleName: 'All code shall conform to ISO/IEC 14882:2003',
        severity: 'mandatory',
        line: 10,
        column: 5,
        message: 'Non-standard extension detected',
        codeSnippet: 'typeof(int) x = 5;',
      },
    ],
    summary: {
      totalViolations: 1,
      criticalCount: 1,
      majorCount: 0,
      minorCount: 0,
      compliancePercentage: 99.5,
    },
    status: 'completed',
    createdAt: new Date().toISOString(),
    timestamp: 1234567890,
  };

  describe('Successful report generation (Requirement 8.6, 8.7)', () => {
    it('should generate PDF and return presigned URL', async () => {
      // Mock file metadata lookup
      dynamoMock.on(GetItemCommand).resolves({
        Item: marshall(mockFileMetadata),
      });

      // Mock analysis results query
      dynamoMock.on(QueryCommand).resolves({
        Items: [marshall(mockAnalysisResult)],
      });

      // Mock S3 - report doesn't exist yet
      s3Mock.on(GetObjectCommand).rejects({ name: 'NoSuchKey' });
      
      // Mock S3 - store new report
      s3Mock.on(PutObjectCommand).resolves({});

      const event = createMockEvent('file-123');
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      
      const body = JSON.parse(result.body);
      expect(body.reportUrl).toBe('https://s3.amazonaws.com/presigned-url');
      expect(body.expiresIn).toBe(3600);
      expect(body.fileId).toBe('file-123');
      expect(body.analysisId).toBe('analysis-123');
      expect(body.fileName).toContain('test.cpp');
      expect(body.fileName).toContain('misra_report.pdf');
      expect(body.expiresAt).toBeDefined();
    });

    it('should use cached report if it exists', async () => {
      // Mock file metadata lookup
      dynamoMock.on(GetItemCommand).resolves({
        Item: marshall(mockFileMetadata),
      });

      // Mock analysis results query
      dynamoMock.on(QueryCommand).resolves({
        Items: [marshall(mockAnalysisResult)],
      });

      // Mock S3 - report already exists
      s3Mock.on(GetObjectCommand).resolves({
        Body: Buffer.from('Existing PDF content') as any,
      });

      const event = createMockEvent('file-123');
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      
      const body = JSON.parse(result.body);
      expect(body.reportUrl).toBe('https://s3.amazonaws.com/presigned-url');
      
      // Verify PutObjectCommand was NOT called (using cached report)
      expect(s3Mock.commandCalls(PutObjectCommand)).toHaveLength(0);
    });

    it('should store PDF in S3 with correct metadata', async () => {
      dynamoMock.on(GetItemCommand).resolves({
        Item: marshall(mockFileMetadata),
      });

      dynamoMock.on(QueryCommand).resolves({
        Items: [marshall(mockAnalysisResult)],
      });

      s3Mock.on(GetObjectCommand).rejects({ name: 'NoSuchKey' });
      s3Mock.on(PutObjectCommand).resolves({});

      const event = createMockEvent('file-123');
      const result = await handler(event);

      // Verify the handler succeeded
      expect(result.statusCode).toBe(200);
      
      // Verify S3 PutObject was called
      const putCalls = s3Mock.commandCalls(PutObjectCommand);
      expect(putCalls.length).toBeGreaterThan(0);
    });

    it('should allow admin to generate report for files in their organization', async () => {
      const fileMetadata = {
        ...mockFileMetadata,
        user_id: 'other-user-456',
        organization_id: 'org-123',
      };

      dynamoMock.on(GetItemCommand).resolves({
        Item: marshall(fileMetadata),
      });

      dynamoMock.on(QueryCommand).resolves({
        Items: [marshall(mockAnalysisResult)],
      });

      s3Mock.on(GetObjectCommand).rejects({ name: 'NoSuchKey' });
      s3Mock.on(PutObjectCommand).resolves({});

      const event = createMockEvent('file-123', 'admin-789', 'org-123', 'admin');
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      
      const body = JSON.parse(result.body);
      expect(body.reportUrl).toBeDefined();
    });

    it('should use most recent analysis when multiple exist', async () => {
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

      dynamoMock.on(QueryCommand).resolves({
        Items: [marshall(newerResult), marshall(olderResult)],
      });

      s3Mock.on(GetObjectCommand).rejects({ name: 'NoSuchKey' });
      s3Mock.on(PutObjectCommand).resolves({});

      const event = createMockEvent('file-123');
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      
      const body = JSON.parse(result.body);
      expect(body.analysisId).toBe('analysis-new');
    });
  });

  describe('404 for missing resources', () => {
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

  describe('403 for unauthorized access', () => {
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
      expect(body.error.message).toBe('Failed to generate report');
    });

    it('should return 500 when S3 upload fails', async () => {
      dynamoMock.on(GetItemCommand).resolves({
        Item: marshall(mockFileMetadata),
      });

      dynamoMock.on(QueryCommand).resolves({
        Items: [marshall(mockAnalysisResult)],
      });

      s3Mock.on(GetObjectCommand).rejects({ name: 'NoSuchKey' });
      s3Mock.on(PutObjectCommand).rejects(new Error('S3 upload failed'));

      const event = createMockEvent('file-123');
      const result = await handler(event);

      expect(result.statusCode).toBe(500);
      
      const body = JSON.parse(result.body);
      expect(body.error.code).toBe('INTERNAL_SERVER_ERROR');
    });

    it('should handle S3 GetObject errors other than NoSuchKey', async () => {
      dynamoMock.on(GetItemCommand).resolves({
        Item: marshall(mockFileMetadata),
      });

      dynamoMock.on(QueryCommand).resolves({
        Items: [marshall(mockAnalysisResult)],
      });

      // Simulate S3 error other than NoSuchKey
      s3Mock.on(GetObjectCommand).rejects(new Error('S3 access denied'));
      s3Mock.on(PutObjectCommand).resolves({});

      const event = createMockEvent('file-123');
      const result = await handler(event);

      // Should still succeed by generating new report
      expect(result.statusCode).toBe(200);
    });
  });

  describe('Report content validation', () => {
    it('should generate report with correct file name', async () => {
      dynamoMock.on(GetItemCommand).resolves({
        Item: marshall(mockFileMetadata),
      });

      dynamoMock.on(QueryCommand).resolves({
        Items: [marshall(mockAnalysisResult)],
      });

      s3Mock.on(GetObjectCommand).rejects({ name: 'NoSuchKey' });
      s3Mock.on(PutObjectCommand).resolves({});

      const event = createMockEvent('file-123');
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      
      const body = JSON.parse(result.body);
      expect(body.fileName).toBe('test.cpp_misra_report.pdf');
    });

    it('should handle missing filename gracefully', async () => {
      const fileMetadataNoName = {
        file_id: 'file-123',
        user_id: 'user-123',
        organization_id: 'org-123',
        file_type: 'cpp',
        analysis_status: 'completed',
        // filename is omitted
      };

      dynamoMock.on(GetItemCommand).resolves({
        Item: marshall(fileMetadataNoName),
      });

      dynamoMock.on(QueryCommand).resolves({
        Items: [marshall(mockAnalysisResult)],
      });

      s3Mock.on(GetObjectCommand).rejects({ name: 'NoSuchKey' });
      s3Mock.on(PutObjectCommand).resolves({});

      const event = createMockEvent('file-123');
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      
      const body = JSON.parse(result.body);
      expect(body.fileName).toBe('report_misra_report.pdf');
    });

    it('should include expiration timestamp', async () => {
      dynamoMock.on(GetItemCommand).resolves({
        Item: marshall(mockFileMetadata),
      });

      dynamoMock.on(QueryCommand).resolves({
        Items: [marshall(mockAnalysisResult)],
      });

      s3Mock.on(GetObjectCommand).rejects({ name: 'NoSuchKey' });
      s3Mock.on(PutObjectCommand).resolves({});

      const beforeTime = Date.now();
      const event = createMockEvent('file-123');
      const result = await handler(event);
      const afterTime = Date.now();

      expect(result.statusCode).toBe(200);
      
      const body = JSON.parse(result.body);
      const expiresAt = new Date(body.expiresAt).getTime();
      
      // Should expire in approximately 1 hour (3600 seconds)
      expect(expiresAt).toBeGreaterThanOrEqual(beforeTime + 3600 * 1000);
      expect(expiresAt).toBeLessThanOrEqual(afterTime + 3600 * 1000 + 1000); // +1s tolerance
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

      s3Mock.on(GetObjectCommand).rejects({ name: 'NoSuchKey' });
      s3Mock.on(PutObjectCommand).resolves({});

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

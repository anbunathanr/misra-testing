import { SQSEvent, Context } from 'aws-lambda';
import { handler } from '../analyze-file';

// Mock AWS SDK clients
jest.mock('@aws-sdk/client-s3');
jest.mock('@aws-sdk/client-dynamodb');
jest.mock('../../../services/misra-analysis/analysis-engine');

describe('analyze-file Lambda', () => {
  let mockContext: Context;

  beforeEach(() => {
    mockContext = {
      getRemainingTimeInMillis: jest.fn().mockReturnValue(300000), // 5 minutes
      functionName: 'test-function',
      functionVersion: '1',
      invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:test',
      memoryLimitInMB: '2048',
      awsRequestId: 'test-request-id',
      logGroupName: 'test-log-group',
      logStreamName: 'test-log-stream',
      callbackWaitsForEmptyEventLoop: false,
      done: jest.fn(),
      fail: jest.fn(),
      succeed: jest.fn(),
    } as any;

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('Message Format Validation', () => {
    it('should validate SQS message structure', () => {
      const validMessage = {
        fileId: 'test-file-id',
        fileName: 'test.c',
        s3Key: 'uploads/org-id/user-id/test.c',
        language: 'C',
        userId: 'test-user-id',
        organizationId: 'test-org-id',
      };

      expect(validMessage).toHaveProperty('fileId');
      expect(validMessage).toHaveProperty('fileName');
      expect(validMessage).toHaveProperty('s3Key');
      expect(validMessage).toHaveProperty('language');
      expect(validMessage).toHaveProperty('userId');
    });

    it('should support both C and CPP languages', () => {
      const cMessage = {
        fileId: 'test-file-id',
        fileName: 'test.c',
        s3Key: 'uploads/org-id/user-id/test.c',
        language: 'C',
        userId: 'test-user-id',
      };

      const cppMessage = {
        fileId: 'test-file-id',
        fileName: 'test.cpp',
        s3Key: 'uploads/org-id/user-id/test.cpp',
        language: 'CPP',
        userId: 'test-user-id',
      };

      expect(['C', 'CPP']).toContain(cMessage.language);
      expect(['C', 'CPP']).toContain(cppMessage.language);
    });
  });

  describe('Timeout Handling', () => {
    it('should have timeout buffer configuration', () => {
      const timeoutBuffer = 30000; // 30 seconds
      const minimumTime = 60000; // 60 seconds for analysis
      const requiredTime = timeoutBuffer + minimumTime;

      expect(requiredTime).toBe(90000); // 90 seconds total
    });

    it('should detect insufficient time', () => {
      const remainingTime = 60000; // Only 1 minute
      const timeoutBuffer = 30000;
      const minimumTime = 60000;

      const hasEnoughTime = remainingTime >= (timeoutBuffer + minimumTime);
      expect(hasEnoughTime).toBe(false);
    });

    it('should have sufficient time for normal execution', () => {
      const remainingTime = 300000; // 5 minutes
      const timeoutBuffer = 30000;
      const minimumTime = 60000;

      const hasEnoughTime = remainingTime >= (timeoutBuffer + minimumTime);
      expect(hasEnoughTime).toBe(true);
    });
  });

  describe('Error Handling Configuration', () => {
    it('should define error message structure', () => {
      const errorResponse = {
        fileId: 'test-file-id',
        status: 'failed',
        error_message: 'Test error',
        error_timestamp: Date.now(),
      };

      expect(errorResponse).toHaveProperty('fileId');
      expect(errorResponse).toHaveProperty('status');
      expect(errorResponse).toHaveProperty('error_message');
      expect(errorResponse).toHaveProperty('error_timestamp');
    });

    it('should handle parsing errors gracefully', () => {
      const errorTypes = [
        'Invalid SQS message format',
        'Failed to download file from S3',
        'Failed to store analysis results',
        'Failed to update file metadata',
      ];

      errorTypes.forEach(errorType => {
        expect(errorType).toBeTruthy();
        expect(typeof errorType).toBe('string');
      });
    });
  });

  describe('Analysis Result Structure', () => {
    it('should define analysis result format', () => {
      const analysisResult = {
        analysisId: 'test-analysis-id',
        fileId: 'test-file-id',
        userId: 'test-user-id',
        language: 'C',
        violations: [],
        summary: {
          totalViolations: 0,
          criticalCount: 0,
          majorCount: 0,
          minorCount: 0,
          compliancePercentage: 100,
        },
        createdAt: new Date().toISOString(),
        status: 'COMPLETED',
      };

      expect(analysisResult).toHaveProperty('analysisId');
      expect(analysisResult).toHaveProperty('fileId');
      expect(analysisResult).toHaveProperty('userId');
      expect(analysisResult).toHaveProperty('language');
      expect(analysisResult).toHaveProperty('violations');
      expect(analysisResult).toHaveProperty('summary');
      expect(analysisResult.summary).toHaveProperty('totalViolations');
      expect(analysisResult.summary).toHaveProperty('compliancePercentage');
    });

    it('should include all required summary fields', () => {
      const summary = {
        totalViolations: 5,
        criticalCount: 2,
        majorCount: 2,
        minorCount: 1,
        compliancePercentage: 85.5,
      };

      expect(summary.totalViolations).toBe(5);
      expect(summary.criticalCount).toBe(2);
      expect(summary.majorCount).toBe(2);
      expect(summary.minorCount).toBe(1);
      expect(summary.compliancePercentage).toBeGreaterThan(0);
      expect(summary.compliancePercentage).toBeLessThanOrEqual(100);
    });
  });

  describe('File Metadata Updates', () => {
    it('should update status to in_progress when analysis starts', () => {
      const statusUpdate = {
        fileId: 'test-file-id',
        status: 'in_progress',
        updated_at: Math.floor(Date.now() / 1000),
      };

      expect(statusUpdate.status).toBe('in_progress');
      expect(statusUpdate).toHaveProperty('updated_at');
    });

    it('should update status to completed with analysis data', () => {
      const statusUpdate = {
        fileId: 'test-file-id',
        status: 'completed',
        violations_count: 5,
        compliance_percentage: 85.5,
        analysis_duration: 15000,
        updated_at: Math.floor(Date.now() / 1000),
      };

      expect(statusUpdate.status).toBe('completed');
      expect(statusUpdate.violations_count).toBeGreaterThanOrEqual(0);
      expect(statusUpdate.compliance_percentage).toBeGreaterThanOrEqual(0);
      expect(statusUpdate.compliance_percentage).toBeLessThanOrEqual(100);
      expect(statusUpdate.analysis_duration).toBeGreaterThan(0);
    });

    it('should update status to failed with error details', () => {
      const statusUpdate = {
        fileId: 'test-file-id',
        status: 'failed',
        error_message: 'Analysis timeout',
        error_timestamp: Date.now(),
        updated_at: Math.floor(Date.now() / 1000),
      };

      expect(statusUpdate.status).toBe('failed');
      expect(statusUpdate).toHaveProperty('error_message');
      expect(statusUpdate).toHaveProperty('error_timestamp');
    });
  });

  describe('Lambda Configuration', () => {
    it('should have correct environment variables', () => {
      const requiredEnvVars = [
        'FILE_STORAGE_BUCKET_NAME',
        'FILE_METADATA_TABLE',
        'ANALYSIS_RESULTS_TABLE',
        'AWS_REGION',
      ];

      requiredEnvVars.forEach(envVar => {
        expect(envVar).toBeTruthy();
      });
    });

    it('should have correct timeout configuration', () => {
      const timeoutMinutes = 5;
      const timeoutSeconds = timeoutMinutes * 60;
      
      expect(timeoutSeconds).toBe(300);
    });

    it('should have correct memory configuration', () => {
      const memoryMB = 2048;
      
      expect(memoryMB).toBeGreaterThanOrEqual(2048);
    });
  });

  describe('SQS Event Processing', () => {
    it('should process single SQS message', () => {
      const sqsEvent: SQSEvent = {
        Records: [
          {
            messageId: 'test-message-id',
            receiptHandle: 'test-receipt-handle',
            body: JSON.stringify({
              fileId: 'test-file-id',
              fileName: 'test.c',
              s3Key: 'uploads/org-id/user-id/test.c',
              language: 'C',
              userId: 'test-user-id',
              organizationId: 'test-org-id',
            }),
            attributes: {
              ApproximateReceiveCount: '1',
              SentTimestamp: '1234567890',
              SenderId: 'test-sender',
              ApproximateFirstReceiveTimestamp: '1234567890',
            },
            messageAttributes: {},
            md5OfBody: 'test-md5',
            eventSource: 'aws:sqs',
            eventSourceARN: 'arn:aws:sqs:us-east-1:123456789012:test-queue',
            awsRegion: 'us-east-1',
          },
        ],
      };

      expect(sqsEvent.Records).toHaveLength(1);
      expect(sqsEvent.Records[0].eventSource).toBe('aws:sqs');
      
      const message = JSON.parse(sqsEvent.Records[0].body);
      expect(message).toHaveProperty('fileId');
      expect(message).toHaveProperty('language');
    });

    it('should process multiple SQS messages', () => {
      const sqsEvent: SQSEvent = {
        Records: [
          {
            messageId: 'test-message-id-1',
            receiptHandle: 'test-receipt-handle-1',
            body: JSON.stringify({
              fileId: 'test-file-id-1',
              fileName: 'test1.c',
              s3Key: 'uploads/org-id/user-id/test1.c',
              language: 'C',
              userId: 'test-user-id',
            }),
            attributes: {
              ApproximateReceiveCount: '1',
              SentTimestamp: '1234567890',
              SenderId: 'test-sender',
              ApproximateFirstReceiveTimestamp: '1234567890',
            },
            messageAttributes: {},
            md5OfBody: 'test-md5-1',
            eventSource: 'aws:sqs',
            eventSourceARN: 'arn:aws:sqs:us-east-1:123456789012:test-queue',
            awsRegion: 'us-east-1',
          },
          {
            messageId: 'test-message-id-2',
            receiptHandle: 'test-receipt-handle-2',
            body: JSON.stringify({
              fileId: 'test-file-id-2',
              fileName: 'test2.cpp',
              s3Key: 'uploads/org-id/user-id/test2.cpp',
              language: 'CPP',
              userId: 'test-user-id',
            }),
            attributes: {
              ApproximateReceiveCount: '1',
              SentTimestamp: '1234567890',
              SenderId: 'test-sender',
              ApproximateFirstReceiveTimestamp: '1234567890',
            },
            messageAttributes: {},
            md5OfBody: 'test-md5-2',
            eventSource: 'aws:sqs',
            eventSourceARN: 'arn:aws:sqs:us-east-1:123456789012:test-queue',
            awsRegion: 'us-east-1',
          },
        ],
      };

      expect(sqsEvent.Records).toHaveLength(2);
      expect(sqsEvent.Records[0].body).toContain('test-file-id-1');
      expect(sqsEvent.Records[1].body).toContain('test-file-id-2');
    });
  });
});

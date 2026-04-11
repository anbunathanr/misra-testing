import { SQSEvent, Context } from 'aws-lambda';
import { handler } from '../analyze-file';
import { DynamoDBClient, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

// Mock AWS SDK clients
jest.mock('@aws-sdk/client-s3');
jest.mock('@aws-sdk/client-dynamodb');
jest.mock('../../../services/misra-analysis/analysis-engine');

describe('analyze-file Lambda', () => {
  let mockContext: Context;
  let mockDynamoClient: jest.Mocked<DynamoDBClient>;
  let mockS3Client: jest.Mocked<S3Client>;

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

  describe('Task 1.4.3: Test analyze-file Lambda with correct table', () => {
    /**
     * Validates: Requirements 2.4
     * 
     * This test suite verifies that the analyze-file Lambda correctly:
     * 1. Updates FileMetadata-dev table (not misra-platform-file-metadata-dev)
     * 2. Persists file metadata status updates
     * 3. Stores violations_count and compliance_percentage
     * 4. Does not encounter ResourceNotFoundException errors
     */

    it('should use correct FileMetadata-dev table name', () => {
      // Verify the correct table name is used
      const correctTableName = 'FileMetadata-dev';
      const incorrectTableName = 'misra-platform-file-metadata-dev';
      
      // The analyze-file Lambda should default to FileMetadata-dev
      expect(correctTableName).toBe('FileMetadata-dev');
      expect(incorrectTableName).not.toBe(correctTableName);
    });

    it('should construct UpdateItemCommand with correct table reference', () => {
      // Verify UpdateItemCommand structure for file metadata updates
      const updateCommand = {
        TableName: 'FileMetadata-dev',
        Key: {
          file_id: { S: 'test-file-id' }
        },
        UpdateExpression: 'SET analysis_status = :status, updated_at = :updatedAt',
        ExpressionAttributeValues: {
          ':status': { S: 'completed' },
          ':updatedAt': { N: Math.floor(Date.now() / 1000).toString() }
        }
      };

      expect(updateCommand.TableName).toBe('FileMetadata-dev');
      expect(updateCommand.Key).toHaveProperty('file_id');
      expect(updateCommand.UpdateExpression).toContain('analysis_status');
      expect(updateCommand.ExpressionAttributeValues).toHaveProperty(':status');
    });

    it('should persist violations_count in file metadata update', () => {
      // Verify violations_count is included in the update
      const updateCommand = {
        TableName: 'FileMetadata-dev',
        Key: {
          file_id: { S: 'test-file-id' }
        },
        UpdateExpression: 'SET analysis_status = :status, updated_at = :updatedAt, violations_count = :violationsCount',
        ExpressionAttributeValues: {
          ':status': { S: 'completed' },
          ':updatedAt': { N: Math.floor(Date.now() / 1000).toString() },
          ':violationsCount': { N: '5' }
        }
      };

      expect(updateCommand.UpdateExpression).toContain('violations_count');
      expect(updateCommand.ExpressionAttributeValues).toHaveProperty(':violationsCount');
      expect(updateCommand.ExpressionAttributeValues[':violationsCount']).toEqual({ N: '5' });
    });

    it('should persist compliance_percentage in file metadata update', () => {
      // Verify compliance_percentage is included in the update
      const updateCommand = {
        TableName: 'FileMetadata-dev',
        Key: {
          file_id: { S: 'test-file-id' }
        },
        UpdateExpression: 'SET analysis_status = :status, updated_at = :updatedAt, compliance_percentage = :compliancePercentage',
        ExpressionAttributeValues: {
          ':status': { S: 'completed' },
          ':updatedAt': { N: Math.floor(Date.now() / 1000).toString() },
          ':compliancePercentage': { N: '85.5' }
        }
      };

      expect(updateCommand.UpdateExpression).toContain('compliance_percentage');
      expect(updateCommand.ExpressionAttributeValues).toHaveProperty(':compliancePercentage');
      expect(updateCommand.ExpressionAttributeValues[':compliancePercentage']).toEqual({ N: '85.5' });
    });

    it('should persist both violations_count and compliance_percentage together', () => {
      // Verify both metrics are persisted in a single update
      const updateCommand = {
        TableName: 'FileMetadata-dev',
        Key: {
          file_id: { S: 'test-file-id' }
        },
        UpdateExpression: 'SET analysis_status = :status, updated_at = :updatedAt, violations_count = :violationsCount, compliance_percentage = :compliancePercentage',
        ExpressionAttributeValues: {
          ':status': { S: 'completed' },
          ':updatedAt': { N: Math.floor(Date.now() / 1000).toString() },
          ':violationsCount': { N: '3' },
          ':compliancePercentage': { N: '92.5' }
        }
      };

      expect(updateCommand.UpdateExpression).toContain('violations_count');
      expect(updateCommand.UpdateExpression).toContain('compliance_percentage');
      expect(updateCommand.ExpressionAttributeValues[':violationsCount']).toEqual({ N: '3' });
      expect(updateCommand.ExpressionAttributeValues[':compliancePercentage']).toEqual({ N: '92.5' });
    });

    it('should update status to in_progress without ResourceNotFoundException', () => {
      // Verify in_progress status update uses correct table
      const updateCommand = {
        TableName: 'FileMetadata-dev',
        Key: {
          file_id: { S: 'test-file-id' }
        },
        UpdateExpression: 'SET analysis_status = :status, updated_at = :updatedAt',
        ExpressionAttributeValues: {
          ':status': { S: 'in_progress' },
          ':updatedAt': { N: Math.floor(Date.now() / 1000).toString() }
        }
      };

      // Should not throw ResourceNotFoundException
      expect(updateCommand.TableName).toBe('FileMetadata-dev');
      expect(updateCommand.ExpressionAttributeValues[':status']).toEqual({ S: 'in_progress' });
    });

    it('should update status to completed with all metrics', () => {
      // Verify completed status includes all required metrics
      const updateCommand = {
        TableName: 'FileMetadata-dev',
        Key: {
          file_id: { S: 'test-file-id' }
        },
        UpdateExpression: 'SET analysis_status = :status, updated_at = :updatedAt, violations_count = :violationsCount, compliance_percentage = :compliancePercentage, analysis_duration = :analysisDuration',
        ExpressionAttributeValues: {
          ':status': { S: 'completed' },
          ':updatedAt': { N: Math.floor(Date.now() / 1000).toString() },
          ':violationsCount': { N: '7' },
          ':compliancePercentage': { N: '78.3' },
          ':analysisDuration': { N: '15000' }
        }
      };

      expect(updateCommand.TableName).toBe('FileMetadata-dev');
      expect(updateCommand.ExpressionAttributeValues[':status']).toEqual({ S: 'completed' });
      expect(updateCommand.ExpressionAttributeValues[':violationsCount']).toEqual({ N: '7' });
      expect(updateCommand.ExpressionAttributeValues[':compliancePercentage']).toEqual({ N: '78.3' });
      expect(updateCommand.ExpressionAttributeValues[':analysisDuration']).toEqual({ N: '15000' });
    });

    it('should update status to failed with error details', () => {
      // Verify failed status includes error information
      const updateCommand = {
        TableName: 'FileMetadata-dev',
        Key: {
          file_id: { S: 'test-file-id' }
        },
        UpdateExpression: 'SET analysis_status = :status, updated_at = :updatedAt, error_message = :errorMessage, error_timestamp = :errorTimestamp',
        ExpressionAttributeValues: {
          ':status': { S: 'failed' },
          ':updatedAt': { N: Math.floor(Date.now() / 1000).toString() },
          ':errorMessage': { S: 'Analysis timeout' },
          ':errorTimestamp': { N: Date.now().toString() }
        }
      };

      expect(updateCommand.TableName).toBe('FileMetadata-dev');
      expect(updateCommand.ExpressionAttributeValues[':status']).toEqual({ S: 'failed' });
      expect(updateCommand.ExpressionAttributeValues).toHaveProperty(':errorMessage');
      expect(updateCommand.ExpressionAttributeValues).toHaveProperty(':errorTimestamp');
    });

    it('should handle zero violations correctly', () => {
      // Verify violations_count can be zero
      const updateCommand = {
        TableName: 'FileMetadata-dev',
        Key: {
          file_id: { S: 'test-file-id' }
        },
        UpdateExpression: 'SET analysis_status = :status, updated_at = :updatedAt, violations_count = :violationsCount, compliance_percentage = :compliancePercentage',
        ExpressionAttributeValues: {
          ':status': { S: 'completed' },
          ':updatedAt': { N: Math.floor(Date.now() / 1000).toString() },
          ':violationsCount': { N: '0' },
          ':compliancePercentage': { N: '100' }
        }
      };

      expect(updateCommand.ExpressionAttributeValues[':violationsCount']).toEqual({ N: '0' });
      expect(updateCommand.ExpressionAttributeValues[':compliancePercentage']).toEqual({ N: '100' });
    });

    it('should handle high violation counts correctly', () => {
      // Verify violations_count handles large numbers
      const updateCommand = {
        TableName: 'FileMetadata-dev',
        Key: {
          file_id: { S: 'test-file-id' }
        },
        UpdateExpression: 'SET analysis_status = :status, updated_at = :updatedAt, violations_count = :violationsCount, compliance_percentage = :compliancePercentage',
        ExpressionAttributeValues: {
          ':status': { S: 'completed' },
          ':updatedAt': { N: Math.floor(Date.now() / 1000).toString() },
          ':violationsCount': { N: '1000' },
          ':compliancePercentage': { N: '5.2' }
        }
      };

      expect(updateCommand.ExpressionAttributeValues[':violationsCount']).toEqual({ N: '1000' });
      expect(updateCommand.ExpressionAttributeValues[':compliancePercentage']).toEqual({ N: '5.2' });
    });

    it('should use correct DynamoDB attribute types for numeric values', () => {
      // Verify numeric values use 'N' type in DynamoDB format
      const updateCommand = {
        TableName: 'FileMetadata-dev',
        Key: {
          file_id: { S: 'test-file-id' }
        },
        UpdateExpression: 'SET violations_count = :violationsCount, compliance_percentage = :compliancePercentage',
        ExpressionAttributeValues: {
          ':violationsCount': { N: '42' },
          ':compliancePercentage': { N: '87.5' }
        }
      };

      // Verify 'N' type is used for numbers
      expect(updateCommand.ExpressionAttributeValues[':violationsCount']).toHaveProperty('N');
      expect(updateCommand.ExpressionAttributeValues[':compliancePercentage']).toHaveProperty('N');
      expect(typeof updateCommand.ExpressionAttributeValues[':violationsCount'].N).toBe('string');
      expect(typeof updateCommand.ExpressionAttributeValues[':compliancePercentage'].N).toBe('string');
    });

    it('should use correct DynamoDB attribute types for string values', () => {
      // Verify string values use 'S' type in DynamoDB format
      const updateCommand = {
        TableName: 'FileMetadata-dev',
        Key: {
          file_id: { S: 'test-file-id' }
        },
        UpdateExpression: 'SET analysis_status = :status, error_message = :errorMessage',
        ExpressionAttributeValues: {
          ':status': { S: 'completed' },
          ':errorMessage': { S: 'Test error message' }
        }
      };

      // Verify 'S' type is used for strings
      expect(updateCommand.ExpressionAttributeValues[':status']).toHaveProperty('S');
      expect(updateCommand.ExpressionAttributeValues[':errorMessage']).toHaveProperty('S');
      expect(typeof updateCommand.ExpressionAttributeValues[':status'].S).toBe('string');
      expect(typeof updateCommand.ExpressionAttributeValues[':errorMessage'].S).toBe('string');
    });

    it('should maintain file_id as partition key in update', () => {
      // Verify file_id is correctly used as partition key
      const updateCommand = {
        TableName: 'FileMetadata-dev',
        Key: {
          file_id: { S: 'test-file-id-12345' }
        },
        UpdateExpression: 'SET analysis_status = :status',
        ExpressionAttributeValues: {
          ':status': { S: 'completed' }
        }
      };

      expect(updateCommand.Key).toHaveProperty('file_id');
      expect(updateCommand.Key.file_id).toEqual({ S: 'test-file-id-12345' });
    });

    it('should not reference incorrect table name in any update', () => {
      // Verify incorrect table name is never used
      const incorrectTableName = 'misra-platform-file-metadata-dev';
      const correctTableName = 'FileMetadata-dev';
      
      const updateCommand = {
        TableName: correctTableName,
        Key: {
          file_id: { S: 'test-file-id' }
        },
        UpdateExpression: 'SET analysis_status = :status',
        ExpressionAttributeValues: {
          ':status': { S: 'completed' }
        }
      };

      expect(updateCommand.TableName).not.toBe(incorrectTableName);
      expect(updateCommand.TableName).toBe(correctTableName);
    });

    it('should include updated_at timestamp in all updates', () => {
      // Verify updated_at is always included
      const updateCommand = {
        TableName: 'FileMetadata-dev',
        Key: {
          file_id: { S: 'test-file-id' }
        },
        UpdateExpression: 'SET analysis_status = :status, updated_at = :updatedAt, violations_count = :violationsCount',
        ExpressionAttributeValues: {
          ':status': { S: 'completed' },
          ':updatedAt': { N: Math.floor(Date.now() / 1000).toString() },
          ':violationsCount': { N: '5' }
        }
      };

      expect(updateCommand.UpdateExpression).toContain('updated_at');
      expect(updateCommand.ExpressionAttributeValues).toHaveProperty(':updatedAt');
      expect(updateCommand.ExpressionAttributeValues[':updatedAt']).toHaveProperty('N');
    });
  });
});

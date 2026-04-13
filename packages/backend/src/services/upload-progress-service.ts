import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { 
  DynamoDBDocumentClient, 
  PutCommand, 
  GetCommand, 
  UpdateCommand,
  QueryCommand,
  ScanCommand 
} from '@aws-sdk/lib-dynamodb';

/**
 * Service for managing file upload progress tracking
 * Task 4.2: Build file upload progress monitoring
 */

export interface UploadProgressRecord {
  file_id: string;
  user_id: string;
  file_name: string;
  file_size: number;
  progress_percentage: number;
  status: 'starting' | 'uploading' | 'completed' | 'failed';
  message: string;
  created_at: number;
  updated_at: number;
  ttl: number;
  error_message?: string;
  bytes_uploaded?: number;
  upload_speed?: number;
}

export interface UploadProgressUpdate {
  progress_percentage: number;
  status: 'starting' | 'uploading' | 'completed' | 'failed';
  message: string;
  error_message?: string;
  bytes_uploaded?: number;
  upload_speed?: number;
}

export class UploadProgressService {
  private readonly dynamoClient: DynamoDBDocumentClient;
  private readonly tableName: string;

  constructor() {
    const client = new DynamoDBClient({});
    this.dynamoClient = DynamoDBDocumentClient.from(client);
    this.tableName = process.env.UPLOAD_PROGRESS_TABLE || 'UploadProgress';
  }

  /**
   * Create a new upload progress record
   */
  async createUploadProgress(
    fileId: string,
    userId: string,
    fileName: string,
    fileSize: number
  ): Promise<void> {
    const now = Date.now();
    const ttl = Math.floor((now + (7 * 24 * 60 * 60 * 1000)) / 1000); // 7 days from now

    const record: UploadProgressRecord = {
      file_id: fileId,
      user_id: userId,
      file_name: fileName,
      file_size: fileSize,
      progress_percentage: 0,
      status: 'starting',
      message: 'Initializing upload...',
      created_at: now,
      updated_at: now,
      ttl,
    };

    try {
      const command = new PutCommand({
        TableName: this.tableName,
        Item: record,
      });

      await this.dynamoClient.send(command);
      console.log(`[UPLOAD-PROGRESS-SERVICE] ✓ Created progress record: ${fileId}`);
    } catch (error) {
      console.error('[UPLOAD-PROGRESS-SERVICE] Error creating upload progress:', error);
      throw new Error('Failed to create upload progress record');
    }
  }

  /**
   * Update upload progress
   */
  async updateUploadProgress(
    fileId: string,
    update: UploadProgressUpdate
  ): Promise<void> {
    try {
      const updateExpression = [
        'SET progress_percentage = :percentage',
        '#status = :status',
        'message = :message',
        'updated_at = :updatedAt'
      ];

      const expressionAttributeNames: Record<string, string> = {
        '#status': 'status',
      };

      const expressionAttributeValues: Record<string, any> = {
        ':percentage': update.progress_percentage,
        ':status': update.status,
        ':message': update.message,
        ':updatedAt': Date.now(),
      };

      if (update.error_message) {
        updateExpression.push('error_message = :errorMessage');
        expressionAttributeValues[':errorMessage'] = update.error_message;
      }

      if (update.bytes_uploaded !== undefined) {
        updateExpression.push('bytes_uploaded = :bytesUploaded');
        expressionAttributeValues[':bytesUploaded'] = update.bytes_uploaded;
      }

      if (update.upload_speed !== undefined) {
        updateExpression.push('upload_speed = :uploadSpeed');
        expressionAttributeValues[':uploadSpeed'] = update.upload_speed;
      }

      const command = new UpdateCommand({
        TableName: this.tableName,
        Key: { file_id: fileId },
        UpdateExpression: updateExpression.join(', '),
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
      });

      await this.dynamoClient.send(command);
      console.log(`[UPLOAD-PROGRESS-SERVICE] ✓ Updated progress: ${fileId} - ${update.progress_percentage}%`);
    } catch (error) {
      console.error('[UPLOAD-PROGRESS-SERVICE] Error updating upload progress:', error);
      throw new Error('Failed to update upload progress');
    }
  }

  /**
   * Get upload progress by file ID
   */
  async getUploadProgress(fileId: string): Promise<UploadProgressRecord | null> {
    try {
      const command = new GetCommand({
        TableName: this.tableName,
        Key: { file_id: fileId },
      });

      const response = await this.dynamoClient.send(command);

      if (!response.Item) {
        return null;
      }

      return response.Item as UploadProgressRecord;
    } catch (error) {
      console.error('[UPLOAD-PROGRESS-SERVICE] Error getting upload progress:', error);
      throw new Error('Failed to retrieve upload progress');
    }
  }

  /**
   * Get all upload progress records for a user
   */
  async getUserUploadProgress(userId: string, limit: number = 10): Promise<UploadProgressRecord[]> {
    try {
      const command = new QueryCommand({
        TableName: this.tableName,
        IndexName: 'UserIndex',
        KeyConditionExpression: 'user_id = :userId',
        ExpressionAttributeValues: {
          ':userId': userId,
        },
        ScanIndexForward: false, // Sort by created_at descending (most recent first)
        Limit: limit,
      });

      const response = await this.dynamoClient.send(command);

      if (!response.Items) {
        return [];
      }

      return response.Items as UploadProgressRecord[];
    } catch (error) {
      console.error('[UPLOAD-PROGRESS-SERVICE] Error getting user upload progress:', error);
      throw new Error('Failed to retrieve user upload progress');
    }
  }

  /**
   * Get upload progress records by status
   */
  async getUploadProgressByStatus(
    status: 'starting' | 'uploading' | 'completed' | 'failed',
    limit: number = 50
  ): Promise<UploadProgressRecord[]> {
    try {
      const command = new QueryCommand({
        TableName: this.tableName,
        IndexName: 'StatusIndex',
        KeyConditionExpression: '#status = :status',
        ExpressionAttributeNames: {
          '#status': 'status',
        },
        ExpressionAttributeValues: {
          ':status': status,
        },
        ScanIndexForward: false, // Sort by updated_at descending (most recent first)
        Limit: limit,
      });

      const response = await this.dynamoClient.send(command);

      if (!response.Items) {
        return [];
      }

      return response.Items as UploadProgressRecord[];
    } catch (error) {
      console.error('[UPLOAD-PROGRESS-SERVICE] Error getting upload progress by status:', error);
      throw new Error('Failed to retrieve upload progress by status');
    }
  }

  /**
   * Mark upload as completed
   */
  async markUploadCompleted(fileId: string, message: string = 'Upload completed successfully'): Promise<void> {
    await this.updateUploadProgress(fileId, {
      progress_percentage: 100,
      status: 'completed',
      message,
    });
  }

  /**
   * Mark upload as failed
   */
  async markUploadFailed(fileId: string, errorMessage: string): Promise<void> {
    await this.updateUploadProgress(fileId, {
      progress_percentage: 0,
      status: 'failed',
      message: 'Upload failed',
      error_message: errorMessage,
    });
  }

  /**
   * Calculate upload speed based on progress
   */
  calculateUploadSpeed(
    bytesUploaded: number,
    elapsedTimeMs: number
  ): number {
    if (elapsedTimeMs <= 0) return 0;
    return Math.round((bytesUploaded / elapsedTimeMs) * 1000); // bytes per second
  }

  /**
   * Estimate time remaining based on current progress
   */
  estimateTimeRemaining(
    progressPercentage: number,
    elapsedTimeMs: number,
    fileSize: number
  ): number {
    if (progressPercentage <= 0) {
      // Estimate based on file size (1 second per MB)
      const fileSizeMB = fileSize / (1024 * 1024);
      return Math.max(5, Math.min(60, fileSizeMB * 2)); // Between 5-60 seconds
    }

    const progressRate = progressPercentage / elapsedTimeMs; // percentage per millisecond
    const remainingPercentage = 100 - progressPercentage;
    const estimatedRemainingMs = remainingPercentage / progressRate;

    // Convert to seconds and cap at reasonable limits
    const estimatedSeconds = Math.round(estimatedRemainingMs / 1000);
    return Math.max(0, Math.min(300, estimatedSeconds)); // Cap at 5 minutes
  }

  /**
   * Clean up old completed/failed uploads (for maintenance)
   */
  async cleanupOldUploads(olderThanDays: number = 7): Promise<number> {
    const cutoffTime = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);
    let deletedCount = 0;

    try {
      // Scan for old records (this is expensive, should be run as a scheduled job)
      const command = new ScanCommand({
        TableName: this.tableName,
        FilterExpression: 'updated_at < :cutoff AND (#status = :completed OR #status = :failed)',
        ExpressionAttributeNames: {
          '#status': 'status',
        },
        ExpressionAttributeValues: {
          ':cutoff': cutoffTime,
          ':completed': 'completed',
          ':failed': 'failed',
        },
      });

      const response = await this.dynamoClient.send(command);

      if (response.Items && response.Items.length > 0) {
        // Note: In a real implementation, you'd batch delete these records
        // For now, we'll just count them
        deletedCount = response.Items.length;
        console.log(`[UPLOAD-PROGRESS-SERVICE] Found ${deletedCount} old upload records for cleanup`);
      }

      return deletedCount;
    } catch (error) {
      console.error('[UPLOAD-PROGRESS-SERVICE] Error cleaning up old uploads:', error);
      throw new Error('Failed to cleanup old uploads');
    }
  }
}
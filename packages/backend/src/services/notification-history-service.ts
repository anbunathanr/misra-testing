/**
 * Notification History Service
 * 
 * Persists and queries notification delivery history for audit and debugging.
 * Supports filtering, pagination, and TTL management.
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { 
  DynamoDBDocumentClient, 
  GetCommand, 
  PutCommand, 
  UpdateCommand, 
  QueryCommand,
  ScanCommand 
} from '@aws-sdk/lib-dynamodb';
import { 
  NotificationHistoryRecord, 
  NotificationHistoryQuery, 
  PaginatedNotificationHistory 
} from '../types/notification';
import { v4 as uuidv4 } from 'uuid';

export class NotificationHistoryService {
  private docClient: DynamoDBDocumentClient;
  private tableName: string;
  private readonly TTL_DAYS = 90;

  constructor() {
    const client = new DynamoDBClient({
      region: process.env.AWS_REGION || 'us-east-1',
    });
    this.docClient = DynamoDBDocumentClient.from(client as any);
    this.tableName = process.env.NOTIFICATION_HISTORY_TABLE || 'NotificationHistory';
  }

  /**
   * Record notification attempt
   * 
   * @param record - Notification record without ID and sentAt
   * @returns Created notification record
   */
  async recordNotification(
    record: Omit<NotificationHistoryRecord, 'notificationId' | 'sentAt'>
  ): Promise<NotificationHistoryRecord> {
    const now = new Date();
    const sentAt = now.toISOString();
    
    // Calculate TTL (90 days from now)
    const ttl = Math.floor(now.getTime() / 1000) + (this.TTL_DAYS * 24 * 60 * 60);

    const newRecord: NotificationHistoryRecord = {
      ...record,
      notificationId: uuidv4(),
      sentAt,
      ttl,
    };

    try {
      const command = new PutCommand({
        TableName: this.tableName,
        Item: newRecord,
      });

      await this.docClient.send(command);
      return newRecord;
    } catch (error) {
      console.error('Error recording notification', { error });
      throw error;
    }
  }

  /**
   * Update delivery status of notification
   * 
   * @param notificationId - Notification ID
   * @param status - New delivery status
   * @param deliveredAt - Optional delivery timestamp
   */
  async updateDeliveryStatus(
    notificationId: string,
    status: string,
    deliveredAt?: string
  ): Promise<void> {
    try {
      const updateExpression = deliveredAt
        ? 'SET deliveryStatus = :status, deliveredAt = :deliveredAt'
        : 'SET deliveryStatus = :status';

      const expressionAttributeValues: Record<string, any> = {
        ':status': status,
      };

      if (deliveredAt) {
        expressionAttributeValues[':deliveredAt'] = deliveredAt;
      }

      const command = new UpdateCommand({
        TableName: this.tableName,
        Key: { notificationId },
        UpdateExpression: updateExpression,
        ExpressionAttributeValues: expressionAttributeValues,
      });

      await this.docClient.send(command);
    } catch (error) {
      console.error('Error updating delivery status', { notificationId, status, error });
      throw error;
    }
  }

  /**
   * Query notification history with filters and pagination
   * 
   * @param query - Query parameters
   * @returns Paginated notification history
   */
  async queryHistory(query: NotificationHistoryQuery): Promise<PaginatedNotificationHistory> {
    try {
      // If userId is provided, use UserTimeIndex GSI
      if (query.userId) {
        return await this.queryByUser(query);
      }

      // If eventType is provided, use EventTypeTimeIndex GSI
      if (query.eventType) {
        return await this.queryByEventType(query);
      }

      // Otherwise, scan the table (less efficient)
      return await this.scanWithFilters(query);
    } catch (error) {
      console.error('Error querying history', { query, error });
      throw error;
    }
  }

  /**
   * Get notification by ID
   * 
   * @param notificationId - Notification ID
   * @returns Notification record or null if not found
   */
  async getNotificationById(notificationId: string): Promise<NotificationHistoryRecord | null> {
    try {
      const command = new GetCommand({
        TableName: this.tableName,
        Key: { notificationId },
      });

      const response = await this.docClient.send(command);
      return response.Item ? (response.Item as NotificationHistoryRecord) : null;
    } catch (error) {
      console.error('Error getting notification by ID', { notificationId, error });
      throw error;
    }
  }

  /**
   * Archive old records (manual cleanup, TTL handles automatic deletion)
   * 
   * @param olderThanDays - Delete records older than this many days
   * @returns Number of records archived
   */
  async archiveOldRecords(olderThanDays: number): Promise<number> {
    // Note: This is a placeholder. In production, TTL handles automatic deletion.
    // This method could be used for manual archival to S3 or other storage.
    console.log(`Archive operation for records older than ${olderThanDays} days`);
    return 0;
  }

  /**
   * Query history by user ID
   */
  private async queryByUser(query: NotificationHistoryQuery): Promise<PaginatedNotificationHistory> {
    const keyConditionExpression = query.startDate && query.endDate
      ? 'userId = :userId AND sentAt BETWEEN :startDate AND :endDate'
      : 'userId = :userId';

    const expressionAttributeValues: Record<string, any> = {
      ':userId': query.userId,
    };

    if (query.startDate) {
      expressionAttributeValues[':startDate'] = query.startDate;
    }

    if (query.endDate) {
      expressionAttributeValues[':endDate'] = query.endDate;
    }

    // Build filter expression for additional filters
    const filterExpressions: string[] = [];
    if (query.channel) {
      filterExpressions.push('channel = :channel');
      expressionAttributeValues[':channel'] = query.channel;
    }

    if (query.deliveryStatus) {
      filterExpressions.push('deliveryStatus = :deliveryStatus');
      expressionAttributeValues[':deliveryStatus'] = query.deliveryStatus;
    }

    const command = new QueryCommand({
      TableName: this.tableName,
      IndexName: 'UserTimeIndex',
      KeyConditionExpression: keyConditionExpression,
      FilterExpression: filterExpressions.length > 0 ? filterExpressions.join(' AND ') : undefined,
      ExpressionAttributeValues: expressionAttributeValues,
      Limit: query.limit || 50,
      ExclusiveStartKey: query.nextToken ? JSON.parse(Buffer.from(query.nextToken, 'base64').toString()) : undefined,
      ScanIndexForward: false, // Most recent first
    });

    const response = await this.docClient.send(command);

    return {
      records: (response.Items || []) as NotificationHistoryRecord[],
      nextToken: response.LastEvaluatedKey 
        ? Buffer.from(JSON.stringify(response.LastEvaluatedKey)).toString('base64')
        : undefined,
    };
  }

  /**
   * Query history by event type
   */
  private async queryByEventType(query: NotificationHistoryQuery): Promise<PaginatedNotificationHistory> {
    const keyConditionExpression = query.startDate && query.endDate
      ? 'eventType = :eventType AND sentAt BETWEEN :startDate AND :endDate'
      : 'eventType = :eventType';

    const expressionAttributeValues: Record<string, any> = {
      ':eventType': query.eventType,
    };

    if (query.startDate) {
      expressionAttributeValues[':startDate'] = query.startDate;
    }

    if (query.endDate) {
      expressionAttributeValues[':endDate'] = query.endDate;
    }

    // Build filter expression
    const filterExpressions: string[] = [];
    if (query.channel) {
      filterExpressions.push('channel = :channel');
      expressionAttributeValues[':channel'] = query.channel;
    }

    if (query.deliveryStatus) {
      filterExpressions.push('deliveryStatus = :deliveryStatus');
      expressionAttributeValues[':deliveryStatus'] = query.deliveryStatus;
    }

    const command = new QueryCommand({
      TableName: this.tableName,
      IndexName: 'EventTypeTimeIndex',
      KeyConditionExpression: keyConditionExpression,
      FilterExpression: filterExpressions.length > 0 ? filterExpressions.join(' AND ') : undefined,
      ExpressionAttributeValues: expressionAttributeValues,
      Limit: query.limit || 50,
      ExclusiveStartKey: query.nextToken ? JSON.parse(Buffer.from(query.nextToken, 'base64').toString()) : undefined,
      ScanIndexForward: false, // Most recent first
    });

    const response = await this.docClient.send(command);

    return {
      records: (response.Items || []) as NotificationHistoryRecord[],
      nextToken: response.LastEvaluatedKey 
        ? Buffer.from(JSON.stringify(response.LastEvaluatedKey)).toString('base64')
        : undefined,
    };
  }

  /**
   * Scan table with filters (less efficient, use when no GSI applies)
   */
  private async scanWithFilters(query: NotificationHistoryQuery): Promise<PaginatedNotificationHistory> {
    const filterExpressions: string[] = [];
    const expressionAttributeValues: Record<string, any> = {};

    if (query.channel) {
      filterExpressions.push('channel = :channel');
      expressionAttributeValues[':channel'] = query.channel;
    }

    if (query.deliveryStatus) {
      filterExpressions.push('deliveryStatus = :deliveryStatus');
      expressionAttributeValues[':deliveryStatus'] = query.deliveryStatus;
    }

    const command = new ScanCommand({
      TableName: this.tableName,
      FilterExpression: filterExpressions.length > 0 ? filterExpressions.join(' AND ') : undefined,
      ExpressionAttributeValues: Object.keys(expressionAttributeValues).length > 0 ? expressionAttributeValues : undefined,
      Limit: query.limit || 50,
      ExclusiveStartKey: query.nextToken ? JSON.parse(Buffer.from(query.nextToken, 'base64').toString()) : undefined,
    });

    const response = await this.docClient.send(command);

    return {
      records: (response.Items || []) as NotificationHistoryRecord[],
      nextToken: response.LastEvaluatedKey 
        ? Buffer.from(JSON.stringify(response.LastEvaluatedKey)).toString('base64')
        : undefined,
    };
  }
}

// Export singleton instance
export const notificationHistoryService = new NotificationHistoryService();

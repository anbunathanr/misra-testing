"use strict";
/**
 * Notification History Service
 *
 * Persists and queries notification delivery history for audit and debugging.
 * Supports filtering, pagination, and TTL management.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationHistoryService = exports.NotificationHistoryService = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const uuid_1 = require("uuid");
class NotificationHistoryService {
    docClient;
    tableName;
    TTL_DAYS = 90;
    constructor() {
        const client = new client_dynamodb_1.DynamoDBClient({
            region: process.env.AWS_REGION || 'us-east-1',
        });
        this.docClient = lib_dynamodb_1.DynamoDBDocumentClient.from(client);
        this.tableName = process.env.NOTIFICATION_HISTORY_TABLE || 'NotificationHistory';
    }
    /**
     * Record notification attempt
     *
     * @param record - Notification record without ID and sentAt
     * @returns Created notification record
     */
    async recordNotification(record) {
        const now = new Date();
        const sentAt = now.toISOString();
        // Calculate TTL (90 days from now)
        const ttl = Math.floor(now.getTime() / 1000) + (this.TTL_DAYS * 24 * 60 * 60);
        const newRecord = {
            ...record,
            notificationId: (0, uuid_1.v4)(),
            sentAt,
            ttl,
        };
        try {
            const command = new lib_dynamodb_1.PutCommand({
                TableName: this.tableName,
                Item: newRecord,
            });
            await this.docClient.send(command);
            return newRecord;
        }
        catch (error) {
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
    async updateDeliveryStatus(notificationId, status, deliveredAt) {
        try {
            const updateExpression = deliveredAt
                ? 'SET deliveryStatus = :status, deliveredAt = :deliveredAt'
                : 'SET deliveryStatus = :status';
            const expressionAttributeValues = {
                ':status': status,
            };
            if (deliveredAt) {
                expressionAttributeValues[':deliveredAt'] = deliveredAt;
            }
            const command = new lib_dynamodb_1.UpdateCommand({
                TableName: this.tableName,
                Key: { notificationId },
                UpdateExpression: updateExpression,
                ExpressionAttributeValues: expressionAttributeValues,
            });
            await this.docClient.send(command);
        }
        catch (error) {
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
    async queryHistory(query) {
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
        }
        catch (error) {
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
    async getNotificationById(notificationId) {
        try {
            const command = new lib_dynamodb_1.GetCommand({
                TableName: this.tableName,
                Key: { notificationId },
            });
            const response = await this.docClient.send(command);
            return response.Item ? response.Item : null;
        }
        catch (error) {
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
    async archiveOldRecords(olderThanDays) {
        // Note: This is a placeholder. In production, TTL handles automatic deletion.
        // This method could be used for manual archival to S3 or other storage.
        console.log(`Archive operation for records older than ${olderThanDays} days`);
        return 0;
    }
    /**
     * Query history by user ID
     */
    async queryByUser(query) {
        const keyConditionExpression = query.startDate && query.endDate
            ? 'userId = :userId AND sentAt BETWEEN :startDate AND :endDate'
            : 'userId = :userId';
        const expressionAttributeValues = {
            ':userId': query.userId,
        };
        if (query.startDate) {
            expressionAttributeValues[':startDate'] = query.startDate;
        }
        if (query.endDate) {
            expressionAttributeValues[':endDate'] = query.endDate;
        }
        // Build filter expression for additional filters
        const filterExpressions = [];
        if (query.channel) {
            filterExpressions.push('channel = :channel');
            expressionAttributeValues[':channel'] = query.channel;
        }
        if (query.deliveryStatus) {
            filterExpressions.push('deliveryStatus = :deliveryStatus');
            expressionAttributeValues[':deliveryStatus'] = query.deliveryStatus;
        }
        const command = new lib_dynamodb_1.QueryCommand({
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
            records: (response.Items || []),
            nextToken: response.LastEvaluatedKey
                ? Buffer.from(JSON.stringify(response.LastEvaluatedKey)).toString('base64')
                : undefined,
        };
    }
    /**
     * Query history by event type
     */
    async queryByEventType(query) {
        const keyConditionExpression = query.startDate && query.endDate
            ? 'eventType = :eventType AND sentAt BETWEEN :startDate AND :endDate'
            : 'eventType = :eventType';
        const expressionAttributeValues = {
            ':eventType': query.eventType,
        };
        if (query.startDate) {
            expressionAttributeValues[':startDate'] = query.startDate;
        }
        if (query.endDate) {
            expressionAttributeValues[':endDate'] = query.endDate;
        }
        // Build filter expression
        const filterExpressions = [];
        if (query.channel) {
            filterExpressions.push('channel = :channel');
            expressionAttributeValues[':channel'] = query.channel;
        }
        if (query.deliveryStatus) {
            filterExpressions.push('deliveryStatus = :deliveryStatus');
            expressionAttributeValues[':deliveryStatus'] = query.deliveryStatus;
        }
        const command = new lib_dynamodb_1.QueryCommand({
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
            records: (response.Items || []),
            nextToken: response.LastEvaluatedKey
                ? Buffer.from(JSON.stringify(response.LastEvaluatedKey)).toString('base64')
                : undefined,
        };
    }
    /**
     * Scan table with filters (less efficient, use when no GSI applies)
     */
    async scanWithFilters(query) {
        const filterExpressions = [];
        const expressionAttributeValues = {};
        if (query.channel) {
            filterExpressions.push('channel = :channel');
            expressionAttributeValues[':channel'] = query.channel;
        }
        if (query.deliveryStatus) {
            filterExpressions.push('deliveryStatus = :deliveryStatus');
            expressionAttributeValues[':deliveryStatus'] = query.deliveryStatus;
        }
        const command = new lib_dynamodb_1.ScanCommand({
            TableName: this.tableName,
            FilterExpression: filterExpressions.length > 0 ? filterExpressions.join(' AND ') : undefined,
            ExpressionAttributeValues: Object.keys(expressionAttributeValues).length > 0 ? expressionAttributeValues : undefined,
            Limit: query.limit || 50,
            ExclusiveStartKey: query.nextToken ? JSON.parse(Buffer.from(query.nextToken, 'base64').toString()) : undefined,
        });
        const response = await this.docClient.send(command);
        return {
            records: (response.Items || []),
            nextToken: response.LastEvaluatedKey
                ? Buffer.from(JSON.stringify(response.LastEvaluatedKey)).toString('base64')
                : undefined,
        };
    }
}
exports.NotificationHistoryService = NotificationHistoryService;
// Export singleton instance
exports.notificationHistoryService = new NotificationHistoryService();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90aWZpY2F0aW9uLWhpc3Rvcnktc2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIm5vdGlmaWNhdGlvbi1oaXN0b3J5LXNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7OztHQUtHOzs7QUFFSCw4REFBMEQ7QUFDMUQsd0RBTytCO0FBTS9CLCtCQUFvQztBQUVwQyxNQUFhLDBCQUEwQjtJQUM3QixTQUFTLENBQXlCO0lBQ2xDLFNBQVMsQ0FBUztJQUNULFFBQVEsR0FBRyxFQUFFLENBQUM7SUFFL0I7UUFDRSxNQUFNLE1BQU0sR0FBRyxJQUFJLGdDQUFjLENBQUM7WUFDaEMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxJQUFJLFdBQVc7U0FDOUMsQ0FBQyxDQUFDO1FBQ0gsSUFBSSxDQUFDLFNBQVMsR0FBRyxxQ0FBc0IsQ0FBQyxJQUFJLENBQUMsTUFBYSxDQUFDLENBQUM7UUFDNUQsSUFBSSxDQUFDLFNBQVMsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLDBCQUEwQixJQUFJLHFCQUFxQixDQUFDO0lBQ25GLENBQUM7SUFFRDs7Ozs7T0FLRztJQUNILEtBQUssQ0FBQyxrQkFBa0IsQ0FDdEIsTUFBb0U7UUFFcEUsTUFBTSxHQUFHLEdBQUcsSUFBSSxJQUFJLEVBQUUsQ0FBQztRQUN2QixNQUFNLE1BQU0sR0FBRyxHQUFHLENBQUMsV0FBVyxFQUFFLENBQUM7UUFFakMsbUNBQW1DO1FBQ25DLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDO1FBRTlFLE1BQU0sU0FBUyxHQUE4QjtZQUMzQyxHQUFHLE1BQU07WUFDVCxjQUFjLEVBQUUsSUFBQSxTQUFNLEdBQUU7WUFDeEIsTUFBTTtZQUNOLEdBQUc7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LEVBQUUsQ0FBQyxRQUFRLENBQUMsS0FBSyxJQUFJLEVBQUUsQ0FBZ0M7WUFDOUQsU0FBUyxFQUFFLFFBQVEsQ0FBQyxnQkFBZ0I7Z0JBQ2xDLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDO2dCQUMzRSxDQUFDLENBQUMsU0FBUztTQUNkLENBQUM7SUFDSixDQUFDO0NBQ0Y7QUFoU0QsZ0VBZ1NDO0FBRUQsNEJBQTRCO0FBQ2YsUUFBQSwwQkFBMEIsR0FBRyxJQUFJLDBCQUEwQixFQUFFLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogTm90aWZpY2F0aW9uIEhpc3RvcnkgU2VydmljZVxyXG4gKiBcclxuICogUGVyc2lzdHMgYW5kIHF1ZXJpZXMgbm90aWZpY2F0aW9uIGRlbGl2ZXJ5IGhpc3RvcnkgZm9yIGF1ZGl0IGFuZCBkZWJ1Z2dpbmcuXHJcbiAqIFN1cHBvcnRzIGZpbHRlcmluZywgcGFnaW5hdGlvbiwgYW5kIFRUTCBtYW5hZ2VtZW50LlxyXG4gKi9cclxuXHJcbmltcG9ydCB7IER5bmFtb0RCQ2xpZW50IH0gZnJvbSAnQGF3cy1zZGsvY2xpZW50LWR5bmFtb2RiJztcclxuaW1wb3J0IHsgXHJcbiAgRHluYW1vREJEb2N1bWVudENsaWVudCwgXHJcbiAgR2V0Q29tbWFuZCwgXHJcbiAgUHV0Q29tbWFuZCwgXHJcbiAgVXBkYXRlQ29tbWFuZCwgXHJcbiAgUXVlcnlDb21tYW5kLFxyXG4gIFNjYW5Db21tYW5kIFxyXG59IGZyb20gJ0Bhd3Mtc2RrL2xpYi1keW5hbW9kYic7XHJcbmltcG9ydCB7IFxyXG4gIE5vdGlmaWNhdGlvbkhpc3RvcnlSZWNvcmQsIFxyXG4gIE5vdGlmaWNhdGlvbkhpc3RvcnlRdWVyeSwgXHJcbiAgUGFnaW5hdGVkTm90aWZpY2F0aW9uSGlzdG9yeSBcclxufSBmcm9tICcuLi90eXBlcy9ub3RpZmljYXRpb24nO1xyXG5pbXBvcnQgeyB2NCBhcyB1dWlkdjQgfSBmcm9tICd1dWlkJztcclxuXHJcbmV4cG9ydCBjbGFzcyBOb3RpZmljYXRpb25IaXN0b3J5U2VydmljZSB7XHJcbiAgcHJpdmF0ZSBkb2NDbGllbnQ6IER5bmFtb0RCRG9jdW1lbnRDbGllbnQ7XHJcbiAgcHJpdmF0ZSB0YWJsZU5hbWU6IHN0cmluZztcclxuICBwcml2YXRlIHJlYWRvbmx5IFRUTF9EQVlTID0gOTA7XHJcblxyXG4gIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgY29uc3QgY2xpZW50ID0gbmV3IER5bmFtb0RCQ2xpZW50KHtcclxuICAgICAgcmVnaW9uOiBwcm9jZXNzLmVudi5BV1NfUkVHSU9OIHx8ICd1cy1lYXN0LTEnLFxyXG4gICAgfSk7XHJcbiAgICB0aGlzLmRvY0NsaWVudCA9IER5bmFtb0RCRG9jdW1lbnRDbGllbnQuZnJvbShjbGllbnQgYXMgYW55KTtcclxuICAgIHRoaXMudGFibGVOYW1lID0gcHJvY2Vzcy5lbnYuTk9USUZJQ0FUSU9OX0hJU1RPUllfVEFCTEUgfHwgJ05vdGlmaWNhdGlvbkhpc3RvcnknO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogUmVjb3JkIG5vdGlmaWNhdGlvbiBhdHRlbXB0XHJcbiAgICogXHJcbiAgICogQHBhcmFtIHJlY29yZCAtIE5vdGlmaWNhdGlvbiByZWNvcmQgd2l0aG91dCBJRCBhbmQgc2VudEF0XHJcbiAgICogQHJldHVybnMgQ3JlYXRlZCBub3RpZmljYXRpb24gcmVjb3JkXHJcbiAgICovXHJcbiAgYXN5bmMgcmVjb3JkTm90aWZpY2F0aW9uKFxyXG4gICAgcmVjb3JkOiBPbWl0PE5vdGlmaWNhdGlvbkhpc3RvcnlSZWNvcmQsICdub3RpZmljYXRpb25JZCcgfCAnc2VudEF0Jz5cclxuICApOiBQcm9taXNlPE5vdGlmaWNhdGlvbkhpc3RvcnlSZWNvcmQ+IHtcclxuICAgIGNvbnN0IG5vdyA9IG5ldyBEYXRlKCk7XHJcbiAgICBjb25zdCBzZW50QXQgPSBub3cudG9JU09TdHJpbmcoKTtcclxuICAgIFxyXG4gICAgLy8gQ2FsY3VsYXRlIFRUTCAoOTAgZGF5cyBmcm9tIG5vdylcclxuICAgIGNvbnN0IHR0bCA9IE1hdGguZmxvb3Iobm93LmdldFRpbWUoKSAvIDEwMDApICsgKHRoaXMuVFRMX0RBWVMgKiAyNCAqIDYwICogNjApO1xyXG5cclxuICAgIGNvbnN0IG5ld1JlY29yZDogTm90aWZpY2F0aW9uSGlzdG9yeVJlY29yZCA9IHtcclxuICAgICAgLi4ucmVjb3JkLFxyXG4gICAgICBub3RpZmljYXRpb25JZDogdXVpZHY0KCksXHJcbiAgICAgIHNlbnRBdCxcclxuICAgICAgdHRsLFxyXG4gICAgfTtcclxuXHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCBjb21tYW5kID0gbmV3IFB1dENvbW1hbmQoe1xyXG4gICAgICAgIFRhYmxlTmFtZTogdGhpcy50YWJsZU5hbWUsXHJcbiAgICAgICAgSXRlbTogbmV3UmVjb3JkLFxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGF3YWl0IHRoaXMuZG9jQ2xpZW50LnNlbmQoY29tbWFuZCk7XHJcbiAgICAgIHJldHVybiBuZXdSZWNvcmQ7XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBjb25zb2xlLmVycm9yKCdFcnJvciByZWNvcmRpbmcgbm90aWZpY2F0aW9uJywgeyBlcnJvciB9KTtcclxuICAgICAgdGhyb3cgZXJyb3I7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBVcGRhdGUgZGVsaXZlcnkgc3RhdHVzIG9mIG5vdGlmaWNhdGlvblxyXG4gICAqIFxyXG4gICAqIEBwYXJhbSBub3RpZmljYXRpb25JZCAtIE5vdGlmaWNhdGlvbiBJRFxyXG4gICAqIEBwYXJhbSBzdGF0dXMgLSBOZXcgZGVsaXZlcnkgc3RhdHVzXHJcbiAgICogQHBhcmFtIGRlbGl2ZXJlZEF0IC0gT3B0aW9uYWwgZGVsaXZlcnkgdGltZXN0YW1wXHJcbiAgICovXHJcbiAgYXN5bmMgdXBkYXRlRGVsaXZlcnlTdGF0dXMoXHJcbiAgICBub3RpZmljYXRpb25JZDogc3RyaW5nLFxyXG4gICAgc3RhdHVzOiBzdHJpbmcsXHJcbiAgICBkZWxpdmVyZWRBdD86IHN0cmluZ1xyXG4gICk6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3QgdXBkYXRlRXhwcmVzc2lvbiA9IGRlbGl2ZXJlZEF0XHJcbiAgICAgICAgPyAnU0VUIGRlbGl2ZXJ5U3RhdHVzID0gOnN0YXR1cywgZGVsaXZlcmVkQXQgPSA6ZGVsaXZlcmVkQXQnXHJcbiAgICAgICAgOiAnU0VUIGRlbGl2ZXJ5U3RhdHVzID0gOnN0YXR1cyc7XHJcblxyXG4gICAgICBjb25zdCBleHByZXNzaW9uQXR0cmlidXRlVmFsdWVzOiBSZWNvcmQ8c3RyaW5nLCBhbnk+ID0ge1xyXG4gICAgICAgICc6c3RhdHVzJzogc3RhdHVzLFxyXG4gICAgICB9O1xyXG5cclxuICAgICAgaWYgKGRlbGl2ZXJlZEF0KSB7XHJcbiAgICAgICAgZXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlc1snOmRlbGl2ZXJlZEF0J10gPSBkZWxpdmVyZWRBdDtcclxuICAgICAgfVxyXG5cclxuICAgICAgY29uc3QgY29tbWFuZCA9IG5ldyBVcGRhdGVDb21tYW5kKHtcclxuICAgICAgICBUYWJsZU5hbWU6IHRoaXMudGFibGVOYW1lLFxyXG4gICAgICAgIEtleTogeyBub3RpZmljYXRpb25JZCB9LFxyXG4gICAgICAgIFVwZGF0ZUV4cHJlc3Npb246IHVwZGF0ZUV4cHJlc3Npb24sXHJcbiAgICAgICAgRXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlczogZXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlcyxcclxuICAgICAgfSk7XHJcblxyXG4gICAgICBhd2FpdCB0aGlzLmRvY0NsaWVudC5zZW5kKGNvbW1hbmQpO1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgdXBkYXRpbmcgZGVsaXZlcnkgc3RhdHVzJywgeyBub3RpZmljYXRpb25JZCwgc3RhdHVzLCBlcnJvciB9KTtcclxuICAgICAgdGhyb3cgZXJyb3I7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBRdWVyeSBub3RpZmljYXRpb24gaGlzdG9yeSB3aXRoIGZpbHRlcnMgYW5kIHBhZ2luYXRpb25cclxuICAgKiBcclxuICAgKiBAcGFyYW0gcXVlcnkgLSBRdWVyeSBwYXJhbWV0ZXJzXHJcbiAgICogQHJldHVybnMgUGFnaW5hdGVkIG5vdGlmaWNhdGlvbiBoaXN0b3J5XHJcbiAgICovXHJcbiAgYXN5bmMgcXVlcnlIaXN0b3J5KHF1ZXJ5OiBOb3RpZmljYXRpb25IaXN0b3J5UXVlcnkpOiBQcm9taXNlPFBhZ2luYXRlZE5vdGlmaWNhdGlvbkhpc3Rvcnk+IHtcclxuICAgIHRyeSB7XHJcbiAgICAgIC8vIElmIHVzZXJJZCBpcyBwcm92aWRlZCwgdXNlIFVzZXJUaW1lSW5kZXggR1NJXHJcbiAgICAgIGlmIChxdWVyeS51c2VySWQpIHtcclxuICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5xdWVyeUJ5VXNlcihxdWVyeSk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIElmIGV2ZW50VHlwZSBpcyBwcm92aWRlZCwgdXNlIEV2ZW50VHlwZVRpbWVJbmRleCBHU0lcclxuICAgICAgaWYgKHF1ZXJ5LmV2ZW50VHlwZSkge1xyXG4gICAgICAgIHJldHVybiBhd2FpdCB0aGlzLnF1ZXJ5QnlFdmVudFR5cGUocXVlcnkpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBPdGhlcndpc2UsIHNjYW4gdGhlIHRhYmxlIChsZXNzIGVmZmljaWVudClcclxuICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuc2NhbldpdGhGaWx0ZXJzKHF1ZXJ5KTtcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIHF1ZXJ5aW5nIGhpc3RvcnknLCB7IHF1ZXJ5LCBlcnJvciB9KTtcclxuICAgICAgdGhyb3cgZXJyb3I7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBHZXQgbm90aWZpY2F0aW9uIGJ5IElEXHJcbiAgICogXHJcbiAgICogQHBhcmFtIG5vdGlmaWNhdGlvbklkIC0gTm90aWZpY2F0aW9uIElEXHJcbiAgICogQHJldHVybnMgTm90aWZpY2F0aW9uIHJlY29yZCBvciBudWxsIGlmIG5vdCBmb3VuZFxyXG4gICAqL1xyXG4gIGFzeW5jIGdldE5vdGlmaWNhdGlvbkJ5SWQobm90aWZpY2F0aW9uSWQ6IHN0cmluZyk6IFByb21pc2U8Tm90aWZpY2F0aW9uSGlzdG9yeVJlY29yZCB8IG51bGw+IHtcclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IGNvbW1hbmQgPSBuZXcgR2V0Q29tbWFuZCh7XHJcbiAgICAgICAgVGFibGVOYW1lOiB0aGlzLnRhYmxlTmFtZSxcclxuICAgICAgICBLZXk6IHsgbm90aWZpY2F0aW9uSWQgfSxcclxuICAgICAgfSk7XHJcblxyXG4gICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHRoaXMuZG9jQ2xpZW50LnNlbmQoY29tbWFuZCk7XHJcbiAgICAgIHJldHVybiByZXNwb25zZS5JdGVtID8gKHJlc3BvbnNlLkl0ZW0gYXMgTm90aWZpY2F0aW9uSGlzdG9yeVJlY29yZCkgOiBudWxsO1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgZ2V0dGluZyBub3RpZmljYXRpb24gYnkgSUQnLCB7IG5vdGlmaWNhdGlvbklkLCBlcnJvciB9KTtcclxuICAgICAgdGhyb3cgZXJyb3I7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBBcmNoaXZlIG9sZCByZWNvcmRzIChtYW51YWwgY2xlYW51cCwgVFRMIGhhbmRsZXMgYXV0b21hdGljIGRlbGV0aW9uKVxyXG4gICAqIFxyXG4gICAqIEBwYXJhbSBvbGRlclRoYW5EYXlzIC0gRGVsZXRlIHJlY29yZHMgb2xkZXIgdGhhbiB0aGlzIG1hbnkgZGF5c1xyXG4gICAqIEByZXR1cm5zIE51bWJlciBvZiByZWNvcmRzIGFyY2hpdmVkXHJcbiAgICovXHJcbiAgYXN5bmMgYXJjaGl2ZU9sZFJlY29yZHMob2xkZXJUaGFuRGF5czogbnVtYmVyKTogUHJvbWlzZTxudW1iZXI+IHtcclxuICAgIC8vIE5vdGU6IFRoaXMgaXMgYSBwbGFjZWhvbGRlci4gSW4gcHJvZHVjdGlvbiwgVFRMIGhhbmRsZXMgYXV0b21hdGljIGRlbGV0aW9uLlxyXG4gICAgLy8gVGhpcyBtZXRob2QgY291bGQgYmUgdXNlZCBmb3IgbWFudWFsIGFyY2hpdmFsIHRvIFMzIG9yIG90aGVyIHN0b3JhZ2UuXHJcbiAgICBjb25zb2xlLmxvZyhgQXJjaGl2ZSBvcGVyYXRpb24gZm9yIHJlY29yZHMgb2xkZXIgdGhhbiAke29sZGVyVGhhbkRheXN9IGRheXNgKTtcclxuICAgIHJldHVybiAwO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogUXVlcnkgaGlzdG9yeSBieSB1c2VyIElEXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBhc3luYyBxdWVyeUJ5VXNlcihxdWVyeTogTm90aWZpY2F0aW9uSGlzdG9yeVF1ZXJ5KTogUHJvbWlzZTxQYWdpbmF0ZWROb3RpZmljYXRpb25IaXN0b3J5PiB7XHJcbiAgICBjb25zdCBrZXlDb25kaXRpb25FeHByZXNzaW9uID0gcXVlcnkuc3RhcnREYXRlICYmIHF1ZXJ5LmVuZERhdGVcclxuICAgICAgPyAndXNlcklkID0gOnVzZXJJZCBBTkQgc2VudEF0IEJFVFdFRU4gOnN0YXJ0RGF0ZSBBTkQgOmVuZERhdGUnXHJcbiAgICAgIDogJ3VzZXJJZCA9IDp1c2VySWQnO1xyXG5cclxuICAgIGNvbnN0IGV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXM6IFJlY29yZDxzdHJpbmcsIGFueT4gPSB7XHJcbiAgICAgICc6dXNlcklkJzogcXVlcnkudXNlcklkLFxyXG4gICAgfTtcclxuXHJcbiAgICBpZiAocXVlcnkuc3RhcnREYXRlKSB7XHJcbiAgICAgIGV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXNbJzpzdGFydERhdGUnXSA9IHF1ZXJ5LnN0YXJ0RGF0ZTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAocXVlcnkuZW5kRGF0ZSkge1xyXG4gICAgICBleHByZXNzaW9uQXR0cmlidXRlVmFsdWVzWyc6ZW5kRGF0ZSddID0gcXVlcnkuZW5kRGF0ZTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBCdWlsZCBmaWx0ZXIgZXhwcmVzc2lvbiBmb3IgYWRkaXRpb25hbCBmaWx0ZXJzXHJcbiAgICBjb25zdCBmaWx0ZXJFeHByZXNzaW9uczogc3RyaW5nW10gPSBbXTtcclxuICAgIGlmIChxdWVyeS5jaGFubmVsKSB7XHJcbiAgICAgIGZpbHRlckV4cHJlc3Npb25zLnB1c2goJ2NoYW5uZWwgPSA6Y2hhbm5lbCcpO1xyXG4gICAgICBleHByZXNzaW9uQXR0cmlidXRlVmFsdWVzWyc6Y2hhbm5lbCddID0gcXVlcnkuY2hhbm5lbDtcclxuICAgIH1cclxuXHJcbiAgICBpZiAocXVlcnkuZGVsaXZlcnlTdGF0dXMpIHtcclxuICAgICAgZmlsdGVyRXhwcmVzc2lvbnMucHVzaCgnZGVsaXZlcnlTdGF0dXMgPSA6ZGVsaXZlcnlTdGF0dXMnKTtcclxuICAgICAgZXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlc1snOmRlbGl2ZXJ5U3RhdHVzJ10gPSBxdWVyeS5kZWxpdmVyeVN0YXR1cztcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBjb21tYW5kID0gbmV3IFF1ZXJ5Q29tbWFuZCh7XHJcbiAgICAgIFRhYmxlTmFtZTogdGhpcy50YWJsZU5hbWUsXHJcbiAgICAgIEluZGV4TmFtZTogJ1VzZXJUaW1lSW5kZXgnLFxyXG4gICAgICBLZXlDb25kaXRpb25FeHByZXNzaW9uOiBrZXlDb25kaXRpb25FeHByZXNzaW9uLFxyXG4gICAgICBGaWx0ZXJFeHByZXNzaW9uOiBmaWx0ZXJFeHByZXNzaW9ucy5sZW5ndGggPiAwID8gZmlsdGVyRXhwcmVzc2lvbnMuam9pbignIEFORCAnKSA6IHVuZGVmaW5lZCxcclxuICAgICAgRXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlczogZXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlcyxcclxuICAgICAgTGltaXQ6IHF1ZXJ5LmxpbWl0IHx8IDUwLFxyXG4gICAgICBFeGNsdXNpdmVTdGFydEtleTogcXVlcnkubmV4dFRva2VuID8gSlNPTi5wYXJzZShCdWZmZXIuZnJvbShxdWVyeS5uZXh0VG9rZW4sICdiYXNlNjQnKS50b1N0cmluZygpKSA6IHVuZGVmaW5lZCxcclxuICAgICAgU2NhbkluZGV4Rm9yd2FyZDogZmFsc2UsIC8vIE1vc3QgcmVjZW50IGZpcnN0XHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHRoaXMuZG9jQ2xpZW50LnNlbmQoY29tbWFuZCk7XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgcmVjb3JkczogKHJlc3BvbnNlLkl0ZW1zIHx8IFtdKSBhcyBOb3RpZmljYXRpb25IaXN0b3J5UmVjb3JkW10sXHJcbiAgICAgIG5leHRUb2tlbjogcmVzcG9uc2UuTGFzdEV2YWx1YXRlZEtleSBcclxuICAgICAgICA/IEJ1ZmZlci5mcm9tKEpTT04uc3RyaW5naWZ5KHJlc3BvbnNlLkxhc3RFdmFsdWF0ZWRLZXkpKS50b1N0cmluZygnYmFzZTY0JylcclxuICAgICAgICA6IHVuZGVmaW5lZCxcclxuICAgIH07XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBRdWVyeSBoaXN0b3J5IGJ5IGV2ZW50IHR5cGVcclxuICAgKi9cclxuICBwcml2YXRlIGFzeW5jIHF1ZXJ5QnlFdmVudFR5cGUocXVlcnk6IE5vdGlmaWNhdGlvbkhpc3RvcnlRdWVyeSk6IFByb21pc2U8UGFnaW5hdGVkTm90aWZpY2F0aW9uSGlzdG9yeT4ge1xyXG4gICAgY29uc3Qga2V5Q29uZGl0aW9uRXhwcmVzc2lvbiA9IHF1ZXJ5LnN0YXJ0RGF0ZSAmJiBxdWVyeS5lbmREYXRlXHJcbiAgICAgID8gJ2V2ZW50VHlwZSA9IDpldmVudFR5cGUgQU5EIHNlbnRBdCBCRVRXRUVOIDpzdGFydERhdGUgQU5EIDplbmREYXRlJ1xyXG4gICAgICA6ICdldmVudFR5cGUgPSA6ZXZlbnRUeXBlJztcclxuXHJcbiAgICBjb25zdCBleHByZXNzaW9uQXR0cmlidXRlVmFsdWVzOiBSZWNvcmQ8c3RyaW5nLCBhbnk+ID0ge1xyXG4gICAgICAnOmV2ZW50VHlwZSc6IHF1ZXJ5LmV2ZW50VHlwZSxcclxuICAgIH07XHJcblxyXG4gICAgaWYgKHF1ZXJ5LnN0YXJ0RGF0ZSkge1xyXG4gICAgICBleHByZXNzaW9uQXR0cmlidXRlVmFsdWVzWyc6c3RhcnREYXRlJ10gPSBxdWVyeS5zdGFydERhdGU7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHF1ZXJ5LmVuZERhdGUpIHtcclxuICAgICAgZXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlc1snOmVuZERhdGUnXSA9IHF1ZXJ5LmVuZERhdGU7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gQnVpbGQgZmlsdGVyIGV4cHJlc3Npb25cclxuICAgIGNvbnN0IGZpbHRlckV4cHJlc3Npb25zOiBzdHJpbmdbXSA9IFtdO1xyXG4gICAgaWYgKHF1ZXJ5LmNoYW5uZWwpIHtcclxuICAgICAgZmlsdGVyRXhwcmVzc2lvbnMucHVzaCgnY2hhbm5lbCA9IDpjaGFubmVsJyk7XHJcbiAgICAgIGV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXNbJzpjaGFubmVsJ10gPSBxdWVyeS5jaGFubmVsO1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChxdWVyeS5kZWxpdmVyeVN0YXR1cykge1xyXG4gICAgICBmaWx0ZXJFeHByZXNzaW9ucy5wdXNoKCdkZWxpdmVyeVN0YXR1cyA9IDpkZWxpdmVyeVN0YXR1cycpO1xyXG4gICAgICBleHByZXNzaW9uQXR0cmlidXRlVmFsdWVzWyc6ZGVsaXZlcnlTdGF0dXMnXSA9IHF1ZXJ5LmRlbGl2ZXJ5U3RhdHVzO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IGNvbW1hbmQgPSBuZXcgUXVlcnlDb21tYW5kKHtcclxuICAgICAgVGFibGVOYW1lOiB0aGlzLnRhYmxlTmFtZSxcclxuICAgICAgSW5kZXhOYW1lOiAnRXZlbnRUeXBlVGltZUluZGV4JyxcclxuICAgICAgS2V5Q29uZGl0aW9uRXhwcmVzc2lvbjoga2V5Q29uZGl0aW9uRXhwcmVzc2lvbixcclxuICAgICAgRmlsdGVyRXhwcmVzc2lvbjogZmlsdGVyRXhwcmVzc2lvbnMubGVuZ3RoID4gMCA/IGZpbHRlckV4cHJlc3Npb25zLmpvaW4oJyBBTkQgJykgOiB1bmRlZmluZWQsXHJcbiAgICAgIEV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXM6IGV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXMsXHJcbiAgICAgIExpbWl0OiBxdWVyeS5saW1pdCB8fCA1MCxcclxuICAgICAgRXhjbHVzaXZlU3RhcnRLZXk6IHF1ZXJ5Lm5leHRUb2tlbiA/IEpTT04ucGFyc2UoQnVmZmVyLmZyb20ocXVlcnkubmV4dFRva2VuLCAnYmFzZTY0JykudG9TdHJpbmcoKSkgOiB1bmRlZmluZWQsXHJcbiAgICAgIFNjYW5JbmRleEZvcndhcmQ6IGZhbHNlLCAvLyBNb3N0IHJlY2VudCBmaXJzdFxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCB0aGlzLmRvY0NsaWVudC5zZW5kKGNvbW1hbmQpO1xyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgIHJlY29yZHM6IChyZXNwb25zZS5JdGVtcyB8fCBbXSkgYXMgTm90aWZpY2F0aW9uSGlzdG9yeVJlY29yZFtdLFxyXG4gICAgICBuZXh0VG9rZW46IHJlc3BvbnNlLkxhc3RFdmFsdWF0ZWRLZXkgXHJcbiAgICAgICAgPyBCdWZmZXIuZnJvbShKU09OLnN0cmluZ2lmeShyZXNwb25zZS5MYXN0RXZhbHVhdGVkS2V5KSkudG9TdHJpbmcoJ2Jhc2U2NCcpXHJcbiAgICAgICAgOiB1bmRlZmluZWQsXHJcbiAgICB9O1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogU2NhbiB0YWJsZSB3aXRoIGZpbHRlcnMgKGxlc3MgZWZmaWNpZW50LCB1c2Ugd2hlbiBubyBHU0kgYXBwbGllcylcclxuICAgKi9cclxuICBwcml2YXRlIGFzeW5jIHNjYW5XaXRoRmlsdGVycyhxdWVyeTogTm90aWZpY2F0aW9uSGlzdG9yeVF1ZXJ5KTogUHJvbWlzZTxQYWdpbmF0ZWROb3RpZmljYXRpb25IaXN0b3J5PiB7XHJcbiAgICBjb25zdCBmaWx0ZXJFeHByZXNzaW9uczogc3RyaW5nW10gPSBbXTtcclxuICAgIGNvbnN0IGV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXM6IFJlY29yZDxzdHJpbmcsIGFueT4gPSB7fTtcclxuXHJcbiAgICBpZiAocXVlcnkuY2hhbm5lbCkge1xyXG4gICAgICBmaWx0ZXJFeHByZXNzaW9ucy5wdXNoKCdjaGFubmVsID0gOmNoYW5uZWwnKTtcclxuICAgICAgZXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlc1snOmNoYW5uZWwnXSA9IHF1ZXJ5LmNoYW5uZWw7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHF1ZXJ5LmRlbGl2ZXJ5U3RhdHVzKSB7XHJcbiAgICAgIGZpbHRlckV4cHJlc3Npb25zLnB1c2goJ2RlbGl2ZXJ5U3RhdHVzID0gOmRlbGl2ZXJ5U3RhdHVzJyk7XHJcbiAgICAgIGV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXNbJzpkZWxpdmVyeVN0YXR1cyddID0gcXVlcnkuZGVsaXZlcnlTdGF0dXM7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgY29tbWFuZCA9IG5ldyBTY2FuQ29tbWFuZCh7XHJcbiAgICAgIFRhYmxlTmFtZTogdGhpcy50YWJsZU5hbWUsXHJcbiAgICAgIEZpbHRlckV4cHJlc3Npb246IGZpbHRlckV4cHJlc3Npb25zLmxlbmd0aCA+IDAgPyBmaWx0ZXJFeHByZXNzaW9ucy5qb2luKCcgQU5EICcpIDogdW5kZWZpbmVkLFxyXG4gICAgICBFeHByZXNzaW9uQXR0cmlidXRlVmFsdWVzOiBPYmplY3Qua2V5cyhleHByZXNzaW9uQXR0cmlidXRlVmFsdWVzKS5sZW5ndGggPiAwID8gZXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlcyA6IHVuZGVmaW5lZCxcclxuICAgICAgTGltaXQ6IHF1ZXJ5LmxpbWl0IHx8IDUwLFxyXG4gICAgICBFeGNsdXNpdmVTdGFydEtleTogcXVlcnkubmV4dFRva2VuID8gSlNPTi5wYXJzZShCdWZmZXIuZnJvbShxdWVyeS5uZXh0VG9rZW4sICdiYXNlNjQnKS50b1N0cmluZygpKSA6IHVuZGVmaW5lZCxcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgdGhpcy5kb2NDbGllbnQuc2VuZChjb21tYW5kKTtcclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICByZWNvcmRzOiAocmVzcG9uc2UuSXRlbXMgfHwgW10pIGFzIE5vdGlmaWNhdGlvbkhpc3RvcnlSZWNvcmRbXSxcclxuICAgICAgbmV4dFRva2VuOiByZXNwb25zZS5MYXN0RXZhbHVhdGVkS2V5IFxyXG4gICAgICAgID8gQnVmZmVyLmZyb20oSlNPTi5zdHJpbmdpZnkocmVzcG9uc2UuTGFzdEV2YWx1YXRlZEtleSkpLnRvU3RyaW5nKCdiYXNlNjQnKVxyXG4gICAgICAgIDogdW5kZWZpbmVkLFxyXG4gICAgfTtcclxuICB9XHJcbn1cclxuXHJcbi8vIEV4cG9ydCBzaW5nbGV0b24gaW5zdGFuY2VcclxuZXhwb3J0IGNvbnN0IG5vdGlmaWNhdGlvbkhpc3RvcnlTZXJ2aWNlID0gbmV3IE5vdGlmaWNhdGlvbkhpc3RvcnlTZXJ2aWNlKCk7XHJcbiJdfQ==
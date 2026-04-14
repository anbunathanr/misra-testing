"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadProgressService = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
class UploadProgressService {
    dynamoClient;
    tableName;
    constructor() {
        const client = new client_dynamodb_1.DynamoDBClient({});
        this.dynamoClient = lib_dynamodb_1.DynamoDBDocumentClient.from(client);
        this.tableName = process.env.UPLOAD_PROGRESS_TABLE || 'UploadProgress';
    }
    /**
     * Create a new upload progress record
     */
    async createUploadProgress(fileId, userId, fileName, fileSize) {
        const now = Date.now();
        const ttl = Math.floor((now + (7 * 24 * 60 * 60 * 1000)) / 1000); // 7 days from now
        const record = {
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
            const command = new lib_dynamodb_1.PutCommand({
                TableName: this.tableName,
                Item: record,
            });
            await this.dynamoClient.send(command);
            console.log(`[UPLOAD-PROGRESS-SERVICE] ✓ Created progress record: ${fileId}`);
        }
        catch (error) {
            console.error('[UPLOAD-PROGRESS-SERVICE] Error creating upload progress:', error);
            throw new Error('Failed to create upload progress record');
        }
    }
    /**
     * Update upload progress
     */
    async updateUploadProgress(fileId, update) {
        try {
            const updateExpression = [
                'SET progress_percentage = :percentage',
                '#status = :status',
                'message = :message',
                'updated_at = :updatedAt'
            ];
            const expressionAttributeNames = {
                '#status': 'status',
            };
            const expressionAttributeValues = {
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
            const command = new lib_dynamodb_1.UpdateCommand({
                TableName: this.tableName,
                Key: { file_id: fileId },
                UpdateExpression: updateExpression.join(', '),
                ExpressionAttributeNames: expressionAttributeNames,
                ExpressionAttributeValues: expressionAttributeValues,
            });
            await this.dynamoClient.send(command);
            console.log(`[UPLOAD-PROGRESS-SERVICE] ✓ Updated progress: ${fileId} - ${update.progress_percentage}%`);
        }
        catch (error) {
            console.error('[UPLOAD-PROGRESS-SERVICE] Error updating upload progress:', error);
            throw new Error('Failed to update upload progress');
        }
    }
    /**
     * Get upload progress by file ID
     */
    async getUploadProgress(fileId) {
        try {
            const command = new lib_dynamodb_1.GetCommand({
                TableName: this.tableName,
                Key: { file_id: fileId },
            });
            const response = await this.dynamoClient.send(command);
            if (!response.Item) {
                return null;
            }
            return response.Item;
        }
        catch (error) {
            console.error('[UPLOAD-PROGRESS-SERVICE] Error getting upload progress:', error);
            throw new Error('Failed to retrieve upload progress');
        }
    }
    /**
     * Get all upload progress records for a user
     */
    async getUserUploadProgress(userId, limit = 10) {
        try {
            const command = new lib_dynamodb_1.QueryCommand({
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
            return response.Items;
        }
        catch (error) {
            console.error('[UPLOAD-PROGRESS-SERVICE] Error getting user upload progress:', error);
            throw new Error('Failed to retrieve user upload progress');
        }
    }
    /**
     * Get upload progress records by status
     */
    async getUploadProgressByStatus(status, limit = 50) {
        try {
            const command = new lib_dynamodb_1.QueryCommand({
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
            return response.Items;
        }
        catch (error) {
            console.error('[UPLOAD-PROGRESS-SERVICE] Error getting upload progress by status:', error);
            throw new Error('Failed to retrieve upload progress by status');
        }
    }
    /**
     * Mark upload as completed
     */
    async markUploadCompleted(fileId, message = 'Upload completed successfully') {
        await this.updateUploadProgress(fileId, {
            progress_percentage: 100,
            status: 'completed',
            message,
        });
    }
    /**
     * Mark upload as failed
     */
    async markUploadFailed(fileId, errorMessage) {
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
    calculateUploadSpeed(bytesUploaded, elapsedTimeMs) {
        if (elapsedTimeMs <= 0)
            return 0;
        return Math.round((bytesUploaded / elapsedTimeMs) * 1000); // bytes per second
    }
    /**
     * Estimate time remaining based on current progress
     */
    estimateTimeRemaining(progressPercentage, elapsedTimeMs, fileSize) {
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
    async cleanupOldUploads(olderThanDays = 7) {
        const cutoffTime = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);
        let deletedCount = 0;
        try {
            // Scan for old records (this is expensive, should be run as a scheduled job)
            const command = new lib_dynamodb_1.ScanCommand({
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
        }
        catch (error) {
            console.error('[UPLOAD-PROGRESS-SERVICE] Error cleaning up old uploads:', error);
            throw new Error('Failed to cleanup old uploads');
        }
    }
}
exports.UploadProgressService = UploadProgressService;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXBsb2FkLXByb2dyZXNzLXNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ1cGxvYWQtcHJvZ3Jlc3Mtc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSw4REFBMEQ7QUFDMUQsd0RBTytCO0FBZ0MvQixNQUFhLHFCQUFxQjtJQUNmLFlBQVksQ0FBeUI7SUFDckMsU0FBUyxDQUFTO0lBRW5DO1FBQ0UsTUFBTSxNQUFNLEdBQUcsSUFBSSxnQ0FBYyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ3RDLElBQUksQ0FBQyxZQUFZLEdBQUcscUNBQXNCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3hELElBQUksQ0FBQyxTQUFTLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsSUFBSSxnQkFBZ0IsQ0FBQztJQUN6RSxDQUFDO0lBRUQ7O09BRUc7SUFDSCxLQUFLLENBQUMsb0JBQW9CLENBQ3hCLE1BQWMsRUFDZCxNQUFjLEVBQ2QsUUFBZ0IsRUFDaEIsUUFBZ0I7UUFFaEIsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBQ3ZCLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLGtCQUFrQjtRQUVwRixNQUFNLE1BQU0sR0FBeUI7WUFDbkMsT0FBTyxFQUFFLE1BQU07WUFDZixPQUFPLEVBQUUsTUFBTTtZQUNmLFNBQVMsRUFBRSxRQUFRO1lBQ25CLFNBQVMsRUFBRSxRQUFRO1lBQ25CLG1CQUFtQixFQUFFLENBQUM7WUFDdEIsTUFBTSxFQUFFLFVBQVU7WUFDbEIsT0FBTyxFQUFFLHdCQUF3QjtZQUNqQyxVQUFVLEVBQUUsR0FBRztZQUNmLFVBQVUsRUFBRSxHQUFHO1lBQ2YsR0FBRztTQUNKLENBQUM7UUFFRixJQUFJLENBQUM7WUFDSCxNQUFNLE9BQU8sR0FBRyxJQUFJLHlCQUFVLENBQUM7Z0JBQzdCLFNBQVMsRUFBRSxJQUFJLENBQUMsU0FBUztnQkFDekIsSUFBSSxFQUFFLE1BQU07YUFDYixDQUFDLENBQUM7WUFFSCxNQUFNLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ3RDLE9BQU8sQ0FBQyxHQUFHLENBQUMsd0RBQXdELE1BQU0sRUFBRSxDQUFDLENBQUM7UUFDaEYsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDZixPQUFPLENBQUMsS0FBSyxDQUFDLDJEQUEyRCxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQ2xGLE1BQU0sSUFBSSxLQUFLLENBQUMseUNBQXlDLENBQUMsQ0FBQztRQUM3RCxDQUFDO0lBQ0gsQ0FBQztJQUVEOztPQUVHO0lBQ0gsS0FBSyxDQUFDLG9CQUFvQixDQUN4QixNQUFjLEVBQ2QsTUFBNEI7UUFFNUIsSUFBSSxDQUFDO1lBQ0gsTUFBTSxnQkFBZ0IsR0FBRztnQkFDdkIsdUNBQXVDO2dCQUN2QyxtQkFBbUI7Z0JBQ25CLG9CQUFvQjtnQkFDcEIseUJBQXlCO2FBQzFCLENBQUM7WUFFRixNQUFNLHdCQUF3QixHQUEyQjtnQkFDdkQsU0FBUyxFQUFFLFFBQVE7YUFDcEIsQ0FBQztZQUVGLE1BQU0seUJBQXlCLEdBQXdCO2dCQUNyRCxhQUFhLEVBQUUsTUFBTSxDQUFDLG1CQUFtQjtnQkFDekMsU0FBUyxFQUFFLE1BQU0sQ0FBQyxNQUFNO2dCQUN4QixVQUFVLEVBQUUsTUFBTSxDQUFDLE9BQU87Z0JBQzFCLFlBQVksRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFO2FBQ3pCLENBQUM7WUFFRixJQUFJLE1BQU0sQ0FBQyxhQUFhLEVBQUUsQ0FBQztnQkFDekIsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLCtCQUErQixDQUFDLENBQUM7Z0JBQ3ZELHlCQUF5QixDQUFDLGVBQWUsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxhQUFhLENBQUM7WUFDcEUsQ0FBQztZQUVELElBQUksTUFBTSxDQUFDLGNBQWMsS0FBSyxTQUFTLEVBQUUsQ0FBQztnQkFDeEMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLGlDQUFpQyxDQUFDLENBQUM7Z0JBQ3pELHlCQUF5QixDQUFDLGdCQUFnQixDQUFDLEdBQUcsTUFBTSxDQUFDLGNBQWMsQ0FBQztZQUN0RSxDQUFDO1lBRUQsSUFBSSxNQUFNLENBQUMsWUFBWSxLQUFLLFNBQVMsRUFBRSxDQUFDO2dCQUN0QyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsNkJBQTZCLENBQUMsQ0FBQztnQkFDckQseUJBQXlCLENBQUMsY0FBYyxDQUFDLEdBQUcsTUFBTSxDQUFDLFlBQVksQ0FBQztZQUNsRSxDQUFDO1lBRUQsTUFBTSxPQUFPLEdBQUcsSUFBSSw0QkFBYSxDQUFDO2dCQUNoQyxTQUFTLEVBQUUsSUFBSSxDQUFDLFNBQVM7Z0JBQ3pCLEdBQUcsRUFBRSxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUU7Z0JBQ3hCLGdCQUFnQixFQUFFLGdCQUFnQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUM7Z0JBQzdDLHdCQUF3QixFQUFFLHdCQUF3QjtnQkFDbEQseUJBQXlCLEVBQUUseUJBQXlCO2FBQ3JELENBQUMsQ0FBQztZQUVILE1BQU0sSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDdEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxpREFBaUQsTUFBTSxNQUFNLE1BQU0sQ0FBQyxtQkFBbUIsR0FBRyxDQUFDLENBQUM7UUFDMUcsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDZixPQUFPLENBQUMsS0FBSyxDQUFDLDJEQUEyRCxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQ2xGLE1BQU0sSUFBSSxLQUFLLENBQUMsa0NBQWtDLENBQUMsQ0FBQztRQUN0RCxDQUFDO0lBQ0gsQ0FBQztJQUVEOztPQUVHO0lBQ0gsS0FBSyxDQUFDLGlCQUFpQixDQUFDLE1BQWM7UUFDcEMsSUFBSSxDQUFDO1lBQ0gsTUFBTSxPQUFPLEdBQUcsSUFBSSx5QkFBVSxDQUFDO2dCQUM3QixTQUFTLEVBQUUsSUFBSSxDQUFDLFNBQVM7Z0JBQ3pCLEdBQUcsRUFBRSxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUU7YUFDekIsQ0FBQyxDQUFDO1lBRUgsTUFBTSxRQUFRLEdBQUcsTUFBTSxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUV2RCxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxDQUFDO2dCQUNuQixPQUFPLElBQUksQ0FBQztZQUNkLENBQUM7WUFFRCxPQUFPLFFBQVEsQ0FBQyxJQUE0QixDQUFDO1FBQy9DLENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2YsT0FBTyxDQUFDLEtBQUssQ0FBQywwREFBMEQsRUFBRSxLQUFLLENBQUMsQ0FBQztZQUNqRixNQUFNLElBQUksS0FBSyxDQUFDLG9DQUFvQyxDQUFDLENBQUM7UUFDeEQsQ0FBQztJQUNILENBQUM7SUFFRDs7T0FFRztJQUNILEtBQUssQ0FBQyxxQkFBcUIsQ0FBQyxNQUFjLEVBQUUsUUFBZ0IsRUFBRTtRQUM1RCxJQUFJLENBQUM7WUFDSCxNQUFNLE9BQU8sR0FBRyxJQUFJLDJCQUFZLENBQUM7Z0JBQy9CLFNBQVMsRUFBRSxJQUFJLENBQUMsU0FBUztnQkFDekIsU0FBUyxFQUFFLFdBQVc7Z0JBQ3RCLHNCQUFzQixFQUFFLG1CQUFtQjtnQkFDM0MseUJBQXlCLEVBQUU7b0JBQ3pCLFNBQVMsRUFBRSxNQUFNO2lCQUNsQjtnQkFDRCxnQkFBZ0IsRUFBRSxLQUFLLEVBQUUsb0RBQW9EO2dCQUM3RSxLQUFLLEVBQUUsS0FBSzthQUNiLENBQUMsQ0FBQztZQUVILE1BQU0sUUFBUSxHQUFHLE1BQU0sSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7WUFFdkQsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsQ0FBQztnQkFDcEIsT0FBTyxFQUFFLENBQUM7WUFDWixDQUFDO1lBRUQsT0FBTyxRQUFRLENBQUMsS0FBK0IsQ0FBQztRQUNsRCxDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNmLE9BQU8sQ0FBQyxLQUFLLENBQUMsK0RBQStELEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDdEYsTUFBTSxJQUFJLEtBQUssQ0FBQyx5Q0FBeUMsQ0FBQyxDQUFDO1FBQzdELENBQUM7SUFDSCxDQUFDO0lBRUQ7O09BRUc7SUFDSCxLQUFLLENBQUMseUJBQXlCLENBQzdCLE1BQXlELEVBQ3pELFFBQWdCLEVBQUU7UUFFbEIsSUFBSSxDQUFDO1lBQ0gsTUFBTSxPQUFPLEdBQUcsSUFBSSwyQkFBWSxDQUFDO2dCQUMvQixTQUFTLEVBQUUsSUFBSSxDQUFDLFNBQVM7Z0JBQ3pCLFNBQVMsRUFBRSxhQUFhO2dCQUN4QixzQkFBc0IsRUFBRSxtQkFBbUI7Z0JBQzNDLHdCQUF3QixFQUFFO29CQUN4QixTQUFTLEVBQUUsUUFBUTtpQkFDcEI7Z0JBQ0QseUJBQXlCLEVBQUU7b0JBQ3pCLFNBQVMsRUFBRSxNQUFNO2lCQUNsQjtnQkFDRCxnQkFBZ0IsRUFBRSxLQUFLLEVBQUUsb0RBQW9EO2dCQUM3RSxLQUFLLEVBQUUsS0FBSzthQUNiLENBQUMsQ0FBQztZQUVILE1BQU0sUUFBUSxHQUFHLE1BQU0sSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7WUFFdkQsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsQ0FBQztnQkFDcEIsT0FBTyxFQUFFLENBQUM7WUFDWixDQUFDO1lBRUQsT0FBTyxRQUFRLENBQUMsS0FBK0IsQ0FBQztRQUNsRCxDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNmLE9BQU8sQ0FBQyxLQUFLLENBQUMsb0VBQW9FLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDM0YsTUFBTSxJQUFJLEtBQUssQ0FBQyw4Q0FBOEMsQ0FBQyxDQUFDO1FBQ2xFLENBQUM7SUFDSCxDQUFDO0lBRUQ7O09BRUc7SUFDSCxLQUFLLENBQUMsbUJBQW1CLENBQUMsTUFBYyxFQUFFLFVBQWtCLCtCQUErQjtRQUN6RixNQUFNLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxNQUFNLEVBQUU7WUFDdEMsbUJBQW1CLEVBQUUsR0FBRztZQUN4QixNQUFNLEVBQUUsV0FBVztZQUNuQixPQUFPO1NBQ1IsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVEOztPQUVHO0lBQ0gsS0FBSyxDQUFDLGdCQUFnQixDQUFDLE1BQWMsRUFBRSxZQUFvQjtRQUN6RCxNQUFNLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxNQUFNLEVBQUU7WUFDdEMsbUJBQW1CLEVBQUUsQ0FBQztZQUN0QixNQUFNLEVBQUUsUUFBUTtZQUNoQixPQUFPLEVBQUUsZUFBZTtZQUN4QixhQUFhLEVBQUUsWUFBWTtTQUM1QixDQUFDLENBQUM7SUFDTCxDQUFDO0lBRUQ7O09BRUc7SUFDSCxvQkFBb0IsQ0FDbEIsYUFBcUIsRUFDckIsYUFBcUI7UUFFckIsSUFBSSxhQUFhLElBQUksQ0FBQztZQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQ2pDLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLGFBQWEsR0FBRyxhQUFhLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLG1CQUFtQjtJQUNoRixDQUFDO0lBRUQ7O09BRUc7SUFDSCxxQkFBcUIsQ0FDbkIsa0JBQTBCLEVBQzFCLGFBQXFCLEVBQ3JCLFFBQWdCO1FBRWhCLElBQUksa0JBQWtCLElBQUksQ0FBQyxFQUFFLENBQUM7WUFDNUIsZ0RBQWdEO1lBQ2hELE1BQU0sVUFBVSxHQUFHLFFBQVEsR0FBRyxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsQ0FBQztZQUM1QyxPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLFVBQVUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsdUJBQXVCO1FBQzNFLENBQUM7UUFFRCxNQUFNLFlBQVksR0FBRyxrQkFBa0IsR0FBRyxhQUFhLENBQUMsQ0FBQyw2QkFBNkI7UUFDdEYsTUFBTSxtQkFBbUIsR0FBRyxHQUFHLEdBQUcsa0JBQWtCLENBQUM7UUFDckQsTUFBTSxvQkFBb0IsR0FBRyxtQkFBbUIsR0FBRyxZQUFZLENBQUM7UUFFaEUsa0RBQWtEO1FBQ2xELE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxvQkFBb0IsR0FBRyxJQUFJLENBQUMsQ0FBQztRQUNqRSxPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxDQUFDLG1CQUFtQjtJQUMxRSxDQUFDO0lBRUQ7O09BRUc7SUFDSCxLQUFLLENBQUMsaUJBQWlCLENBQUMsZ0JBQXdCLENBQUM7UUFDL0MsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsYUFBYSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDO1FBQ3RFLElBQUksWUFBWSxHQUFHLENBQUMsQ0FBQztRQUVyQixJQUFJLENBQUM7WUFDSCw2RUFBNkU7WUFDN0UsTUFBTSxPQUFPLEdBQUcsSUFBSSwwQkFBVyxDQUFDO2dCQUM5QixTQUFTLEVBQUUsSUFBSSxDQUFDLFNBQVM7Z0JBQ3pCLGdCQUFnQixFQUFFLHNFQUFzRTtnQkFDeEYsd0JBQXdCLEVBQUU7b0JBQ3hCLFNBQVMsRUFBRSxRQUFRO2lCQUNwQjtnQkFDRCx5QkFBeUIsRUFBRTtvQkFDekIsU0FBUyxFQUFFLFVBQVU7b0JBQ3JCLFlBQVksRUFBRSxXQUFXO29CQUN6QixTQUFTLEVBQUUsUUFBUTtpQkFDcEI7YUFDRixDQUFDLENBQUM7WUFFSCxNQUFNLFFBQVEsR0FBRyxNQUFNLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBRXZELElBQUksUUFBUSxDQUFDLEtBQUssSUFBSSxRQUFRLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFDaEQsbUVBQW1FO2dCQUNuRSxpQ0FBaUM7Z0JBQ2pDLFlBQVksR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQztnQkFDckMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxtQ0FBbUMsWUFBWSxpQ0FBaUMsQ0FBQyxDQUFDO1lBQ2hHLENBQUM7WUFFRCxPQUFPLFlBQVksQ0FBQztRQUN0QixDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNmLE9BQU8sQ0FBQyxLQUFLLENBQUMsMERBQTBELEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDakYsTUFBTSxJQUFJLEtBQUssQ0FBQywrQkFBK0IsQ0FBQyxDQUFDO1FBQ25ELENBQUM7SUFDSCxDQUFDO0NBQ0Y7QUEvUkQsc0RBK1JDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgRHluYW1vREJDbGllbnQgfSBmcm9tICdAYXdzLXNkay9jbGllbnQtZHluYW1vZGInO1xyXG5pbXBvcnQgeyBcclxuICBEeW5hbW9EQkRvY3VtZW50Q2xpZW50LCBcclxuICBQdXRDb21tYW5kLCBcclxuICBHZXRDb21tYW5kLCBcclxuICBVcGRhdGVDb21tYW5kLFxyXG4gIFF1ZXJ5Q29tbWFuZCxcclxuICBTY2FuQ29tbWFuZCBcclxufSBmcm9tICdAYXdzLXNkay9saWItZHluYW1vZGInO1xyXG5cclxuLyoqXHJcbiAqIFNlcnZpY2UgZm9yIG1hbmFnaW5nIGZpbGUgdXBsb2FkIHByb2dyZXNzIHRyYWNraW5nXHJcbiAqIFRhc2sgNC4yOiBCdWlsZCBmaWxlIHVwbG9hZCBwcm9ncmVzcyBtb25pdG9yaW5nXHJcbiAqL1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBVcGxvYWRQcm9ncmVzc1JlY29yZCB7XHJcbiAgZmlsZV9pZDogc3RyaW5nO1xyXG4gIHVzZXJfaWQ6IHN0cmluZztcclxuICBmaWxlX25hbWU6IHN0cmluZztcclxuICBmaWxlX3NpemU6IG51bWJlcjtcclxuICBwcm9ncmVzc19wZXJjZW50YWdlOiBudW1iZXI7XHJcbiAgc3RhdHVzOiAnc3RhcnRpbmcnIHwgJ3VwbG9hZGluZycgfCAnY29tcGxldGVkJyB8ICdmYWlsZWQnO1xyXG4gIG1lc3NhZ2U6IHN0cmluZztcclxuICBjcmVhdGVkX2F0OiBudW1iZXI7XHJcbiAgdXBkYXRlZF9hdDogbnVtYmVyO1xyXG4gIHR0bDogbnVtYmVyO1xyXG4gIGVycm9yX21lc3NhZ2U/OiBzdHJpbmc7XHJcbiAgYnl0ZXNfdXBsb2FkZWQ/OiBudW1iZXI7XHJcbiAgdXBsb2FkX3NwZWVkPzogbnVtYmVyO1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFVwbG9hZFByb2dyZXNzVXBkYXRlIHtcclxuICBwcm9ncmVzc19wZXJjZW50YWdlOiBudW1iZXI7XHJcbiAgc3RhdHVzOiAnc3RhcnRpbmcnIHwgJ3VwbG9hZGluZycgfCAnY29tcGxldGVkJyB8ICdmYWlsZWQnO1xyXG4gIG1lc3NhZ2U6IHN0cmluZztcclxuICBlcnJvcl9tZXNzYWdlPzogc3RyaW5nO1xyXG4gIGJ5dGVzX3VwbG9hZGVkPzogbnVtYmVyO1xyXG4gIHVwbG9hZF9zcGVlZD86IG51bWJlcjtcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIFVwbG9hZFByb2dyZXNzU2VydmljZSB7XHJcbiAgcHJpdmF0ZSByZWFkb25seSBkeW5hbW9DbGllbnQ6IER5bmFtb0RCRG9jdW1lbnRDbGllbnQ7XHJcbiAgcHJpdmF0ZSByZWFkb25seSB0YWJsZU5hbWU6IHN0cmluZztcclxuXHJcbiAgY29uc3RydWN0b3IoKSB7XHJcbiAgICBjb25zdCBjbGllbnQgPSBuZXcgRHluYW1vREJDbGllbnQoe30pO1xyXG4gICAgdGhpcy5keW5hbW9DbGllbnQgPSBEeW5hbW9EQkRvY3VtZW50Q2xpZW50LmZyb20oY2xpZW50KTtcclxuICAgIHRoaXMudGFibGVOYW1lID0gcHJvY2Vzcy5lbnYuVVBMT0FEX1BST0dSRVNTX1RBQkxFIHx8ICdVcGxvYWRQcm9ncmVzcyc7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBDcmVhdGUgYSBuZXcgdXBsb2FkIHByb2dyZXNzIHJlY29yZFxyXG4gICAqL1xyXG4gIGFzeW5jIGNyZWF0ZVVwbG9hZFByb2dyZXNzKFxyXG4gICAgZmlsZUlkOiBzdHJpbmcsXHJcbiAgICB1c2VySWQ6IHN0cmluZyxcclxuICAgIGZpbGVOYW1lOiBzdHJpbmcsXHJcbiAgICBmaWxlU2l6ZTogbnVtYmVyXHJcbiAgKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICBjb25zdCBub3cgPSBEYXRlLm5vdygpO1xyXG4gICAgY29uc3QgdHRsID0gTWF0aC5mbG9vcigobm93ICsgKDcgKiAyNCAqIDYwICogNjAgKiAxMDAwKSkgLyAxMDAwKTsgLy8gNyBkYXlzIGZyb20gbm93XHJcblxyXG4gICAgY29uc3QgcmVjb3JkOiBVcGxvYWRQcm9ncmVzc1JlY29yZCA9IHtcclxuICAgICAgZmlsZV9pZDogZmlsZUlkLFxyXG4gICAgICB1c2VyX2lkOiB1c2VySWQsXHJcbiAgICAgIGZpbGVfbmFtZTogZmlsZU5hbWUsXHJcbiAgICAgIGZpbGVfc2l6ZTogZmlsZVNpemUsXHJcbiAgICAgIHByb2dyZXNzX3BlcmNlbnRhZ2U6IDAsXHJcbiAgICAgIHN0YXR1czogJ3N0YXJ0aW5nJyxcclxuICAgICAgbWVzc2FnZTogJ0luaXRpYWxpemluZyB1cGxvYWQuLi4nLFxyXG4gICAgICBjcmVhdGVkX2F0OiBub3csXHJcbiAgICAgIHVwZGF0ZWRfYXQ6IG5vdyxcclxuICAgICAgdHRsLFxyXG4gICAgfTtcclxuXHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCBjb21tYW5kID0gbmV3IFB1dENvbW1hbmQoe1xyXG4gICAgICAgIFRhYmxlTmFtZTogdGhpcy50YWJsZU5hbWUsXHJcbiAgICAgICAgSXRlbTogcmVjb3JkLFxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGF3YWl0IHRoaXMuZHluYW1vQ2xpZW50LnNlbmQoY29tbWFuZCk7XHJcbiAgICAgIGNvbnNvbGUubG9nKGBbVVBMT0FELVBST0dSRVNTLVNFUlZJQ0VdIOKckyBDcmVhdGVkIHByb2dyZXNzIHJlY29yZDogJHtmaWxlSWR9YCk7XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBjb25zb2xlLmVycm9yKCdbVVBMT0FELVBST0dSRVNTLVNFUlZJQ0VdIEVycm9yIGNyZWF0aW5nIHVwbG9hZCBwcm9ncmVzczonLCBlcnJvcik7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcignRmFpbGVkIHRvIGNyZWF0ZSB1cGxvYWQgcHJvZ3Jlc3MgcmVjb3JkJyk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBVcGRhdGUgdXBsb2FkIHByb2dyZXNzXHJcbiAgICovXHJcbiAgYXN5bmMgdXBkYXRlVXBsb2FkUHJvZ3Jlc3MoXHJcbiAgICBmaWxlSWQ6IHN0cmluZyxcclxuICAgIHVwZGF0ZTogVXBsb2FkUHJvZ3Jlc3NVcGRhdGVcclxuICApOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IHVwZGF0ZUV4cHJlc3Npb24gPSBbXHJcbiAgICAgICAgJ1NFVCBwcm9ncmVzc19wZXJjZW50YWdlID0gOnBlcmNlbnRhZ2UnLFxyXG4gICAgICAgICcjc3RhdHVzID0gOnN0YXR1cycsXHJcbiAgICAgICAgJ21lc3NhZ2UgPSA6bWVzc2FnZScsXHJcbiAgICAgICAgJ3VwZGF0ZWRfYXQgPSA6dXBkYXRlZEF0J1xyXG4gICAgICBdO1xyXG5cclxuICAgICAgY29uc3QgZXhwcmVzc2lvbkF0dHJpYnV0ZU5hbWVzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge1xyXG4gICAgICAgICcjc3RhdHVzJzogJ3N0YXR1cycsXHJcbiAgICAgIH07XHJcblxyXG4gICAgICBjb25zdCBleHByZXNzaW9uQXR0cmlidXRlVmFsdWVzOiBSZWNvcmQ8c3RyaW5nLCBhbnk+ID0ge1xyXG4gICAgICAgICc6cGVyY2VudGFnZSc6IHVwZGF0ZS5wcm9ncmVzc19wZXJjZW50YWdlLFxyXG4gICAgICAgICc6c3RhdHVzJzogdXBkYXRlLnN0YXR1cyxcclxuICAgICAgICAnOm1lc3NhZ2UnOiB1cGRhdGUubWVzc2FnZSxcclxuICAgICAgICAnOnVwZGF0ZWRBdCc6IERhdGUubm93KCksXHJcbiAgICAgIH07XHJcblxyXG4gICAgICBpZiAodXBkYXRlLmVycm9yX21lc3NhZ2UpIHtcclxuICAgICAgICB1cGRhdGVFeHByZXNzaW9uLnB1c2goJ2Vycm9yX21lc3NhZ2UgPSA6ZXJyb3JNZXNzYWdlJyk7XHJcbiAgICAgICAgZXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlc1snOmVycm9yTWVzc2FnZSddID0gdXBkYXRlLmVycm9yX21lc3NhZ2U7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmICh1cGRhdGUuYnl0ZXNfdXBsb2FkZWQgIT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgIHVwZGF0ZUV4cHJlc3Npb24ucHVzaCgnYnl0ZXNfdXBsb2FkZWQgPSA6Ynl0ZXNVcGxvYWRlZCcpO1xyXG4gICAgICAgIGV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXNbJzpieXRlc1VwbG9hZGVkJ10gPSB1cGRhdGUuYnl0ZXNfdXBsb2FkZWQ7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmICh1cGRhdGUudXBsb2FkX3NwZWVkICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICB1cGRhdGVFeHByZXNzaW9uLnB1c2goJ3VwbG9hZF9zcGVlZCA9IDp1cGxvYWRTcGVlZCcpO1xyXG4gICAgICAgIGV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXNbJzp1cGxvYWRTcGVlZCddID0gdXBkYXRlLnVwbG9hZF9zcGVlZDtcclxuICAgICAgfVxyXG5cclxuICAgICAgY29uc3QgY29tbWFuZCA9IG5ldyBVcGRhdGVDb21tYW5kKHtcclxuICAgICAgICBUYWJsZU5hbWU6IHRoaXMudGFibGVOYW1lLFxyXG4gICAgICAgIEtleTogeyBmaWxlX2lkOiBmaWxlSWQgfSxcclxuICAgICAgICBVcGRhdGVFeHByZXNzaW9uOiB1cGRhdGVFeHByZXNzaW9uLmpvaW4oJywgJyksXHJcbiAgICAgICAgRXhwcmVzc2lvbkF0dHJpYnV0ZU5hbWVzOiBleHByZXNzaW9uQXR0cmlidXRlTmFtZXMsXHJcbiAgICAgICAgRXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlczogZXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlcyxcclxuICAgICAgfSk7XHJcblxyXG4gICAgICBhd2FpdCB0aGlzLmR5bmFtb0NsaWVudC5zZW5kKGNvbW1hbmQpO1xyXG4gICAgICBjb25zb2xlLmxvZyhgW1VQTE9BRC1QUk9HUkVTUy1TRVJWSUNFXSDinJMgVXBkYXRlZCBwcm9ncmVzczogJHtmaWxlSWR9IC0gJHt1cGRhdGUucHJvZ3Jlc3NfcGVyY2VudGFnZX0lYCk7XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBjb25zb2xlLmVycm9yKCdbVVBMT0FELVBST0dSRVNTLVNFUlZJQ0VdIEVycm9yIHVwZGF0aW5nIHVwbG9hZCBwcm9ncmVzczonLCBlcnJvcik7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcignRmFpbGVkIHRvIHVwZGF0ZSB1cGxvYWQgcHJvZ3Jlc3MnKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEdldCB1cGxvYWQgcHJvZ3Jlc3MgYnkgZmlsZSBJRFxyXG4gICAqL1xyXG4gIGFzeW5jIGdldFVwbG9hZFByb2dyZXNzKGZpbGVJZDogc3RyaW5nKTogUHJvbWlzZTxVcGxvYWRQcm9ncmVzc1JlY29yZCB8IG51bGw+IHtcclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IGNvbW1hbmQgPSBuZXcgR2V0Q29tbWFuZCh7XHJcbiAgICAgICAgVGFibGVOYW1lOiB0aGlzLnRhYmxlTmFtZSxcclxuICAgICAgICBLZXk6IHsgZmlsZV9pZDogZmlsZUlkIH0sXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCB0aGlzLmR5bmFtb0NsaWVudC5zZW5kKGNvbW1hbmQpO1xyXG5cclxuICAgICAgaWYgKCFyZXNwb25zZS5JdGVtKSB7XHJcbiAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHJldHVybiByZXNwb25zZS5JdGVtIGFzIFVwbG9hZFByb2dyZXNzUmVjb3JkO1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc29sZS5lcnJvcignW1VQTE9BRC1QUk9HUkVTUy1TRVJWSUNFXSBFcnJvciBnZXR0aW5nIHVwbG9hZCBwcm9ncmVzczonLCBlcnJvcik7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcignRmFpbGVkIHRvIHJldHJpZXZlIHVwbG9hZCBwcm9ncmVzcycpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR2V0IGFsbCB1cGxvYWQgcHJvZ3Jlc3MgcmVjb3JkcyBmb3IgYSB1c2VyXHJcbiAgICovXHJcbiAgYXN5bmMgZ2V0VXNlclVwbG9hZFByb2dyZXNzKHVzZXJJZDogc3RyaW5nLCBsaW1pdDogbnVtYmVyID0gMTApOiBQcm9taXNlPFVwbG9hZFByb2dyZXNzUmVjb3JkW10+IHtcclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IGNvbW1hbmQgPSBuZXcgUXVlcnlDb21tYW5kKHtcclxuICAgICAgICBUYWJsZU5hbWU6IHRoaXMudGFibGVOYW1lLFxyXG4gICAgICAgIEluZGV4TmFtZTogJ1VzZXJJbmRleCcsXHJcbiAgICAgICAgS2V5Q29uZGl0aW9uRXhwcmVzc2lvbjogJ3VzZXJfaWQgPSA6dXNlcklkJyxcclxuICAgICAgICBFeHByZXNzaW9uQXR0cmlidXRlVmFsdWVzOiB7XHJcbiAgICAgICAgICAnOnVzZXJJZCc6IHVzZXJJZCxcclxuICAgICAgICB9LFxyXG4gICAgICAgIFNjYW5JbmRleEZvcndhcmQ6IGZhbHNlLCAvLyBTb3J0IGJ5IGNyZWF0ZWRfYXQgZGVzY2VuZGluZyAobW9zdCByZWNlbnQgZmlyc3QpXHJcbiAgICAgICAgTGltaXQ6IGxpbWl0LFxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgdGhpcy5keW5hbW9DbGllbnQuc2VuZChjb21tYW5kKTtcclxuXHJcbiAgICAgIGlmICghcmVzcG9uc2UuSXRlbXMpIHtcclxuICAgICAgICByZXR1cm4gW107XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHJldHVybiByZXNwb25zZS5JdGVtcyBhcyBVcGxvYWRQcm9ncmVzc1JlY29yZFtdO1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc29sZS5lcnJvcignW1VQTE9BRC1QUk9HUkVTUy1TRVJWSUNFXSBFcnJvciBnZXR0aW5nIHVzZXIgdXBsb2FkIHByb2dyZXNzOicsIGVycm9yKTtcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdGYWlsZWQgdG8gcmV0cmlldmUgdXNlciB1cGxvYWQgcHJvZ3Jlc3MnKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEdldCB1cGxvYWQgcHJvZ3Jlc3MgcmVjb3JkcyBieSBzdGF0dXNcclxuICAgKi9cclxuICBhc3luYyBnZXRVcGxvYWRQcm9ncmVzc0J5U3RhdHVzKFxyXG4gICAgc3RhdHVzOiAnc3RhcnRpbmcnIHwgJ3VwbG9hZGluZycgfCAnY29tcGxldGVkJyB8ICdmYWlsZWQnLFxyXG4gICAgbGltaXQ6IG51bWJlciA9IDUwXHJcbiAgKTogUHJvbWlzZTxVcGxvYWRQcm9ncmVzc1JlY29yZFtdPiB7XHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCBjb21tYW5kID0gbmV3IFF1ZXJ5Q29tbWFuZCh7XHJcbiAgICAgICAgVGFibGVOYW1lOiB0aGlzLnRhYmxlTmFtZSxcclxuICAgICAgICBJbmRleE5hbWU6ICdTdGF0dXNJbmRleCcsXHJcbiAgICAgICAgS2V5Q29uZGl0aW9uRXhwcmVzc2lvbjogJyNzdGF0dXMgPSA6c3RhdHVzJyxcclxuICAgICAgICBFeHByZXNzaW9uQXR0cmlidXRlTmFtZXM6IHtcclxuICAgICAgICAgICcjc3RhdHVzJzogJ3N0YXR1cycsXHJcbiAgICAgICAgfSxcclxuICAgICAgICBFeHByZXNzaW9uQXR0cmlidXRlVmFsdWVzOiB7XHJcbiAgICAgICAgICAnOnN0YXR1cyc6IHN0YXR1cyxcclxuICAgICAgICB9LFxyXG4gICAgICAgIFNjYW5JbmRleEZvcndhcmQ6IGZhbHNlLCAvLyBTb3J0IGJ5IHVwZGF0ZWRfYXQgZGVzY2VuZGluZyAobW9zdCByZWNlbnQgZmlyc3QpXHJcbiAgICAgICAgTGltaXQ6IGxpbWl0LFxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgdGhpcy5keW5hbW9DbGllbnQuc2VuZChjb21tYW5kKTtcclxuXHJcbiAgICAgIGlmICghcmVzcG9uc2UuSXRlbXMpIHtcclxuICAgICAgICByZXR1cm4gW107XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHJldHVybiByZXNwb25zZS5JdGVtcyBhcyBVcGxvYWRQcm9ncmVzc1JlY29yZFtdO1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc29sZS5lcnJvcignW1VQTE9BRC1QUk9HUkVTUy1TRVJWSUNFXSBFcnJvciBnZXR0aW5nIHVwbG9hZCBwcm9ncmVzcyBieSBzdGF0dXM6JywgZXJyb3IpO1xyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ZhaWxlZCB0byByZXRyaWV2ZSB1cGxvYWQgcHJvZ3Jlc3MgYnkgc3RhdHVzJyk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBNYXJrIHVwbG9hZCBhcyBjb21wbGV0ZWRcclxuICAgKi9cclxuICBhc3luYyBtYXJrVXBsb2FkQ29tcGxldGVkKGZpbGVJZDogc3RyaW5nLCBtZXNzYWdlOiBzdHJpbmcgPSAnVXBsb2FkIGNvbXBsZXRlZCBzdWNjZXNzZnVsbHknKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICBhd2FpdCB0aGlzLnVwZGF0ZVVwbG9hZFByb2dyZXNzKGZpbGVJZCwge1xyXG4gICAgICBwcm9ncmVzc19wZXJjZW50YWdlOiAxMDAsXHJcbiAgICAgIHN0YXR1czogJ2NvbXBsZXRlZCcsXHJcbiAgICAgIG1lc3NhZ2UsXHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIE1hcmsgdXBsb2FkIGFzIGZhaWxlZFxyXG4gICAqL1xyXG4gIGFzeW5jIG1hcmtVcGxvYWRGYWlsZWQoZmlsZUlkOiBzdHJpbmcsIGVycm9yTWVzc2FnZTogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICBhd2FpdCB0aGlzLnVwZGF0ZVVwbG9hZFByb2dyZXNzKGZpbGVJZCwge1xyXG4gICAgICBwcm9ncmVzc19wZXJjZW50YWdlOiAwLFxyXG4gICAgICBzdGF0dXM6ICdmYWlsZWQnLFxyXG4gICAgICBtZXNzYWdlOiAnVXBsb2FkIGZhaWxlZCcsXHJcbiAgICAgIGVycm9yX21lc3NhZ2U6IGVycm9yTWVzc2FnZSxcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQ2FsY3VsYXRlIHVwbG9hZCBzcGVlZCBiYXNlZCBvbiBwcm9ncmVzc1xyXG4gICAqL1xyXG4gIGNhbGN1bGF0ZVVwbG9hZFNwZWVkKFxyXG4gICAgYnl0ZXNVcGxvYWRlZDogbnVtYmVyLFxyXG4gICAgZWxhcHNlZFRpbWVNczogbnVtYmVyXHJcbiAgKTogbnVtYmVyIHtcclxuICAgIGlmIChlbGFwc2VkVGltZU1zIDw9IDApIHJldHVybiAwO1xyXG4gICAgcmV0dXJuIE1hdGgucm91bmQoKGJ5dGVzVXBsb2FkZWQgLyBlbGFwc2VkVGltZU1zKSAqIDEwMDApOyAvLyBieXRlcyBwZXIgc2Vjb25kXHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBFc3RpbWF0ZSB0aW1lIHJlbWFpbmluZyBiYXNlZCBvbiBjdXJyZW50IHByb2dyZXNzXHJcbiAgICovXHJcbiAgZXN0aW1hdGVUaW1lUmVtYWluaW5nKFxyXG4gICAgcHJvZ3Jlc3NQZXJjZW50YWdlOiBudW1iZXIsXHJcbiAgICBlbGFwc2VkVGltZU1zOiBudW1iZXIsXHJcbiAgICBmaWxlU2l6ZTogbnVtYmVyXHJcbiAgKTogbnVtYmVyIHtcclxuICAgIGlmIChwcm9ncmVzc1BlcmNlbnRhZ2UgPD0gMCkge1xyXG4gICAgICAvLyBFc3RpbWF0ZSBiYXNlZCBvbiBmaWxlIHNpemUgKDEgc2Vjb25kIHBlciBNQilcclxuICAgICAgY29uc3QgZmlsZVNpemVNQiA9IGZpbGVTaXplIC8gKDEwMjQgKiAxMDI0KTtcclxuICAgICAgcmV0dXJuIE1hdGgubWF4KDUsIE1hdGgubWluKDYwLCBmaWxlU2l6ZU1CICogMikpOyAvLyBCZXR3ZWVuIDUtNjAgc2Vjb25kc1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IHByb2dyZXNzUmF0ZSA9IHByb2dyZXNzUGVyY2VudGFnZSAvIGVsYXBzZWRUaW1lTXM7IC8vIHBlcmNlbnRhZ2UgcGVyIG1pbGxpc2Vjb25kXHJcbiAgICBjb25zdCByZW1haW5pbmdQZXJjZW50YWdlID0gMTAwIC0gcHJvZ3Jlc3NQZXJjZW50YWdlO1xyXG4gICAgY29uc3QgZXN0aW1hdGVkUmVtYWluaW5nTXMgPSByZW1haW5pbmdQZXJjZW50YWdlIC8gcHJvZ3Jlc3NSYXRlO1xyXG5cclxuICAgIC8vIENvbnZlcnQgdG8gc2Vjb25kcyBhbmQgY2FwIGF0IHJlYXNvbmFibGUgbGltaXRzXHJcbiAgICBjb25zdCBlc3RpbWF0ZWRTZWNvbmRzID0gTWF0aC5yb3VuZChlc3RpbWF0ZWRSZW1haW5pbmdNcyAvIDEwMDApO1xyXG4gICAgcmV0dXJuIE1hdGgubWF4KDAsIE1hdGgubWluKDMwMCwgZXN0aW1hdGVkU2Vjb25kcykpOyAvLyBDYXAgYXQgNSBtaW51dGVzXHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBDbGVhbiB1cCBvbGQgY29tcGxldGVkL2ZhaWxlZCB1cGxvYWRzIChmb3IgbWFpbnRlbmFuY2UpXHJcbiAgICovXHJcbiAgYXN5bmMgY2xlYW51cE9sZFVwbG9hZHMob2xkZXJUaGFuRGF5czogbnVtYmVyID0gNyk6IFByb21pc2U8bnVtYmVyPiB7XHJcbiAgICBjb25zdCBjdXRvZmZUaW1lID0gRGF0ZS5ub3coKSAtIChvbGRlclRoYW5EYXlzICogMjQgKiA2MCAqIDYwICogMTAwMCk7XHJcbiAgICBsZXQgZGVsZXRlZENvdW50ID0gMDtcclxuXHJcbiAgICB0cnkge1xyXG4gICAgICAvLyBTY2FuIGZvciBvbGQgcmVjb3JkcyAodGhpcyBpcyBleHBlbnNpdmUsIHNob3VsZCBiZSBydW4gYXMgYSBzY2hlZHVsZWQgam9iKVxyXG4gICAgICBjb25zdCBjb21tYW5kID0gbmV3IFNjYW5Db21tYW5kKHtcclxuICAgICAgICBUYWJsZU5hbWU6IHRoaXMudGFibGVOYW1lLFxyXG4gICAgICAgIEZpbHRlckV4cHJlc3Npb246ICd1cGRhdGVkX2F0IDwgOmN1dG9mZiBBTkQgKCNzdGF0dXMgPSA6Y29tcGxldGVkIE9SICNzdGF0dXMgPSA6ZmFpbGVkKScsXHJcbiAgICAgICAgRXhwcmVzc2lvbkF0dHJpYnV0ZU5hbWVzOiB7XHJcbiAgICAgICAgICAnI3N0YXR1cyc6ICdzdGF0dXMnLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgRXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlczoge1xyXG4gICAgICAgICAgJzpjdXRvZmYnOiBjdXRvZmZUaW1lLFxyXG4gICAgICAgICAgJzpjb21wbGV0ZWQnOiAnY29tcGxldGVkJyxcclxuICAgICAgICAgICc6ZmFpbGVkJzogJ2ZhaWxlZCcsXHJcbiAgICAgICAgfSxcclxuICAgICAgfSk7XHJcblxyXG4gICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHRoaXMuZHluYW1vQ2xpZW50LnNlbmQoY29tbWFuZCk7XHJcblxyXG4gICAgICBpZiAocmVzcG9uc2UuSXRlbXMgJiYgcmVzcG9uc2UuSXRlbXMubGVuZ3RoID4gMCkge1xyXG4gICAgICAgIC8vIE5vdGU6IEluIGEgcmVhbCBpbXBsZW1lbnRhdGlvbiwgeW91J2QgYmF0Y2ggZGVsZXRlIHRoZXNlIHJlY29yZHNcclxuICAgICAgICAvLyBGb3Igbm93LCB3ZSdsbCBqdXN0IGNvdW50IHRoZW1cclxuICAgICAgICBkZWxldGVkQ291bnQgPSByZXNwb25zZS5JdGVtcy5sZW5ndGg7XHJcbiAgICAgICAgY29uc29sZS5sb2coYFtVUExPQUQtUFJPR1JFU1MtU0VSVklDRV0gRm91bmQgJHtkZWxldGVkQ291bnR9IG9sZCB1cGxvYWQgcmVjb3JkcyBmb3IgY2xlYW51cGApO1xyXG4gICAgICB9XHJcblxyXG4gICAgICByZXR1cm4gZGVsZXRlZENvdW50O1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc29sZS5lcnJvcignW1VQTE9BRC1QUk9HUkVTUy1TRVJWSUNFXSBFcnJvciBjbGVhbmluZyB1cCBvbGQgdXBsb2FkczonLCBlcnJvcik7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcignRmFpbGVkIHRvIGNsZWFudXAgb2xkIHVwbG9hZHMnKTtcclxuICAgIH1cclxuICB9XHJcbn0iXX0=
"use strict";
/**
 * DynamoDB client configuration and connection handling
 * Provides configured DynamoDB client with retry logic and error handling
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DynamoDBClientWrapper = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const dynamodb_config_1 = require("../config/dynamodb-config");
const validation_1 = require("../types/validation");
/**
 * DynamoDB client wrapper with error handling and retry logic
 */
class DynamoDBClientWrapper {
    client;
    docClient;
    tableName;
    constructor(environment) {
        // Create base DynamoDB client
        this.client = new client_dynamodb_1.DynamoDBClient({
            region: dynamodb_config_1.DYNAMODB_CONFIG.region,
            maxAttempts: dynamodb_config_1.DYNAMODB_CONFIG.maxRetries,
            retryMode: 'adaptive'
        });
        // Create document client for easier JSON handling
        this.docClient = lib_dynamodb_1.DynamoDBDocumentClient.from(this.client, {
            marshallOptions: {
                convertEmptyValues: false,
                removeUndefinedValues: true,
                convertClassInstanceToMap: false
            },
            unmarshallOptions: {
                wrapNumbers: false
            }
        });
        this.tableName = (0, dynamodb_config_1.getTableName)(environment);
    }
    /**
     * Get table name for this client instance
     */
    getTableName() {
        return this.tableName;
    }
    /**
     * Put item into DynamoDB table
     */
    async putItem(item, conditionExpression) {
        try {
            const command = new lib_dynamodb_1.PutCommand({
                TableName: this.tableName,
                Item: item,
                ConditionExpression: conditionExpression
            });
            await this.docClient.send(command);
        }
        catch (error) {
            throw this.handleDynamoDBError(error, 'putItem');
        }
    }
    /**
     * Get item from DynamoDB table
     */
    async getItem(key) {
        try {
            const command = new lib_dynamodb_1.GetCommand({
                TableName: this.tableName,
                Key: key
            });
            const result = await this.docClient.send(command);
            return result.Item;
        }
        catch (error) {
            throw this.handleDynamoDBError(error, 'getItem');
        }
    }
    /**
     * Update item in DynamoDB table
     */
    async updateItem(key, updateExpression, expressionAttributeNames, expressionAttributeValues, conditionExpression) {
        try {
            const command = new lib_dynamodb_1.UpdateCommand({
                TableName: this.tableName,
                Key: key,
                UpdateExpression: updateExpression,
                ExpressionAttributeNames: expressionAttributeNames,
                ExpressionAttributeValues: expressionAttributeValues,
                ConditionExpression: conditionExpression,
                ReturnValues: 'ALL_NEW'
            });
            const result = await this.docClient.send(command);
            if (!result.Attributes) {
                throw new validation_1.MetadataError('Update operation did not return updated item', validation_1.ErrorCodes.DATABASE_ERROR, 500);
            }
            return result.Attributes;
        }
        catch (error) {
            throw this.handleDynamoDBError(error, 'updateItem');
        }
    }
    /**
     * Delete item from DynamoDB table
     */
    async deleteItem(key, conditionExpression) {
        try {
            const command = new lib_dynamodb_1.DeleteCommand({
                TableName: this.tableName,
                Key: key,
                ConditionExpression: conditionExpression
            });
            await this.docClient.send(command);
        }
        catch (error) {
            throw this.handleDynamoDBError(error, 'deleteItem');
        }
    }
    /**
     * Query items from DynamoDB table or GSI
     */
    async queryItems(keyConditionExpression, expressionAttributeNames, expressionAttributeValues, indexName, scanIndexForward = false, limit, exclusiveStartKey) {
        try {
            const command = new lib_dynamodb_1.QueryCommand({
                TableName: this.tableName,
                KeyConditionExpression: keyConditionExpression,
                ExpressionAttributeNames: expressionAttributeNames,
                ExpressionAttributeValues: expressionAttributeValues,
                IndexName: indexName,
                ScanIndexForward: scanIndexForward,
                Limit: limit,
                ExclusiveStartKey: exclusiveStartKey
            });
            const result = await this.docClient.send(command);
            const response = {
                items: result.Items || [],
                count: result.Count || 0,
                scannedCount: result.ScannedCount || 0
            };
            if (result.LastEvaluatedKey) {
                response.lastEvaluatedKey = result.LastEvaluatedKey;
            }
            return response;
        }
        catch (error) {
            throw this.handleDynamoDBError(error, 'queryItems');
        }
    }
    /**
     * Query by index with simplified parameters
     */
    async queryByIndex(indexName, partitionKeyName, partitionKeyValue, options) {
        const expressionAttributeNames = {
            '#pk': partitionKeyName
        };
        const expressionAttributeValues = {
            ':pkval': partitionKeyValue
        };
        let keyConditionExpression = '#pk = :pkval';
        if (options?.sortKeyName && options?.sortKeyValue !== undefined) {
            expressionAttributeNames['#sk'] = options.sortKeyName;
            expressionAttributeValues[':skval'] = options.sortKeyValue;
            keyConditionExpression += ' AND #sk = :skval';
        }
        return this.queryItems(keyConditionExpression, expressionAttributeNames, expressionAttributeValues, indexName, options?.scanIndexForward ?? false, options?.limit, options?.exclusiveStartKey);
    }
    /**
     * Scan table with optional filters
     */
    async scan(options) {
        try {
            const command = new lib_dynamodb_1.ScanCommand({
                TableName: this.tableName,
                Limit: options?.limit,
                ExclusiveStartKey: options?.exclusiveStartKey,
                FilterExpression: options?.filterExpression,
                ExpressionAttributeNames: options?.expressionAttributeNames,
                ExpressionAttributeValues: options?.expressionAttributeValues
            });
            const result = await this.docClient.send(command);
            const response = {
                items: result.Items || [],
                count: result.Count || 0,
                scannedCount: result.ScannedCount || 0
            };
            if (result.LastEvaluatedKey) {
                response.lastEvaluatedKey = result.LastEvaluatedKey;
            }
            return response;
        }
        catch (error) {
            throw this.handleDynamoDBError(error, 'scan');
        }
    }
    /**
     * Batch get items from DynamoDB table
     */
    async batchGetItems(keys) {
        if (keys.length === 0) {
            return [];
        }
        try {
            const command = new lib_dynamodb_1.BatchGetCommand({
                RequestItems: {
                    [this.tableName]: {
                        Keys: keys
                    }
                }
            });
            const result = await this.docClient.send(command);
            return result.Responses?.[this.tableName] || [];
        }
        catch (error) {
            throw this.handleDynamoDBError(error, 'batchGetItems');
        }
    }
    /**
     * Batch delete items from DynamoDB table
     */
    async batchDeleteItems(keys) {
        if (keys.length === 0) {
            return;
        }
        const batchSize = 25;
        const batches = [];
        for (let i = 0; i < keys.length; i += batchSize) {
            batches.push(keys.slice(i, i + batchSize));
        }
        try {
            await Promise.all(batches.map(batch => this.processBatchDelete(batch)));
        }
        catch (error) {
            throw this.handleDynamoDBError(error, 'batchDeleteItems');
        }
    }
    async processBatchDelete(keys) {
        const deleteRequests = keys.map(key => ({
            DeleteRequest: { Key: key }
        }));
        const command = new lib_dynamodb_1.BatchWriteCommand({
            RequestItems: {
                [this.tableName]: deleteRequests
            }
        });
        await this.docClient.send(command);
    }
    handleDynamoDBError(error, operation) {
        console.error(`DynamoDB ${operation} error:`, error);
        if (error.name === 'ConditionalCheckFailedException') {
            return new validation_1.MetadataError('Conditional check failed - item may already exist or not meet conditions', validation_1.ErrorCodes.DUPLICATE_FILE_ID, 409);
        }
        if (error.name === 'ResourceNotFoundException') {
            return new validation_1.MetadataError('Table or item not found', validation_1.ErrorCodes.NOT_FOUND, 404);
        }
        if (error.name === 'ValidationException') {
            return new validation_1.MetadataError(`Invalid request: ${error.message}`, validation_1.ErrorCodes.VALIDATION_ERROR, 400);
        }
        if (error.name === 'ProvisionedThroughputExceededException' ||
            error.name === 'ThrottlingException') {
            return new validation_1.MetadataError('Database is temporarily unavailable due to high load', validation_1.ErrorCodes.DATABASE_ERROR, 503);
        }
        if (error.name === 'ItemCollectionSizeLimitExceededException') {
            return new validation_1.MetadataError('Item collection size limit exceeded', validation_1.ErrorCodes.DATABASE_ERROR, 400);
        }
        return new validation_1.MetadataError(`Database operation failed: ${error.message || 'Unknown error'}`, validation_1.ErrorCodes.DATABASE_ERROR, 500, { originalError: error.name, operation });
    }
    async close() {
        this.client.destroy();
    }
    async healthCheck() {
        try {
            const command = new lib_dynamodb_1.GetCommand({
                TableName: this.tableName,
                Key: { file_id: 'health-check-non-existent-id' }
            });
            await this.docClient.send(command);
            return { healthy: true, message: 'DynamoDB connection is healthy' };
        }
        catch (error) {
            if (error.name === 'ResourceNotFoundException') {
                return { healthy: false, message: `Table ${this.tableName} not found` };
            }
            return { healthy: true, message: 'DynamoDB connection is healthy' };
        }
    }
}
exports.DynamoDBClientWrapper = DynamoDBClientWrapper;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZHluYW1vZGItY2xpZW50LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZHluYW1vZGItY2xpZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7O0dBR0c7OztBQUVILDhEQUF5RDtBQUN6RCx3REFBbUw7QUFDbkwsK0RBQXlFO0FBQ3pFLG9EQUErRDtBQUUvRDs7R0FFRztBQUNILE1BQWEscUJBQXFCO0lBQ3hCLE1BQU0sQ0FBZ0I7SUFDdEIsU0FBUyxDQUF3QjtJQUNqQyxTQUFTLENBQVE7SUFFekIsWUFBWSxXQUFvQjtRQUM5Qiw4QkFBOEI7UUFDOUIsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLGdDQUFjLENBQUM7WUFDL0IsTUFBTSxFQUFFLGlDQUFlLENBQUMsTUFBTTtZQUM5QixXQUFXLEVBQUUsaUNBQWUsQ0FBQyxVQUFVO1lBQ3ZDLFNBQVMsRUFBRSxVQUFVO1NBQ3RCLENBQUMsQ0FBQTtRQUVGLGtEQUFrRDtRQUNsRCxJQUFJLENBQUMsU0FBUyxHQUFHLHFDQUFzQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFO1lBQ3hELGVBQWUsRUFBRTtnQkFDZixrQkFBa0IsRUFBRSxLQUFLO2dCQUN6QixxQkFBcUIsRUFBRSxJQUFJO2dCQUMzQix5QkFBeUIsRUFBRSxLQUFLO2FBQ2pDO1lBQ0QsaUJBQWlCLEVBQUU7Z0JBQ2pCLFdBQVcsRUFBRSxLQUFLO2FBQ25CO1NBQ0YsQ0FBQyxDQUFBO1FBRUYsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFBLDhCQUFZLEVBQUMsV0FBVyxDQUFDLENBQUE7SUFDNUMsQ0FBQztJQUVEOztPQUVHO0lBQ0gsWUFBWTtRQUNWLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQTtJQUN2QixDQUFDO0lBRUQ7O09BRUc7SUFDSCxLQUFLLENBQUMsT0FBTyxDQUFDLElBQXlCLEVBQUUsbUJBQTRCO1FBQ25FLElBQUksQ0FBQztZQUNILE1BQU0sT0FBTyxHQUFHLElBQUkseUJBQVUsQ0FBQztn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RUFBRSxFQUNoRSx1QkFBVSxDQUFDLGNBQWMsRUFDekIsR0FBRyxFQUNILEVBQUUsYUFBYSxFQUFFLEtBQUssQ0FBQyxJQUFJLEVBQUUsU0FBUyxFQUFFLENBQ3pDLENBQUE7SUFDSCxDQUFDO0lBRUQsS0FBSyxDQUFDLEtBQUs7UUFDVCxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQ3ZCLENBQUM7SUFFRCxLQUFLLENBQUMsV0FBVztRQUNmLElBQUksQ0FBQztZQUNILE1BQU0sT0FBTyxHQUFHLElBQUkseUJBQVUsQ0FBQztnQkFDN0IsU0FBUyxFQUFFLElBQUksQ0FBQyxTQUFTO2dCQUN6QixHQUFHLEVBQUUsRUFBRSxPQUFPLEVBQUUsOEJBQThCLEVBQUU7YUFDakQsQ0FBQyxDQUFBO1lBRUYsTUFBTSxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQTtZQUNsQyxPQUFPLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsQ0FBQTtRQUNyRSxDQUFDO1FBQUMsT0FBTyxLQUFVLEVBQUUsQ0FBQztZQUNwQixJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssMkJBQTJCLEVBQUUsQ0FBQztnQkFDL0MsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLFNBQVMsSUFBSSxDQUFDLFNBQVMsWUFBWSxFQUFFLENBQUE7WUFDekUsQ0FBQztZQUVELE9BQU8sRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxDQUFBO1FBQ3JFLENBQUM7SUFDSCxDQUFDO0NBQ0Y7QUFoWkQsc0RBZ1pDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIER5bmFtb0RCIGNsaWVudCBjb25maWd1cmF0aW9uIGFuZCBjb25uZWN0aW9uIGhhbmRsaW5nXHJcbiAqIFByb3ZpZGVzIGNvbmZpZ3VyZWQgRHluYW1vREIgY2xpZW50IHdpdGggcmV0cnkgbG9naWMgYW5kIGVycm9yIGhhbmRsaW5nXHJcbiAqL1xyXG5cclxuaW1wb3J0IHsgRHluYW1vREJDbGllbnQgfSBmcm9tICdAYXdzLXNkay9jbGllbnQtZHluYW1vZGInXHJcbmltcG9ydCB7IER5bmFtb0RCRG9jdW1lbnRDbGllbnQsIEdldENvbW1hbmQsIFB1dENvbW1hbmQsIFVwZGF0ZUNvbW1hbmQsIERlbGV0ZUNvbW1hbmQsIFF1ZXJ5Q29tbWFuZCwgU2NhbkNvbW1hbmQsIEJhdGNoR2V0Q29tbWFuZCwgQmF0Y2hXcml0ZUNvbW1hbmQgfSBmcm9tICdAYXdzLXNkay9saWItZHluYW1vZGInXHJcbmltcG9ydCB7IERZTkFNT0RCX0NPTkZJRywgZ2V0VGFibGVOYW1lIH0gZnJvbSAnLi4vY29uZmlnL2R5bmFtb2RiLWNvbmZpZydcclxuaW1wb3J0IHsgTWV0YWRhdGFFcnJvciwgRXJyb3JDb2RlcyB9IGZyb20gJy4uL3R5cGVzL3ZhbGlkYXRpb24nXHJcblxyXG4vKipcclxuICogRHluYW1vREIgY2xpZW50IHdyYXBwZXIgd2l0aCBlcnJvciBoYW5kbGluZyBhbmQgcmV0cnkgbG9naWNcclxuICovXHJcbmV4cG9ydCBjbGFzcyBEeW5hbW9EQkNsaWVudFdyYXBwZXIge1xyXG4gIHByaXZhdGUgY2xpZW50OiBEeW5hbW9EQkNsaWVudFxyXG4gIHByaXZhdGUgZG9jQ2xpZW50OiBEeW5hbW9EQkRvY3VtZW50Q2xpZW50XHJcbiAgcHJpdmF0ZSB0YWJsZU5hbWU6IHN0cmluZ1xyXG5cclxuICBjb25zdHJ1Y3RvcihlbnZpcm9ubWVudD86IHN0cmluZykge1xyXG4gICAgLy8gQ3JlYXRlIGJhc2UgRHluYW1vREIgY2xpZW50XHJcbiAgICB0aGlzLmNsaWVudCA9IG5ldyBEeW5hbW9EQkNsaWVudCh7XHJcbiAgICAgIHJlZ2lvbjogRFlOQU1PREJfQ09ORklHLnJlZ2lvbixcclxuICAgICAgbWF4QXR0ZW1wdHM6IERZTkFNT0RCX0NPTkZJRy5tYXhSZXRyaWVzLFxyXG4gICAgICByZXRyeU1vZGU6ICdhZGFwdGl2ZSdcclxuICAgIH0pXHJcblxyXG4gICAgLy8gQ3JlYXRlIGRvY3VtZW50IGNsaWVudCBmb3IgZWFzaWVyIEpTT04gaGFuZGxpbmdcclxuICAgIHRoaXMuZG9jQ2xpZW50ID0gRHluYW1vREJEb2N1bWVudENsaWVudC5mcm9tKHRoaXMuY2xpZW50LCB7XHJcbiAgICAgIG1hcnNoYWxsT3B0aW9uczoge1xyXG4gICAgICAgIGNvbnZlcnRFbXB0eVZhbHVlczogZmFsc2UsXHJcbiAgICAgICAgcmVtb3ZlVW5kZWZpbmVkVmFsdWVzOiB0cnVlLFxyXG4gICAgICAgIGNvbnZlcnRDbGFzc0luc3RhbmNlVG9NYXA6IGZhbHNlXHJcbiAgICAgIH0sXHJcbiAgICAgIHVubWFyc2hhbGxPcHRpb25zOiB7XHJcbiAgICAgICAgd3JhcE51bWJlcnM6IGZhbHNlXHJcbiAgICAgIH1cclxuICAgIH0pXHJcblxyXG4gICAgdGhpcy50YWJsZU5hbWUgPSBnZXRUYWJsZU5hbWUoZW52aXJvbm1lbnQpXHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBHZXQgdGFibGUgbmFtZSBmb3IgdGhpcyBjbGllbnQgaW5zdGFuY2VcclxuICAgKi9cclxuICBnZXRUYWJsZU5hbWUoKTogc3RyaW5nIHtcclxuICAgIHJldHVybiB0aGlzLnRhYmxlTmFtZVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogUHV0IGl0ZW0gaW50byBEeW5hbW9EQiB0YWJsZVxyXG4gICAqL1xyXG4gIGFzeW5jIHB1dEl0ZW0oaXRlbTogUmVjb3JkPHN0cmluZywgYW55PiwgY29uZGl0aW9uRXhwcmVzc2lvbj86IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3QgY29tbWFuZCA9IG5ldyBQdXRDb21tYW5kKHtcclxuICAgICAgICBUYWJsZU5hbWU6IHRoaXMudGFibGVOYW1lLFxyXG4gICAgICAgIEl0ZW06IGl0ZW0sXHJcbiAgICAgICAgQ29uZGl0aW9uRXhwcmVzc2lvbjogY29uZGl0aW9uRXhwcmVzc2lvblxyXG4gICAgICB9KVxyXG5cclxuICAgICAgYXdhaXQgdGhpcy5kb2NDbGllbnQuc2VuZChjb21tYW5kKVxyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgdGhyb3cgdGhpcy5oYW5kbGVEeW5hbW9EQkVycm9yKGVycm9yLCAncHV0SXRlbScpXHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBHZXQgaXRlbSBmcm9tIER5bmFtb0RCIHRhYmxlXHJcbiAgICovXHJcbiAgYXN5bmMgZ2V0SXRlbShrZXk6IFJlY29yZDxzdHJpbmcsIGFueT4pOiBQcm9taXNlPFJlY29yZDxzdHJpbmcsIGFueT4gfCB1bmRlZmluZWQ+IHtcclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IGNvbW1hbmQgPSBuZXcgR2V0Q29tbWFuZCh7XHJcbiAgICAgICAgVGFibGVOYW1lOiB0aGlzLnRhYmxlTmFtZSxcclxuICAgICAgICBLZXk6IGtleVxyXG4gICAgICB9KVxyXG5cclxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5kb2NDbGllbnQuc2VuZChjb21tYW5kKVxyXG4gICAgICByZXR1cm4gcmVzdWx0Lkl0ZW1cclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIHRocm93IHRoaXMuaGFuZGxlRHluYW1vREJFcnJvcihlcnJvciwgJ2dldEl0ZW0nKVxyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogVXBkYXRlIGl0ZW0gaW4gRHluYW1vREIgdGFibGVcclxuICAgKi9cclxuICBhc3luYyB1cGRhdGVJdGVtKFxyXG4gICAga2V5OiBSZWNvcmQ8c3RyaW5nLCBhbnk+LFxyXG4gICAgdXBkYXRlRXhwcmVzc2lvbjogc3RyaW5nLFxyXG4gICAgZXhwcmVzc2lvbkF0dHJpYnV0ZU5hbWVzPzogUmVjb3JkPHN0cmluZywgc3RyaW5nPixcclxuICAgIGV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXM/OiBSZWNvcmQ8c3RyaW5nLCBhbnk+LFxyXG4gICAgY29uZGl0aW9uRXhwcmVzc2lvbj86IHN0cmluZ1xyXG4gICk6IFByb21pc2U8UmVjb3JkPHN0cmluZywgYW55Pj4ge1xyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3QgY29tbWFuZCA9IG5ldyBVcGRhdGVDb21tYW5kKHtcclxuICAgICAgICBUYWJsZU5hbWU6IHRoaXMudGFibGVOYW1lLFxyXG4gICAgICAgIEtleToga2V5LFxyXG4gICAgICAgIFVwZGF0ZUV4cHJlc3Npb246IHVwZGF0ZUV4cHJlc3Npb24sXHJcbiAgICAgICAgRXhwcmVzc2lvbkF0dHJpYnV0ZU5hbWVzOiBleHByZXNzaW9uQXR0cmlidXRlTmFtZXMsXHJcbiAgICAgICAgRXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlczogZXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlcyxcclxuICAgICAgICBDb25kaXRpb25FeHByZXNzaW9uOiBjb25kaXRpb25FeHByZXNzaW9uLFxyXG4gICAgICAgIFJldHVyblZhbHVlczogJ0FMTF9ORVcnXHJcbiAgICAgIH0pXHJcblxyXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLmRvY0NsaWVudC5zZW5kKGNvbW1hbmQpXHJcbiAgICAgIGlmICghcmVzdWx0LkF0dHJpYnV0ZXMpIHtcclxuICAgICAgICB0aHJvdyBuZXcgTWV0YWRhdGFFcnJvcihcclxuICAgICAgICAgICdVcGRhdGUgb3BlcmF0aW9uIGRpZCBub3QgcmV0dXJuIHVwZGF0ZWQgaXRlbScsXHJcbiAgICAgICAgICBFcnJvckNvZGVzLkRBVEFCQVNFX0VSUk9SLFxyXG4gICAgICAgICAgNTAwXHJcbiAgICAgICAgKVxyXG4gICAgICB9XHJcbiAgICAgIHJldHVybiByZXN1bHQuQXR0cmlidXRlc1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgdGhyb3cgdGhpcy5oYW5kbGVEeW5hbW9EQkVycm9yKGVycm9yLCAndXBkYXRlSXRlbScpXHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBEZWxldGUgaXRlbSBmcm9tIER5bmFtb0RCIHRhYmxlXHJcbiAgICovXHJcbiAgYXN5bmMgZGVsZXRlSXRlbShrZXk6IFJlY29yZDxzdHJpbmcsIGFueT4sIGNvbmRpdGlvbkV4cHJlc3Npb24/OiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IGNvbW1hbmQgPSBuZXcgRGVsZXRlQ29tbWFuZCh7XHJcbiAgICAgICAgVGFibGVOYW1lOiB0aGlzLnRhYmxlTmFtZSxcclxuICAgICAgICBLZXk6IGtleSxcclxuICAgICAgICBDb25kaXRpb25FeHByZXNzaW9uOiBjb25kaXRpb25FeHByZXNzaW9uXHJcbiAgICAgIH0pXHJcblxyXG4gICAgICBhd2FpdCB0aGlzLmRvY0NsaWVudC5zZW5kKGNvbW1hbmQpXHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICB0aHJvdyB0aGlzLmhhbmRsZUR5bmFtb0RCRXJyb3IoZXJyb3IsICdkZWxldGVJdGVtJylcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFF1ZXJ5IGl0ZW1zIGZyb20gRHluYW1vREIgdGFibGUgb3IgR1NJXHJcbiAgICovXHJcbiAgYXN5bmMgcXVlcnlJdGVtcyhcclxuICAgIGtleUNvbmRpdGlvbkV4cHJlc3Npb246IHN0cmluZyxcclxuICAgIGV4cHJlc3Npb25BdHRyaWJ1dGVOYW1lcz86IFJlY29yZDxzdHJpbmcsIHN0cmluZz4sXHJcbiAgICBleHByZXNzaW9uQXR0cmlidXRlVmFsdWVzPzogUmVjb3JkPHN0cmluZywgYW55PixcclxuICAgIGluZGV4TmFtZT86IHN0cmluZyxcclxuICAgIHNjYW5JbmRleEZvcndhcmQ6IGJvb2xlYW4gPSBmYWxzZSxcclxuICAgIGxpbWl0PzogbnVtYmVyLFxyXG4gICAgZXhjbHVzaXZlU3RhcnRLZXk/OiBSZWNvcmQ8c3RyaW5nLCBhbnk+XHJcbiAgKTogUHJvbWlzZTx7XHJcbiAgICBpdGVtczogUmVjb3JkPHN0cmluZywgYW55PltdXHJcbiAgICBsYXN0RXZhbHVhdGVkS2V5PzogUmVjb3JkPHN0cmluZywgYW55PlxyXG4gICAgY291bnQ6IG51bWJlclxyXG4gICAgc2Nhbm5lZENvdW50OiBudW1iZXJcclxuICB9PiB7XHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCBjb21tYW5kID0gbmV3IFF1ZXJ5Q29tbWFuZCh7XHJcbiAgICAgICAgVGFibGVOYW1lOiB0aGlzLnRhYmxlTmFtZSxcclxuICAgICAgICBLZXlDb25kaXRpb25FeHByZXNzaW9uOiBrZXlDb25kaXRpb25FeHByZXNzaW9uLFxyXG4gICAgICAgIEV4cHJlc3Npb25BdHRyaWJ1dGVOYW1lczogZXhwcmVzc2lvbkF0dHJpYnV0ZU5hbWVzLFxyXG4gICAgICAgIEV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXM6IGV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXMsXHJcbiAgICAgICAgSW5kZXhOYW1lOiBpbmRleE5hbWUsXHJcbiAgICAgICAgU2NhbkluZGV4Rm9yd2FyZDogc2NhbkluZGV4Rm9yd2FyZCxcclxuICAgICAgICBMaW1pdDogbGltaXQsXHJcbiAgICAgICAgRXhjbHVzaXZlU3RhcnRLZXk6IGV4Y2x1c2l2ZVN0YXJ0S2V5XHJcbiAgICAgIH0pXHJcblxyXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLmRvY0NsaWVudC5zZW5kKGNvbW1hbmQpXHJcbiAgICAgIFxyXG4gICAgICBjb25zdCByZXNwb25zZToge1xyXG4gICAgICAgIGl0ZW1zOiBSZWNvcmQ8c3RyaW5nLCBhbnk+W11cclxuICAgICAgICBsYXN0RXZhbHVhdGVkS2V5PzogUmVjb3JkPHN0cmluZywgYW55PlxyXG4gICAgICAgIGNvdW50OiBudW1iZXJcclxuICAgICAgICBzY2FubmVkQ291bnQ6IG51bWJlclxyXG4gICAgICB9ID0ge1xyXG4gICAgICAgIGl0ZW1zOiByZXN1bHQuSXRlbXMgfHwgW10sXHJcbiAgICAgICAgY291bnQ6IHJlc3VsdC5Db3VudCB8fCAwLFxyXG4gICAgICAgIHNjYW5uZWRDb3VudDogcmVzdWx0LlNjYW5uZWRDb3VudCB8fCAwXHJcbiAgICAgIH1cclxuICAgICAgXHJcbiAgICAgIGlmIChyZXN1bHQuTGFzdEV2YWx1YXRlZEtleSkge1xyXG4gICAgICAgIHJlc3BvbnNlLmxhc3RFdmFsdWF0ZWRLZXkgPSByZXN1bHQuTGFzdEV2YWx1YXRlZEtleVxyXG4gICAgICB9XHJcbiAgICAgIFxyXG4gICAgICByZXR1cm4gcmVzcG9uc2VcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIHRocm93IHRoaXMuaGFuZGxlRHluYW1vREJFcnJvcihlcnJvciwgJ3F1ZXJ5SXRlbXMnKVxyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogUXVlcnkgYnkgaW5kZXggd2l0aCBzaW1wbGlmaWVkIHBhcmFtZXRlcnNcclxuICAgKi9cclxuICBhc3luYyBxdWVyeUJ5SW5kZXgoXHJcbiAgICBpbmRleE5hbWU6IHN0cmluZyxcclxuICAgIHBhcnRpdGlvbktleU5hbWU6IHN0cmluZyxcclxuICAgIHBhcnRpdGlvbktleVZhbHVlOiBhbnksXHJcbiAgICBvcHRpb25zPzoge1xyXG4gICAgICBzb3J0S2V5TmFtZT86IHN0cmluZztcclxuICAgICAgc29ydEtleVZhbHVlPzogYW55O1xyXG4gICAgICBsaW1pdD86IG51bWJlcjtcclxuICAgICAgZXhjbHVzaXZlU3RhcnRLZXk/OiBSZWNvcmQ8c3RyaW5nLCBhbnk+O1xyXG4gICAgICBzY2FuSW5kZXhGb3J3YXJkPzogYm9vbGVhbjtcclxuICAgIH1cclxuICApOiBQcm9taXNlPHtcclxuICAgIGl0ZW1zOiBSZWNvcmQ8c3RyaW5nLCBhbnk+W11cclxuICAgIGxhc3RFdmFsdWF0ZWRLZXk/OiBSZWNvcmQ8c3RyaW5nLCBhbnk+XHJcbiAgICBjb3VudDogbnVtYmVyXHJcbiAgICBzY2FubmVkQ291bnQ6IG51bWJlclxyXG4gIH0+IHtcclxuICAgIGNvbnN0IGV4cHJlc3Npb25BdHRyaWJ1dGVOYW1lczogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHtcclxuICAgICAgJyNwayc6IHBhcnRpdGlvbktleU5hbWVcclxuICAgIH07XHJcbiAgICBjb25zdCBleHByZXNzaW9uQXR0cmlidXRlVmFsdWVzOiBSZWNvcmQ8c3RyaW5nLCBhbnk+ID0ge1xyXG4gICAgICAnOnBrdmFsJzogcGFydGl0aW9uS2V5VmFsdWVcclxuICAgIH07XHJcblxyXG4gICAgbGV0IGtleUNvbmRpdGlvbkV4cHJlc3Npb24gPSAnI3BrID0gOnBrdmFsJztcclxuXHJcbiAgICBpZiAob3B0aW9ucz8uc29ydEtleU5hbWUgJiYgb3B0aW9ucz8uc29ydEtleVZhbHVlICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgZXhwcmVzc2lvbkF0dHJpYnV0ZU5hbWVzWycjc2snXSA9IG9wdGlvbnMuc29ydEtleU5hbWU7XHJcbiAgICAgIGV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXNbJzpza3ZhbCddID0gb3B0aW9ucy5zb3J0S2V5VmFsdWU7XHJcbiAgICAgIGtleUNvbmRpdGlvbkV4cHJlc3Npb24gKz0gJyBBTkQgI3NrID0gOnNrdmFsJztcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdGhpcy5xdWVyeUl0ZW1zKFxyXG4gICAgICBrZXlDb25kaXRpb25FeHByZXNzaW9uLFxyXG4gICAgICBleHByZXNzaW9uQXR0cmlidXRlTmFtZXMsXHJcbiAgICAgIGV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXMsXHJcbiAgICAgIGluZGV4TmFtZSxcclxuICAgICAgb3B0aW9ucz8uc2NhbkluZGV4Rm9yd2FyZCA/PyBmYWxzZSxcclxuICAgICAgb3B0aW9ucz8ubGltaXQsXHJcbiAgICAgIG9wdGlvbnM/LmV4Y2x1c2l2ZVN0YXJ0S2V5XHJcbiAgICApO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogU2NhbiB0YWJsZSB3aXRoIG9wdGlvbmFsIGZpbHRlcnNcclxuICAgKi9cclxuICBhc3luYyBzY2FuKG9wdGlvbnM/OiB7XHJcbiAgICBsaW1pdD86IG51bWJlcjtcclxuICAgIGV4Y2x1c2l2ZVN0YXJ0S2V5PzogUmVjb3JkPHN0cmluZywgYW55PjtcclxuICAgIGZpbHRlckV4cHJlc3Npb24/OiBzdHJpbmc7XHJcbiAgICBleHByZXNzaW9uQXR0cmlidXRlTmFtZXM/OiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+O1xyXG4gICAgZXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlcz86IFJlY29yZDxzdHJpbmcsIGFueT47XHJcbiAgfSk6IFByb21pc2U8e1xyXG4gICAgaXRlbXM6IFJlY29yZDxzdHJpbmcsIGFueT5bXVxyXG4gICAgbGFzdEV2YWx1YXRlZEtleT86IFJlY29yZDxzdHJpbmcsIGFueT5cclxuICAgIGNvdW50OiBudW1iZXJcclxuICAgIHNjYW5uZWRDb3VudDogbnVtYmVyXHJcbiAgfT4ge1xyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3QgY29tbWFuZCA9IG5ldyBTY2FuQ29tbWFuZCh7XHJcbiAgICAgICAgVGFibGVOYW1lOiB0aGlzLnRhYmxlTmFtZSxcclxuICAgICAgICBMaW1pdDogb3B0aW9ucz8ubGltaXQsXHJcbiAgICAgICAgRXhjbHVzaXZlU3RhcnRLZXk6IG9wdGlvbnM/LmV4Y2x1c2l2ZVN0YXJ0S2V5LFxyXG4gICAgICAgIEZpbHRlckV4cHJlc3Npb246IG9wdGlvbnM/LmZpbHRlckV4cHJlc3Npb24sXHJcbiAgICAgICAgRXhwcmVzc2lvbkF0dHJpYnV0ZU5hbWVzOiBvcHRpb25zPy5leHByZXNzaW9uQXR0cmlidXRlTmFtZXMsXHJcbiAgICAgICAgRXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlczogb3B0aW9ucz8uZXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlc1xyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRoaXMuZG9jQ2xpZW50LnNlbmQoY29tbWFuZCk7XHJcbiAgICAgIFxyXG4gICAgICBjb25zdCByZXNwb25zZToge1xyXG4gICAgICAgIGl0ZW1zOiBSZWNvcmQ8c3RyaW5nLCBhbnk+W11cclxuICAgICAgICBsYXN0RXZhbHVhdGVkS2V5PzogUmVjb3JkPHN0cmluZywgYW55PlxyXG4gICAgICAgIGNvdW50OiBudW1iZXJcclxuICAgICAgICBzY2FubmVkQ291bnQ6IG51bWJlclxyXG4gICAgICB9ID0ge1xyXG4gICAgICAgIGl0ZW1zOiByZXN1bHQuSXRlbXMgfHwgW10sXHJcbiAgICAgICAgY291bnQ6IHJlc3VsdC5Db3VudCB8fCAwLFxyXG4gICAgICAgIHNjYW5uZWRDb3VudDogcmVzdWx0LlNjYW5uZWRDb3VudCB8fCAwXHJcbiAgICAgIH07XHJcbiAgICAgIFxyXG4gICAgICBpZiAocmVzdWx0Lkxhc3RFdmFsdWF0ZWRLZXkpIHtcclxuICAgICAgICByZXNwb25zZS5sYXN0RXZhbHVhdGVkS2V5ID0gcmVzdWx0Lkxhc3RFdmFsdWF0ZWRLZXk7XHJcbiAgICAgIH1cclxuICAgICAgXHJcbiAgICAgIHJldHVybiByZXNwb25zZTtcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIHRocm93IHRoaXMuaGFuZGxlRHluYW1vREJFcnJvcihlcnJvciwgJ3NjYW4nKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEJhdGNoIGdldCBpdGVtcyBmcm9tIER5bmFtb0RCIHRhYmxlXHJcbiAgICovXHJcbiAgYXN5bmMgYmF0Y2hHZXRJdGVtcyhrZXlzOiBSZWNvcmQ8c3RyaW5nLCBhbnk+W10pOiBQcm9taXNlPFJlY29yZDxzdHJpbmcsIGFueT5bXT4ge1xyXG4gICAgaWYgKGtleXMubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgIHJldHVybiBbXVxyXG4gICAgfVxyXG5cclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IGNvbW1hbmQgPSBuZXcgQmF0Y2hHZXRDb21tYW5kKHtcclxuICAgICAgICBSZXF1ZXN0SXRlbXM6IHtcclxuICAgICAgICAgIFt0aGlzLnRhYmxlTmFtZV06IHtcclxuICAgICAgICAgICAgS2V5czoga2V5c1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgfSlcclxuXHJcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRoaXMuZG9jQ2xpZW50LnNlbmQoY29tbWFuZClcclxuICAgICAgcmV0dXJuIHJlc3VsdC5SZXNwb25zZXM/Llt0aGlzLnRhYmxlTmFtZV0gfHwgW11cclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIHRocm93IHRoaXMuaGFuZGxlRHluYW1vREJFcnJvcihlcnJvciwgJ2JhdGNoR2V0SXRlbXMnKVxyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQmF0Y2ggZGVsZXRlIGl0ZW1zIGZyb20gRHluYW1vREIgdGFibGVcclxuICAgKi9cclxuICBhc3luYyBiYXRjaERlbGV0ZUl0ZW1zKGtleXM6IFJlY29yZDxzdHJpbmcsIGFueT5bXSk6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgaWYgKGtleXMubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgIHJldHVyblxyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IGJhdGNoU2l6ZSA9IDI1XHJcbiAgICBjb25zdCBiYXRjaGVzID0gW11cclxuICAgIFxyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgaSArPSBiYXRjaFNpemUpIHtcclxuICAgICAgYmF0Y2hlcy5wdXNoKGtleXMuc2xpY2UoaSwgaSArIGJhdGNoU2l6ZSkpXHJcbiAgICB9XHJcblxyXG4gICAgdHJ5IHtcclxuICAgICAgYXdhaXQgUHJvbWlzZS5hbGwoYmF0Y2hlcy5tYXAoYmF0Y2ggPT4gdGhpcy5wcm9jZXNzQmF0Y2hEZWxldGUoYmF0Y2gpKSlcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIHRocm93IHRoaXMuaGFuZGxlRHluYW1vREJFcnJvcihlcnJvciwgJ2JhdGNoRGVsZXRlSXRlbXMnKVxyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBhc3luYyBwcm9jZXNzQmF0Y2hEZWxldGUoa2V5czogUmVjb3JkPHN0cmluZywgYW55PltdKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICBjb25zdCBkZWxldGVSZXF1ZXN0cyA9IGtleXMubWFwKGtleSA9PiAoe1xyXG4gICAgICBEZWxldGVSZXF1ZXN0OiB7IEtleToga2V5IH1cclxuICAgIH0pKVxyXG5cclxuICAgIGNvbnN0IGNvbW1hbmQgPSBuZXcgQmF0Y2hXcml0ZUNvbW1hbmQoe1xyXG4gICAgICBSZXF1ZXN0SXRlbXM6IHtcclxuICAgICAgICBbdGhpcy50YWJsZU5hbWVdOiBkZWxldGVSZXF1ZXN0c1xyXG4gICAgICB9XHJcbiAgICB9KVxyXG5cclxuICAgIGF3YWl0IHRoaXMuZG9jQ2xpZW50LnNlbmQoY29tbWFuZClcclxuICB9XHJcblxyXG4gIHByaXZhdGUgaGFuZGxlRHluYW1vREJFcnJvcihlcnJvcjogYW55LCBvcGVyYXRpb246IHN0cmluZyk6IE1ldGFkYXRhRXJyb3Ige1xyXG4gICAgY29uc29sZS5lcnJvcihgRHluYW1vREIgJHtvcGVyYXRpb259IGVycm9yOmAsIGVycm9yKVxyXG5cclxuICAgIGlmIChlcnJvci5uYW1lID09PSAnQ29uZGl0aW9uYWxDaGVja0ZhaWxlZEV4Y2VwdGlvbicpIHtcclxuICAgICAgcmV0dXJuIG5ldyBNZXRhZGF0YUVycm9yKFxyXG4gICAgICAgICdDb25kaXRpb25hbCBjaGVjayBmYWlsZWQgLSBpdGVtIG1heSBhbHJlYWR5IGV4aXN0IG9yIG5vdCBtZWV0IGNvbmRpdGlvbnMnLFxyXG4gICAgICAgIEVycm9yQ29kZXMuRFVQTElDQVRFX0ZJTEVfSUQsXHJcbiAgICAgICAgNDA5XHJcbiAgICAgIClcclxuICAgIH1cclxuXHJcbiAgICBpZiAoZXJyb3IubmFtZSA9PT0gJ1Jlc291cmNlTm90Rm91bmRFeGNlcHRpb24nKSB7XHJcbiAgICAgIHJldHVybiBuZXcgTWV0YWRhdGFFcnJvcihcclxuICAgICAgICAnVGFibGUgb3IgaXRlbSBub3QgZm91bmQnLFxyXG4gICAgICAgIEVycm9yQ29kZXMuTk9UX0ZPVU5ELFxyXG4gICAgICAgIDQwNFxyXG4gICAgICApXHJcbiAgICB9XHJcblxyXG4gICAgaWYgKGVycm9yLm5hbWUgPT09ICdWYWxpZGF0aW9uRXhjZXB0aW9uJykge1xyXG4gICAgICByZXR1cm4gbmV3IE1ldGFkYXRhRXJyb3IoXHJcbiAgICAgICAgYEludmFsaWQgcmVxdWVzdDogJHtlcnJvci5tZXNzYWdlfWAsXHJcbiAgICAgICAgRXJyb3JDb2Rlcy5WQUxJREFUSU9OX0VSUk9SLFxyXG4gICAgICAgIDQwMFxyXG4gICAgICApXHJcbiAgICB9XHJcblxyXG4gICAgaWYgKGVycm9yLm5hbWUgPT09ICdQcm92aXNpb25lZFRocm91Z2hwdXRFeGNlZWRlZEV4Y2VwdGlvbicgfHwgXHJcbiAgICAgICAgZXJyb3IubmFtZSA9PT0gJ1Rocm90dGxpbmdFeGNlcHRpb24nKSB7XHJcbiAgICAgIHJldHVybiBuZXcgTWV0YWRhdGFFcnJvcihcclxuICAgICAgICAnRGF0YWJhc2UgaXMgdGVtcG9yYXJpbHkgdW5hdmFpbGFibGUgZHVlIHRvIGhpZ2ggbG9hZCcsXHJcbiAgICAgICAgRXJyb3JDb2Rlcy5EQVRBQkFTRV9FUlJPUixcclxuICAgICAgICA1MDNcclxuICAgICAgKVxyXG4gICAgfVxyXG5cclxuICAgIGlmIChlcnJvci5uYW1lID09PSAnSXRlbUNvbGxlY3Rpb25TaXplTGltaXRFeGNlZWRlZEV4Y2VwdGlvbicpIHtcclxuICAgICAgcmV0dXJuIG5ldyBNZXRhZGF0YUVycm9yKFxyXG4gICAgICAgICdJdGVtIGNvbGxlY3Rpb24gc2l6ZSBsaW1pdCBleGNlZWRlZCcsXHJcbiAgICAgICAgRXJyb3JDb2Rlcy5EQVRBQkFTRV9FUlJPUixcclxuICAgICAgICA0MDBcclxuICAgICAgKVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBuZXcgTWV0YWRhdGFFcnJvcihcclxuICAgICAgYERhdGFiYXNlIG9wZXJhdGlvbiBmYWlsZWQ6ICR7ZXJyb3IubWVzc2FnZSB8fCAnVW5rbm93biBlcnJvcid9YCxcclxuICAgICAgRXJyb3JDb2Rlcy5EQVRBQkFTRV9FUlJPUixcclxuICAgICAgNTAwLFxyXG4gICAgICB7IG9yaWdpbmFsRXJyb3I6IGVycm9yLm5hbWUsIG9wZXJhdGlvbiB9XHJcbiAgICApXHJcbiAgfVxyXG5cclxuICBhc3luYyBjbG9zZSgpOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIHRoaXMuY2xpZW50LmRlc3Ryb3koKVxyXG4gIH1cclxuXHJcbiAgYXN5bmMgaGVhbHRoQ2hlY2soKTogUHJvbWlzZTx7IGhlYWx0aHk6IGJvb2xlYW47IG1lc3NhZ2U6IHN0cmluZyB9PiB7XHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCBjb21tYW5kID0gbmV3IEdldENvbW1hbmQoe1xyXG4gICAgICAgIFRhYmxlTmFtZTogdGhpcy50YWJsZU5hbWUsXHJcbiAgICAgICAgS2V5OiB7IGZpbGVfaWQ6ICdoZWFsdGgtY2hlY2stbm9uLWV4aXN0ZW50LWlkJyB9XHJcbiAgICAgIH0pXHJcblxyXG4gICAgICBhd2FpdCB0aGlzLmRvY0NsaWVudC5zZW5kKGNvbW1hbmQpXHJcbiAgICAgIHJldHVybiB7IGhlYWx0aHk6IHRydWUsIG1lc3NhZ2U6ICdEeW5hbW9EQiBjb25uZWN0aW9uIGlzIGhlYWx0aHknIH1cclxuICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcclxuICAgICAgaWYgKGVycm9yLm5hbWUgPT09ICdSZXNvdXJjZU5vdEZvdW5kRXhjZXB0aW9uJykge1xyXG4gICAgICAgIHJldHVybiB7IGhlYWx0aHk6IGZhbHNlLCBtZXNzYWdlOiBgVGFibGUgJHt0aGlzLnRhYmxlTmFtZX0gbm90IGZvdW5kYCB9XHJcbiAgICAgIH1cclxuICAgICAgXHJcbiAgICAgIHJldHVybiB7IGhlYWx0aHk6IHRydWUsIG1lc3NhZ2U6ICdEeW5hbW9EQiBjb25uZWN0aW9uIGlzIGhlYWx0aHknIH1cclxuICAgIH1cclxuICB9XHJcbn1cclxuIl19
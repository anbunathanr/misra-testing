/**
 * DynamoDB client configuration and connection handling
 * Provides configured DynamoDB client with retry logic and error handling
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, DeleteCommand, QueryCommand, ScanCommand, BatchGetCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb'
import { DYNAMODB_CONFIG, getTableName } from '../config/dynamodb-config'
import { MetadataError, ErrorCodes } from '../types/validation'

/**
 * DynamoDB client wrapper with error handling and retry logic
 */
export class DynamoDBClientWrapper {
  private client: DynamoDBClient
  private docClient: DynamoDBDocumentClient
  private tableName: string

  constructor(environment?: string) {
    // Create base DynamoDB client
    this.client = new DynamoDBClient({
      region: DYNAMODB_CONFIG.region,
      maxAttempts: DYNAMODB_CONFIG.maxRetries,
      retryMode: 'adaptive'
    })

    // Create document client for easier JSON handling
    this.docClient = DynamoDBDocumentClient.from(this.client, {
      marshallOptions: {
        convertEmptyValues: false,
        removeUndefinedValues: true,
        convertClassInstanceToMap: false
      },
      unmarshallOptions: {
        wrapNumbers: false
      }
    })

    this.tableName = getTableName(environment)
  }

  /**
   * Get table name for this client instance
   */
  getTableName(): string {
    return this.tableName
  }

  /**
   * Put item into DynamoDB table
   */
  async putItem(item: Record<string, any>, conditionExpression?: string): Promise<void> {
    try {
      const command = new PutCommand({
        TableName: this.tableName,
        Item: item,
        ConditionExpression: conditionExpression
      })

      await this.docClient.send(command)
    } catch (error) {
      throw this.handleDynamoDBError(error, 'putItem')
    }
  }

  /**
   * Get item from DynamoDB table
   */
  async getItem(key: Record<string, any>): Promise<Record<string, any> | undefined> {
    try {
      const command = new GetCommand({
        TableName: this.tableName,
        Key: key
      })

      const result = await this.docClient.send(command)
      return result.Item
    } catch (error) {
      throw this.handleDynamoDBError(error, 'getItem')
    }
  }

  /**
   * Update item in DynamoDB table
   */
  async updateItem(
    key: Record<string, any>,
    updateExpression: string,
    expressionAttributeNames?: Record<string, string>,
    expressionAttributeValues?: Record<string, any>,
    conditionExpression?: string
  ): Promise<Record<string, any>> {
    try {
      const command = new UpdateCommand({
        TableName: this.tableName,
        Key: key,
        UpdateExpression: updateExpression,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ConditionExpression: conditionExpression,
        ReturnValues: 'ALL_NEW'
      })

      const result = await this.docClient.send(command)
      if (!result.Attributes) {
        throw new MetadataError(
          'Update operation did not return updated item',
          ErrorCodes.DATABASE_ERROR,
          500
        )
      }
      return result.Attributes
    } catch (error) {
      throw this.handleDynamoDBError(error, 'updateItem')
    }
  }

  /**
   * Delete item from DynamoDB table
   */
  async deleteItem(key: Record<string, any>, conditionExpression?: string): Promise<void> {
    try {
      const command = new DeleteCommand({
        TableName: this.tableName,
        Key: key,
        ConditionExpression: conditionExpression
      })

      await this.docClient.send(command)
    } catch (error) {
      throw this.handleDynamoDBError(error, 'deleteItem')
    }
  }

  /**
   * Query items from DynamoDB table or GSI
   */
  async queryItems(
    keyConditionExpression: string,
    expressionAttributeNames?: Record<string, string>,
    expressionAttributeValues?: Record<string, any>,
    indexName?: string,
    scanIndexForward: boolean = false,
    limit?: number,
    exclusiveStartKey?: Record<string, any>
  ): Promise<{
    items: Record<string, any>[]
    lastEvaluatedKey?: Record<string, any>
    count: number
    scannedCount: number
  }> {
    try {
      const command = new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: keyConditionExpression,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        IndexName: indexName,
        ScanIndexForward: scanIndexForward,
        Limit: limit,
        ExclusiveStartKey: exclusiveStartKey
      })

      const result = await this.docClient.send(command)
      
      const response: {
        items: Record<string, any>[]
        lastEvaluatedKey?: Record<string, any>
        count: number
        scannedCount: number
      } = {
        items: result.Items || [],
        count: result.Count || 0,
        scannedCount: result.ScannedCount || 0
      }
      
      if (result.LastEvaluatedKey) {
        response.lastEvaluatedKey = result.LastEvaluatedKey
      }
      
      return response
    } catch (error) {
      throw this.handleDynamoDBError(error, 'queryItems')
    }
  }

  /**
   * Query by index with simplified parameters
   */
  async queryByIndex(
    indexName: string,
    partitionKeyName: string,
    partitionKeyValue: any,
    options?: {
      sortKeyName?: string;
      sortKeyValue?: any;
      limit?: number;
      exclusiveStartKey?: Record<string, any>;
      scanIndexForward?: boolean;
    }
  ): Promise<{
    items: Record<string, any>[]
    lastEvaluatedKey?: Record<string, any>
    count: number
    scannedCount: number
  }> {
    const expressionAttributeNames: Record<string, string> = {
      '#pk': partitionKeyName
    };
    const expressionAttributeValues: Record<string, any> = {
      ':pkval': partitionKeyValue
    };

    let keyConditionExpression = '#pk = :pkval';

    if (options?.sortKeyName && options?.sortKeyValue !== undefined) {
      expressionAttributeNames['#sk'] = options.sortKeyName;
      expressionAttributeValues[':skval'] = options.sortKeyValue;
      keyConditionExpression += ' AND #sk = :skval';
    }

    return this.queryItems(
      keyConditionExpression,
      expressionAttributeNames,
      expressionAttributeValues,
      indexName,
      options?.scanIndexForward ?? false,
      options?.limit,
      options?.exclusiveStartKey
    );
  }

  /**
   * Scan table with optional filters
   */
  async scan(options?: {
    limit?: number;
    exclusiveStartKey?: Record<string, any>;
    filterExpression?: string;
    expressionAttributeNames?: Record<string, string>;
    expressionAttributeValues?: Record<string, any>;
  }): Promise<{
    items: Record<string, any>[]
    lastEvaluatedKey?: Record<string, any>
    count: number
    scannedCount: number
  }> {
    try {
      const command = new ScanCommand({
        TableName: this.tableName,
        Limit: options?.limit,
        ExclusiveStartKey: options?.exclusiveStartKey,
        FilterExpression: options?.filterExpression,
        ExpressionAttributeNames: options?.expressionAttributeNames,
        ExpressionAttributeValues: options?.expressionAttributeValues
      });

      const result = await this.docClient.send(command);
      
      const response: {
        items: Record<string, any>[]
        lastEvaluatedKey?: Record<string, any>
        count: number
        scannedCount: number
      } = {
        items: result.Items || [],
        count: result.Count || 0,
        scannedCount: result.ScannedCount || 0
      };
      
      if (result.LastEvaluatedKey) {
        response.lastEvaluatedKey = result.LastEvaluatedKey;
      }
      
      return response;
    } catch (error) {
      throw this.handleDynamoDBError(error, 'scan');
    }
  }

  /**
   * Batch get items from DynamoDB table
   */
  async batchGetItems(keys: Record<string, any>[]): Promise<Record<string, any>[]> {
    if (keys.length === 0) {
      return []
    }

    try {
      const command = new BatchGetCommand({
        RequestItems: {
          [this.tableName]: {
            Keys: keys
          }
        }
      })

      const result = await this.docClient.send(command)
      return result.Responses?.[this.tableName] || []
    } catch (error) {
      throw this.handleDynamoDBError(error, 'batchGetItems')
    }
  }

  /**
   * Batch delete items from DynamoDB table
   */
  async batchDeleteItems(keys: Record<string, any>[]): Promise<void> {
    if (keys.length === 0) {
      return
    }

    const batchSize = 25
    const batches = []
    
    for (let i = 0; i < keys.length; i += batchSize) {
      batches.push(keys.slice(i, i + batchSize))
    }

    try {
      await Promise.all(batches.map(batch => this.processBatchDelete(batch)))
    } catch (error) {
      throw this.handleDynamoDBError(error, 'batchDeleteItems')
    }
  }

  private async processBatchDelete(keys: Record<string, any>[]): Promise<void> {
    const deleteRequests = keys.map(key => ({
      DeleteRequest: { Key: key }
    }))

    const command = new BatchWriteCommand({
      RequestItems: {
        [this.tableName]: deleteRequests
      }
    })

    await this.docClient.send(command)
  }

  private handleDynamoDBError(error: any, operation: string): MetadataError {
    console.error(`DynamoDB ${operation} error:`, error)

    if (error.name === 'ConditionalCheckFailedException') {
      return new MetadataError(
        'Conditional check failed - item may already exist or not meet conditions',
        ErrorCodes.DUPLICATE_FILE_ID,
        409
      )
    }

    if (error.name === 'ResourceNotFoundException') {
      return new MetadataError(
        'Table or item not found',
        ErrorCodes.NOT_FOUND,
        404
      )
    }

    if (error.name === 'ValidationException') {
      return new MetadataError(
        `Invalid request: ${error.message}`,
        ErrorCodes.VALIDATION_ERROR,
        400
      )
    }

    if (error.name === 'ProvisionedThroughputExceededException' || 
        error.name === 'ThrottlingException') {
      return new MetadataError(
        'Database is temporarily unavailable due to high load',
        ErrorCodes.DATABASE_ERROR,
        503
      )
    }

    if (error.name === 'ItemCollectionSizeLimitExceededException') {
      return new MetadataError(
        'Item collection size limit exceeded',
        ErrorCodes.DATABASE_ERROR,
        400
      )
    }

    return new MetadataError(
      `Database operation failed: ${error.message || 'Unknown error'}`,
      ErrorCodes.DATABASE_ERROR,
      500,
      { originalError: error.name, operation }
    )
  }

  async close(): Promise<void> {
    this.client.destroy()
  }

  async healthCheck(): Promise<{ healthy: boolean; message: string }> {
    try {
      const command = new GetCommand({
        TableName: this.tableName,
        Key: { file_id: 'health-check-non-existent-id' }
      })

      await this.docClient.send(command)
      return { healthy: true, message: 'DynamoDB connection is healthy' }
    } catch (error: any) {
      if (error.name === 'ResourceNotFoundException') {
        return { healthy: false, message: `Table ${this.tableName} not found` }
      }
      
      return { healthy: true, message: 'DynamoDB connection is healthy' }
    }
  }
}

/**
 * DynamoDB client configuration and connection handling
 * Provides configured DynamoDB client with retry logic and error handling
 */
/**
 * DynamoDB client wrapper with error handling and retry logic
 */
export declare class DynamoDBClientWrapper {
    private client;
    private docClient;
    private tableName;
    constructor(environment?: string);
    /**
     * Get table name for this client instance
     */
    getTableName(): string;
    /**
     * Put item into DynamoDB table
     */
    putItem(item: Record<string, any>, conditionExpression?: string): Promise<void>;
    /**
     * Get item from DynamoDB table
     */
    getItem(key: Record<string, any>): Promise<Record<string, any> | undefined>;
    /**
     * Update item in DynamoDB table
     */
    updateItem(key: Record<string, any>, updateExpression: string, expressionAttributeNames?: Record<string, string>, expressionAttributeValues?: Record<string, any>, conditionExpression?: string): Promise<Record<string, any>>;
    /**
     * Delete item from DynamoDB table
     */
    deleteItem(key: Record<string, any>, conditionExpression?: string): Promise<void>;
    /**
     * Query items from DynamoDB table or GSI
     */
    queryItems(keyConditionExpression: string, expressionAttributeNames?: Record<string, string>, expressionAttributeValues?: Record<string, any>, indexName?: string, scanIndexForward?: boolean, limit?: number, exclusiveStartKey?: Record<string, any>): Promise<{
        items: Record<string, any>[];
        lastEvaluatedKey?: Record<string, any>;
        count: number;
        scannedCount: number;
    }>;
    /**
     * Query by index with simplified parameters
     */
    queryByIndex(indexName: string, partitionKeyName: string, partitionKeyValue: any, options?: {
        sortKeyName?: string;
        sortKeyValue?: any;
        limit?: number;
        exclusiveStartKey?: Record<string, any>;
        scanIndexForward?: boolean;
    }): Promise<{
        items: Record<string, any>[];
        lastEvaluatedKey?: Record<string, any>;
        count: number;
        scannedCount: number;
    }>;
    /**
     * Scan table with optional filters
     */
    scan(options?: {
        limit?: number;
        exclusiveStartKey?: Record<string, any>;
        filterExpression?: string;
        expressionAttributeNames?: Record<string, string>;
        expressionAttributeValues?: Record<string, any>;
    }): Promise<{
        items: Record<string, any>[];
        lastEvaluatedKey?: Record<string, any>;
        count: number;
        scannedCount: number;
    }>;
    /**
     * Batch get items from DynamoDB table
     */
    batchGetItems(keys: Record<string, any>[]): Promise<Record<string, any>[]>;
    /**
     * Batch delete items from DynamoDB table
     */
    batchDeleteItems(keys: Record<string, any>[]): Promise<void>;
    private processBatchDelete;
    private handleDynamoDBError;
    close(): Promise<void>;
    healthCheck(): Promise<{
        healthy: boolean;
        message: string;
    }>;
}

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
export interface CostBreakdown {
    lambdaExecutionTime: number;
    lambdaCost: number;
    s3StorageCost: number;
    dynamoDbWriteCost: number;
    totalCost: number;
}
export interface CostRecord {
    userId: string;
    organizationId: string;
    timestamp: string;
    analysisId: string;
    fileId: string;
    costs: CostBreakdown;
    metadata: {
        fileSize: number;
        duration: number;
    };
}
export interface CostAggregation {
    totalCost: number;
    lambdaCost: number;
    s3Cost: number;
    dynamoDbCost: number;
    analysisCount: number;
    period: {
        start: string;
        end: string;
    };
}
/**
 * Cost Tracker Service
 *
 * Tracks and aggregates costs for MISRA analysis operations.
 * Requirements: 14.1, 14.2, 14.3, 14.4
 */
export declare class CostTracker {
    private dynamoClient;
    private tableName;
    constructor(dynamoClient?: DynamoDBClient, tableName?: string);
    /**
     * Calculate costs for an analysis operation
     * Requirements: 14.1, 14.2, 14.3
     */
    calculateCosts(executionTimeMs: number, fileSizeBytes: number, dynamoDbWrites?: number): CostBreakdown;
    /**
     * Record cost data for an analysis
     * Requirements: 14.1
     */
    recordCost(userId: string, organizationId: string, analysisId: string, fileId: string, costs: CostBreakdown, metadata: {
        fileSize: number;
        duration: number;
    }): Promise<void>;
    /**
     * Aggregate costs by user
     * Requirements: 14.4
     */
    aggregateCostsByUser(userId: string, startDate?: Date, endDate?: Date): Promise<CostAggregation>;
    /**
     * Aggregate costs by organization
     * Requirements: 14.4
     */
    aggregateCostsByOrganization(organizationId: string, startDate?: Date, endDate?: Date): Promise<CostAggregation>;
    /**
     * Helper method to aggregate cost records
     */
    private aggregateRecords;
}

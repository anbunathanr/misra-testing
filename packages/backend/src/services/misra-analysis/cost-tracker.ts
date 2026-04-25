import { DynamoDBClient, PutItemCommand, QueryCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';

/**
 * AWS Pricing Constants (as of 2024)
 * Requirements: 14.1, 14.2, 14.3
 */
const PRICING = {
  // Lambda: $0.0000166667 per GB-second
  LAMBDA_PER_GB_SECOND: 0.0000166667,
  
  // S3: $0.023 per GB per month
  S3_PER_GB_MONTH: 0.023,
  
  // DynamoDB: $1.25 per million write request units
  DYNAMODB_PER_WRITE: 0.00000125,
};

export interface CostBreakdown {
  lambdaExecutionTime: number; // milliseconds
  lambdaCost: number; // USD
  s3StorageCost: number; // USD
  dynamoDbWriteCost: number; // USD
  totalCost: number; // USD
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
export class CostTracker {
  private dynamoClient: DynamoDBClient;
  private tableName: string;

  constructor(
    dynamoClient?: DynamoDBClient,
    tableName?: string
  ) {
    this.dynamoClient = dynamoClient || new DynamoDBClient({
      region: process.env.AWS_REGION || 'us-east-1',
    });
    this.tableName = tableName || process.env.ANALYSIS_COSTS_TABLE || 'AnalysisCosts';
  }

  /**
   * Calculate costs for an analysis operation
   * Requirements: 14.1, 14.2, 14.3
   */
  calculateCosts(
    executionTimeMs: number,
    fileSizeBytes: number,
    dynamoDbWrites: number = 2 // Default: 1 for analysis result, 1 for file metadata update
  ): CostBreakdown {
    // Lambda cost: execution time * memory allocation
    // Assuming 2GB memory allocation for analysis Lambda
    const memoryGB = 2;
    const executionSeconds = executionTimeMs / 1000;
    const lambdaCost = executionSeconds * memoryGB * PRICING.LAMBDA_PER_GB_SECOND;

    // S3 storage cost: file size * monthly rate / days in month
    // Calculate for 1 month of storage
    const fileSizeGB = fileSizeBytes / (1024 * 1024 * 1024);
    const s3StorageCost = fileSizeGB * PRICING.S3_PER_GB_MONTH;

    // DynamoDB write cost
    const dynamoDbWriteCost = dynamoDbWrites * PRICING.DYNAMODB_PER_WRITE;

    // Total cost
    const totalCost = lambdaCost + s3StorageCost + dynamoDbWriteCost;

    return {
      lambdaExecutionTime: executionTimeMs,
      lambdaCost: parseFloat(lambdaCost.toFixed(6)),
      s3StorageCost: parseFloat(s3StorageCost.toFixed(6)),
      dynamoDbWriteCost: parseFloat(dynamoDbWriteCost.toFixed(6)),
      totalCost: parseFloat(totalCost.toFixed(6)),
    };
  }

  /**
   * Record cost data for an analysis
   * Requirements: 14.1
   */
  async recordCost(
    userId: string,
    organizationId: string,
    analysisId: string,
    fileId: string,
    costs: CostBreakdown,
    metadata: {
      fileSize: number;
      duration: number;
    }
  ): Promise<void> {
    const timestamp = Date.now(); // CRITICAL: Must be a number, not a string

    const item: CostRecord = {
      userId,
      organizationId,
      timestamp: timestamp.toString(), // Store as string in the interface for compatibility
      analysisId,
      fileId,
      costs,
      metadata,
    };

    const command = new PutItemCommand({
      TableName: this.tableName,
      Item: marshall({
        ...item,
        timestamp: timestamp, // Override with number for DynamoDB
      }),
    });

    await this.dynamoClient.send(command);
  }

  /**
   * Aggregate costs by user
   * Requirements: 14.4
   */
  async aggregateCostsByUser(
    userId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<CostAggregation> {
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default: last 30 days
    const end = endDate || new Date();

    const command = new QueryCommand({
      TableName: this.tableName,
      KeyConditionExpression: 'userId = :userId AND #ts BETWEEN :start AND :end',
      ExpressionAttributeNames: {
        '#ts': 'timestamp',
      },
      ExpressionAttributeValues: marshall({
        ':userId': userId,
        ':start': start.toISOString(),
        ':end': end.toISOString(),
      }),
    });

    const response = await this.dynamoClient.send(command);
    const records = (response.Items || []).map(item => unmarshall(item) as CostRecord);

    return this.aggregateRecords(records, start, end);
  }

  /**
   * Aggregate costs by organization
   * Requirements: 14.4
   */
  async aggregateCostsByOrganization(
    organizationId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<CostAggregation> {
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default: last 30 days
    const end = endDate || new Date();

    const command = new QueryCommand({
      TableName: this.tableName,
      IndexName: 'OrganizationIndex',
      KeyConditionExpression: 'organizationId = :orgId AND #ts BETWEEN :start AND :end',
      ExpressionAttributeNames: {
        '#ts': 'timestamp',
      },
      ExpressionAttributeValues: marshall({
        ':orgId': organizationId,
        ':start': start.toISOString(),
        ':end': end.toISOString(),
      }),
    });

    const response = await this.dynamoClient.send(command);
    const records = (response.Items || []).map(item => unmarshall(item) as CostRecord);

    return this.aggregateRecords(records, start, end);
  }

  /**
   * Helper method to aggregate cost records
   */
  private aggregateRecords(
    records: CostRecord[],
    start: Date,
    end: Date
  ): CostAggregation {
    const aggregation: CostAggregation = {
      totalCost: 0,
      lambdaCost: 0,
      s3Cost: 0,
      dynamoDbCost: 0,
      analysisCount: records.length,
      period: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
    };

    for (const record of records) {
      aggregation.totalCost += record.costs.totalCost;
      aggregation.lambdaCost += record.costs.lambdaCost;
      aggregation.s3Cost += record.costs.s3StorageCost;
      aggregation.dynamoDbCost += record.costs.dynamoDbWriteCost;
    }

    // Round to 6 decimal places
    aggregation.totalCost = parseFloat(aggregation.totalCost.toFixed(6));
    aggregation.lambdaCost = parseFloat(aggregation.lambdaCost.toFixed(6));
    aggregation.s3Cost = parseFloat(aggregation.s3Cost.toFixed(6));
    aggregation.dynamoDbCost = parseFloat(aggregation.dynamoDbCost.toFixed(6));

    return aggregation;
  }
}

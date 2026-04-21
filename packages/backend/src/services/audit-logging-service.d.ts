import { DynamoDBRecord } from 'aws-lambda';
export declare class AuditLoggingService {
    private cloudWatchLogs;
    private logger;
    private logGroupName;
    constructor(logGroupName: string, correlationId?: string);
    /**
     * Process DynamoDB stream records and create audit logs
     */
    processStreamRecords(records: DynamoDBRecord[]): Promise<void>;
    /**
     * Create audit log entry from DynamoDB stream record
     */
    private createAuditEntry;
    /**
     * Extract table name from event source ARN
     */
    private extractTableName;
    /**
     * Extract record ID from DynamoDB keys
     */
    private extractRecordId;
    /**
     * Extract user ID from DynamoDB item
     */
    private extractUserId;
    /**
     * Unmarshall DynamoDB item to regular object
     */
    private unmarshallDynamoDBItem;
    /**
     * Write audit logs to CloudWatch Logs
     */
    private writeAuditLogs;
    /**
     * Create security audit log for sensitive operations
     */
    logSecurityEvent(event: {
        action: string;
        userId?: string;
        resourceId?: string;
        sourceIp?: string;
        userAgent?: string;
        success: boolean;
        details?: any;
    }): Promise<void>;
    /**
     * Create compliance audit log for regulatory requirements
     */
    logComplianceEvent(event: {
        regulation: string;
        action: string;
        userId?: string;
        dataType: string;
        retention: string;
        details?: any;
    }): Promise<void>;
}

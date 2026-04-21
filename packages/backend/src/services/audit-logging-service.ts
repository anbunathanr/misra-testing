import { DynamoDBStreamEvent, DynamoDBRecord } from 'aws-lambda';
import { CloudWatchLogs } from 'aws-sdk';
import { createLogger } from '../utils/logger';

interface AuditLogEntry {
  timestamp: string;
  eventName: string;
  tableName: string;
  userId?: string;
  recordId: string;
  oldImage?: any;
  newImage?: any;
  correlationId?: string;
  sourceIp?: string;
  userAgent?: string;
}

export class AuditLoggingService {
  private cloudWatchLogs: CloudWatchLogs;
  private logger: ReturnType<typeof createLogger>;
  private logGroupName: string;

  constructor(logGroupName: string, correlationId: string = 'audit-service') {
    this.cloudWatchLogs = new CloudWatchLogs();
    this.logGroupName = logGroupName;
    this.logger = createLogger('audit-logging-service', {
      correlationId,
      functionName: 'audit-logging-service'
    });
  }

  /**
   * Process DynamoDB stream records and create audit logs
   */
  async processStreamRecords(records: DynamoDBRecord[]): Promise<void> {
    const auditEntries: AuditLogEntry[] = [];

    for (const record of records) {
      try {
        const auditEntry = this.createAuditEntry(record);
        if (auditEntry) {
          auditEntries.push(auditEntry);
        }
      } catch (error) {
        const err = error as Error;
        this.logger.error('Failed to process stream record', err, {
          recordId: record.dynamodb?.SequenceNumber,
          eventName: record.eventName
        });
      }
    }

    if (auditEntries.length > 0) {
      await this.writeAuditLogs(auditEntries);
    }
  }

  /**
   * Create audit log entry from DynamoDB stream record
   */
  private createAuditEntry(record: DynamoDBRecord): AuditLogEntry | null {
    if (!record.dynamodb || !record.eventName) {
      return null;
    }

    const tableName = this.extractTableName(record.eventSourceARN);
    const recordId = this.extractRecordId(record.dynamodb.Keys);
    const userId = this.extractUserId(record.dynamodb.NewImage || record.dynamodb.OldImage);

    const auditEntry: AuditLogEntry = {
      timestamp: new Date().toISOString(),
      eventName: record.eventName,
      tableName,
      recordId,
      userId,
    };

    // Add old and new images for INSERT, MODIFY, REMOVE events
    if (record.eventName === 'INSERT' && record.dynamodb.NewImage) {
      auditEntry.newImage = this.unmarshallDynamoDBItem(record.dynamodb.NewImage);
    } else if (record.eventName === 'MODIFY') {
      if (record.dynamodb.OldImage) {
        auditEntry.oldImage = this.unmarshallDynamoDBItem(record.dynamodb.OldImage);
      }
      if (record.dynamodb.NewImage) {
        auditEntry.newImage = this.unmarshallDynamoDBItem(record.dynamodb.NewImage);
      }
    } else if (record.eventName === 'REMOVE' && record.dynamodb.OldImage) {
      auditEntry.oldImage = this.unmarshallDynamoDBItem(record.dynamodb.OldImage);
    }

    return auditEntry;
  }

  /**
   * Extract table name from event source ARN
   */
  private extractTableName(eventSourceARN?: string): string {
    if (!eventSourceARN) return 'unknown';
    
    // ARN format: arn:aws:dynamodb:region:account:table/table-name/stream/timestamp
    const parts = eventSourceARN.split('/');
    return parts.length >= 2 ? parts[1] : 'unknown';
  }

  /**
   * Extract record ID from DynamoDB keys
   */
  private extractRecordId(keys?: any): string {
    if (!keys) return 'unknown';

    // Try common key patterns
    if (keys.userId?.S) return keys.userId.S;
    if (keys.fileId?.S) return keys.fileId.S;
    if (keys.analysisId?.S) return keys.analysisId.S;
    if (keys.sampleId?.S) return keys.sampleId.S;

    // Fallback to first string key
    const firstKey = Object.keys(keys)[0];
    return keys[firstKey]?.S || 'unknown';
  }

  /**
   * Extract user ID from DynamoDB item
   */
  private extractUserId(item?: any): string | undefined {
    if (!item) return undefined;

    // Try to find userId in the item
    if (item.userId?.S) return item.userId.S;
    if (item.createdBy?.S) return item.createdBy.S;
    if (item.updatedBy?.S) return item.updatedBy.S;

    return undefined;
  }

  /**
   * Unmarshall DynamoDB item to regular object
   */
  private unmarshallDynamoDBItem(item: any): any {
    const result: any = {};

    for (const [key, value] of Object.entries(item)) {
      if (typeof value === 'object' && value !== null) {
        const dynamoValue = value as any;
        
        if (dynamoValue.S !== undefined) {
          result[key] = dynamoValue.S;
        } else if (dynamoValue.N !== undefined) {
          result[key] = Number(dynamoValue.N);
        } else if (dynamoValue.B !== undefined) {
          result[key] = dynamoValue.B;
        } else if (dynamoValue.SS !== undefined) {
          result[key] = dynamoValue.SS;
        } else if (dynamoValue.NS !== undefined) {
          result[key] = dynamoValue.NS.map(Number);
        } else if (dynamoValue.BS !== undefined) {
          result[key] = dynamoValue.BS;
        } else if (dynamoValue.M !== undefined) {
          result[key] = this.unmarshallDynamoDBItem(dynamoValue.M);
        } else if (dynamoValue.L !== undefined) {
          result[key] = dynamoValue.L.map((item: any) => this.unmarshallDynamoDBItem({ item }).item);
        } else if (dynamoValue.NULL !== undefined) {
          result[key] = null;
        } else if (dynamoValue.BOOL !== undefined) {
          result[key] = dynamoValue.BOOL;
        }
      }
    }

    return result;
  }

  /**
   * Write audit logs to CloudWatch Logs
   */
  private async writeAuditLogs(auditEntries: AuditLogEntry[]): Promise<void> {
    try {
      const logEvents = auditEntries.map(entry => ({
        timestamp: Date.now(),
        message: JSON.stringify(entry)
      }));

      // Create log stream if it doesn't exist
      const logStreamName = `audit-${new Date().toISOString().split('T')[0]}`;
      
      try {
        await this.cloudWatchLogs.createLogStream({
          logGroupName: this.logGroupName,
          logStreamName
        }).promise();
      } catch (error) {
        const err = error as any; // AWS SDK error has code property
        // Log stream might already exist, ignore error
        if (err.code !== 'ResourceAlreadyExistsException') {
          throw error;
        }
      }

      // Get sequence token for the log stream
      const describeResponse = await this.cloudWatchLogs.describeLogStreams({
        logGroupName: this.logGroupName,
        logStreamNamePrefix: logStreamName
      }).promise();

      const logStream = describeResponse.logStreams?.[0];
      const sequenceToken = logStream?.uploadSequenceToken;

      // Put log events
      const putParams: any = {
        logGroupName: this.logGroupName,
        logStreamName,
        logEvents
      };

      if (sequenceToken) {
        putParams.sequenceToken = sequenceToken;
      }

      await this.cloudWatchLogs.putLogEvents(putParams).promise();

      this.logger.info('Audit logs written successfully', {
        logCount: auditEntries.length,
        logStreamName
      });

    } catch (error) {
      const err = error as Error;
      this.logger.error('Failed to write audit logs', err, {
        logCount: auditEntries.length
      });
      throw error;
    }
  }

  /**
   * Create security audit log for sensitive operations
   */
  async logSecurityEvent(event: {
    action: string;
    userId?: string;
    resourceId?: string;
    sourceIp?: string;
    userAgent?: string;
    success: boolean;
    details?: any;
  }): Promise<void> {
    const securityLogEntry = {
      timestamp: new Date().toISOString(),
      eventType: 'SECURITY_EVENT',
      action: event.action,
      userId: event.userId,
      resourceId: event.resourceId,
      sourceIp: event.sourceIp,
      userAgent: event.userAgent,
      success: event.success,
      details: event.details
    };

    await this.writeAuditLogs([securityLogEntry as any]);
  }

  /**
   * Create compliance audit log for regulatory requirements
   */
  async logComplianceEvent(event: {
    regulation: string;
    action: string;
    userId?: string;
    dataType: string;
    retention: string;
    details?: any;
  }): Promise<void> {
    const complianceLogEntry = {
      timestamp: new Date().toISOString(),
      eventType: 'COMPLIANCE_EVENT',
      regulation: event.regulation,
      action: event.action,
      userId: event.userId,
      dataType: event.dataType,
      retention: event.retention,
      details: event.details
    };

    await this.writeAuditLogs([complianceLogEntry as any]);
  }
}
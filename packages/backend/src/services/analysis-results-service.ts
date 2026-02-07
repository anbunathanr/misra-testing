/**
 * Analysis Results Service
 * Manages persistence and retrieval of MISRA analysis results
 */

import { v4 as uuidv4 } from 'uuid';
import { DynamoDBClientWrapper } from '../database/dynamodb-client';
import {
  StoredAnalysisResult,
  StoredViolation,
  AnalysisQueryFilters,
  AnalysisPaginationOptions,
  PaginatedAnalysisResults
} from '../types/analysis-persistence';
import { AnalysisResult, RuleViolation } from '../types/misra-rules';

export class AnalysisResultsService {
  constructor(private readonly dbClient: DynamoDBClientWrapper) {}

  /**
   * Store analysis result in DynamoDB
   */
  async storeAnalysisResult(
    analysisResult: AnalysisResult,
    userId: string,
    organizationId?: string
  ): Promise<StoredAnalysisResult> {
    const analysisId = uuidv4();
    const timestamp = Date.now();

    // Convert violations to stored format
    const storedViolations: StoredViolation[] = analysisResult.violations.map(v => ({
      ruleId: v.ruleId,
      ruleSet: v.ruleSet,
      severity: v.severity,
      lineNumber: v.lineNumber,
      columnNumber: v.columnNumber,
      message: v.message,
      codeSnippet: v.codeSnippet,
      recommendation: v.recommendation
    }));

    const storedResult: StoredAnalysisResult = {
      analysisId,
      fileId: analysisResult.fileId,
      userId,
      organizationId,
      fileName: analysisResult.fileName,
      ruleSet: analysisResult.ruleSet,
      timestamp,
      violationsCount: analysisResult.violationsCount,
      rulesChecked: analysisResult.rulesChecked,
      violations: storedViolations,
      success: analysisResult.success,
      errorMessage: analysisResult.errorMessage,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    await this.dbClient.putItem(storedResult as Record<string, any>);
    return storedResult;
  }

  /**
   * Get analysis result by ID
   */
  async getAnalysisResult(analysisId: string, timestamp: number): Promise<StoredAnalysisResult | null> {
    const result = await this.dbClient.getItem({
      analysisId,
      timestamp
    });

    return result as StoredAnalysisResult | null;
  }

  /**
   * Get all analysis results for a file
   */
  async getFileAnalysisHistory(
    fileId: string,
    pagination?: AnalysisPaginationOptions
  ): Promise<PaginatedAnalysisResults> {
    const limit = pagination?.limit || 50;

    const results = await this.dbClient.queryByIndex(
      'fileId-timestamp-index',
      'fileId',
      fileId,
      {
        limit,
        exclusiveStartKey: pagination?.exclusiveStartKey,
        scanIndexForward: false // Most recent first
      }
    );

    return {
      items: results.items as StoredAnalysisResult[],
      lastEvaluatedKey: results.lastEvaluatedKey,
      count: results.count,
      scannedCount: results.scannedCount
    };
  }

  /**
   * Get all analysis results for a user
   */
  async getUserAnalysisHistory(
    userId: string,
    pagination?: AnalysisPaginationOptions
  ): Promise<PaginatedAnalysisResults> {
    const limit = pagination?.limit || 50;

    const results = await this.dbClient.queryByIndex(
      'userId-timestamp-index',
      'userId',
      userId,
      {
        limit,
        exclusiveStartKey: pagination?.exclusiveStartKey,
        scanIndexForward: false // Most recent first
      }
    );

    return {
      items: results.items as StoredAnalysisResult[],
      lastEvaluatedKey: results.lastEvaluatedKey,
      count: results.count,
      scannedCount: results.scannedCount
    };
  }

  /**
   * Get analysis results by rule set
   */
  async getAnalysisByRuleSet(
    ruleSet: string,
    pagination?: AnalysisPaginationOptions
  ): Promise<PaginatedAnalysisResults> {
    const limit = pagination?.limit || 50;

    const results = await this.dbClient.queryByIndex(
      'ruleSet-timestamp-index',
      'ruleSet',
      ruleSet,
      {
        limit,
        exclusiveStartKey: pagination?.exclusiveStartKey,
        scanIndexForward: false // Most recent first
      }
    );

    return {
      items: results.items as StoredAnalysisResult[],
      lastEvaluatedKey: results.lastEvaluatedKey,
      count: results.count,
      scannedCount: results.scannedCount
    };
  }

  /**
   * Query analysis results with filters
   */
  async queryAnalysisResults(
    filters: AnalysisQueryFilters,
    pagination?: AnalysisPaginationOptions
  ): Promise<PaginatedAnalysisResults> {
    // Determine which index to use based on filters
    if (filters.fileId) {
      return this.getFileAnalysisHistory(filters.fileId, pagination);
    } else if (filters.userId) {
      return this.getUserAnalysisHistory(filters.userId, pagination);
    } else if (filters.ruleSet) {
      return this.getAnalysisByRuleSet(filters.ruleSet, pagination);
    }

    // If no specific index filter, scan with filters (less efficient)
    return this.scanWithFilters(filters, pagination);
  }

  /**
   * Scan table with filters (fallback for complex queries)
   */
  private async scanWithFilters(
    filters: AnalysisQueryFilters,
    pagination?: AnalysisPaginationOptions
  ): Promise<PaginatedAnalysisResults> {
    const limit = pagination?.limit || 50;

    // Build filter expression
    const filterParts: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    if (filters.startDate) {
      filterParts.push('#timestamp >= :startDate');
      expressionAttributeNames['#timestamp'] = 'timestamp';
      expressionAttributeValues[':startDate'] = filters.startDate;
    }

    if (filters.endDate) {
      filterParts.push('#timestamp <= :endDate');
      expressionAttributeNames['#timestamp'] = 'timestamp';
      expressionAttributeValues[':endDate'] = filters.endDate;
    }

    if (filters.minViolations !== undefined) {
      filterParts.push('#violationsCount >= :minViolations');
      expressionAttributeNames['#violationsCount'] = 'violationsCount';
      expressionAttributeValues[':minViolations'] = filters.minViolations;
    }

    if (filters.maxViolations !== undefined) {
      filterParts.push('#violationsCount <= :maxViolations');
      expressionAttributeNames['#violationsCount'] = 'violationsCount';
      expressionAttributeValues[':maxViolations'] = filters.maxViolations;
    }

    if (filters.successOnly) {
      filterParts.push('#success = :success');
      expressionAttributeNames['#success'] = 'success';
      expressionAttributeValues[':success'] = true;
    }

    const filterExpression = filterParts.length > 0 ? filterParts.join(' AND ') : undefined;

    const results = await this.dbClient.scan({
      limit,
      exclusiveStartKey: pagination?.exclusiveStartKey,
      filterExpression,
      expressionAttributeNames: Object.keys(expressionAttributeNames).length > 0 
        ? expressionAttributeNames 
        : undefined,
      expressionAttributeValues: Object.keys(expressionAttributeValues).length > 0 
        ? expressionAttributeValues 
        : undefined
    });

    return {
      items: results.items as StoredAnalysisResult[],
      lastEvaluatedKey: results.lastEvaluatedKey,
      count: results.count,
      scannedCount: results.scannedCount
    };
  }

  /**
   * Delete analysis result
   */
  async deleteAnalysisResult(analysisId: string, timestamp: number): Promise<void> {
    await this.dbClient.deleteItem({
      analysisId,
      timestamp
    });
  }

  /**
   * Get analyses by user ID (simplified method for AI insights)
   */
  async getAnalysesByUserId(
    userId: string,
    options?: { limit?: number }
  ): Promise<StoredAnalysisResult[]> {
    const limit = options?.limit || 100;
    const results = await this.getUserAnalysisHistory(userId, { limit });
    return results.items;
  }

  /**
   * Get analysis statistics for a user
   */
  async getUserAnalysisStats(userId: string): Promise<{
    totalAnalyses: number;
    successfulAnalyses: number;
    failedAnalyses: number;
    totalViolations: number;
    averageViolationsPerFile: number;
  }> {
    const results = await this.getUserAnalysisHistory(userId, { limit: 1000 });
    
    const totalAnalyses = results.items.length;
    const successfulAnalyses = results.items.filter(r => r.success).length;
    const failedAnalyses = results.items.filter(r => !r.success).length;
    const totalViolations = results.items.reduce((sum, r) => sum + r.violationsCount, 0);
    const averageViolationsPerFile = totalAnalyses > 0 ? totalViolations / totalAnalyses : 0;

    return {
      totalAnalyses,
      successfulAnalyses,
      failedAnalyses,
      totalViolations,
      averageViolationsPerFile: Math.round(averageViolationsPerFile * 100) / 100
    };
  }
}

/**
 * Learning Engine Service
 * 
 * Tracks test execution results to improve future test generation.
 * Analyzes selector failures, success rates, and test patterns to provide
 * domain-specific learning context to the AI Engine.
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import {
  AILearningRecord,
  LearningContext,
  SelectorStrategy,
  TestPattern,
  FailedSelector,
} from '../../types/ai-test-generation';

/**
 * Execution result for learning
 */
export interface ExecutionResult {
  testCaseId: string;
  executionId: string;
  success: boolean;
  url: string;
  scenario?: string;
  failedSteps?: {
    stepNumber: number;
    selector?: string;
    selectorStrategy?: SelectorStrategy;
    error: string;
  }[];
}

/**
 * Learning Engine
 * 
 * Learns from test execution results to improve future test generation.
 */
export class LearningEngine {
  private docClient: DynamoDBDocumentClient;
  private tableName: string;

  constructor(
    tableName: string = 'AILearning',
    docClient?: DynamoDBDocumentClient
  ) {
    if (docClient) {
      this.docClient = docClient;
    } else {
      const client = new DynamoDBClient({});
      this.docClient = DynamoDBDocumentClient.from(client);
    }
    this.tableName = tableName;
  }

  /**
   * Record test execution result for learning
   * 
   * @param result - Execution result with success/failure information
   */
  async recordExecution(result: ExecutionResult): Promise<void> {
    const domain = this.extractDomain(result.url);
    const timestamp = Date.now();

    // Record overall execution result
    const executionRecord: AILearningRecord = {
      domain,
      timestamp,
      recordType: 'execution',
      testCaseId: result.testCaseId,
      executionId: result.executionId,
      success: result.success,
      metadata: {
        url: result.url,
        scenario: result.scenario,
      },
    };

    try {
      await this.docClient.send(
        new PutCommand({
          TableName: this.tableName,
          Item: executionRecord,
        })
      );

      console.log(`[Learning Engine] Recorded execution: ${result.executionId}, success: ${result.success}`);

      // Record selector failures if any
      if (!result.success && result.failedSteps) {
        for (const failedStep of result.failedSteps) {
          if (failedStep.selector && failedStep.selectorStrategy) {
            await this.recordSelectorFailure(
              domain,
              failedStep.selector,
              failedStep.selectorStrategy,
              failedStep.error
            );
          }
        }
      }
    } catch (error) {
      console.error('[Learning Engine] Failed to record execution:', error);
      throw new Error(`Failed to record execution: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Record selector failure for learning
   * 
   * @param domain - Application domain
   * @param selector - Failed selector
   * @param strategy - Selector strategy used
   * @param reason - Failure reason
   */
  private async recordSelectorFailure(
    domain: string,
    selector: string,
    strategy: SelectorStrategy,
    reason: string
  ): Promise<void> {
    const timestamp = Date.now();

    const failureRecord: AILearningRecord = {
      domain,
      timestamp,
      recordType: 'selector-failure',
      selector,
      selectorStrategy: strategy,
      failureReason: reason,
    };

    try {
      await this.docClient.send(
        new PutCommand({
          TableName: this.tableName,
          Item: failureRecord,
        })
      );

      console.log(`[Learning Engine] Recorded selector failure: ${selector} (${strategy})`);
    } catch (error) {
      console.error('[Learning Engine] Failed to record selector failure:', error);
    }
  }

  /**
   * Record successful test pattern for learning
   * 
   * @param domain - Application domain
   * @param pattern - Successful test pattern description
   * @param testCaseId - Test case ID
   */
  async recordSuccessfulPattern(
    domain: string,
    pattern: string,
    testCaseId: string
  ): Promise<void> {
    const timestamp = Date.now();

    const patternRecord: AILearningRecord = {
      domain,
      timestamp,
      recordType: 'pattern-success',
      testPattern: pattern,
      testCaseId,
      success: true,
    };

    try {
      await this.docClient.send(
        new PutCommand({
          TableName: this.tableName,
          Item: patternRecord,
        })
      );

      console.log(`[Learning Engine] Recorded successful pattern: ${pattern}`);
    } catch (error) {
      console.error('[Learning Engine] Failed to record successful pattern:', error);
    }
  }

  /**
   * Get learning context for a specific domain
   * 
   * @param domain - Application domain
   * @param lookbackDays - Number of days to look back for learning data (default: 30)
   * @returns Learning context with successful patterns, failing patterns, and selector preferences
   */
  async getLearningContext(domain: string, lookbackDays: number = 30): Promise<LearningContext> {
    const startTimestamp = Date.now() - (lookbackDays * 24 * 60 * 60 * 1000);

    try {
      // Query execution records for this domain
      const executions = await this.queryExecutions(domain, startTimestamp);

      // Query selector failures for this domain
      const selectorFailures = await this.querySelectorFailures(domain, startTimestamp);

      // Query successful patterns for this domain
      const successfulPatterns = await this.querySuccessfulPatterns(domain, startTimestamp);

      // Analyze selector strategy success rates
      const selectorPreferences = this.analyzeSelectorStrategies(executions, selectorFailures);

      // Extract successful pattern descriptions
      const successfulPatternDescriptions = successfulPatterns.map(p => p.testPattern || 'unknown');

      // Extract failing pattern descriptions (patterns with high failure rates)
      const failingPatternDescriptions = this.identifyFailingPatterns(executions);

      return {
        successfulPatterns: successfulPatternDescriptions,
        failingPatterns: failingPatternDescriptions,
        selectorPreferences,
      };
    } catch (error) {
      console.error('[Learning Engine] Failed to get learning context:', error);
      // Return empty context on error
      return {
        successfulPatterns: [],
        failingPatterns: [],
        selectorPreferences: [],
      };
    }
  }

  /**
   * Query execution records for a domain
   */
  private async queryExecutions(domain: string, startTimestamp: number): Promise<AILearningRecord[]> {
    const result = await this.docClient.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'domain = :domain AND #ts >= :startTimestamp',
        FilterExpression: 'recordType = :recordType',
        ExpressionAttributeNames: {
          '#ts': 'timestamp',
        },
        ExpressionAttributeValues: {
          ':domain': domain,
          ':startTimestamp': startTimestamp,
          ':recordType': 'execution',
        },
      })
    );

    return (result.Items || []) as AILearningRecord[];
  }

  /**
   * Query selector failures for a domain
   */
  private async querySelectorFailures(domain: string, startTimestamp: number): Promise<AILearningRecord[]> {
    const result = await this.docClient.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'domain = :domain AND #ts >= :startTimestamp',
        FilterExpression: 'recordType = :recordType',
        ExpressionAttributeNames: {
          '#ts': 'timestamp',
        },
        ExpressionAttributeValues: {
          ':domain': domain,
          ':startTimestamp': startTimestamp,
          ':recordType': 'selector-failure',
        },
      })
    );

    return (result.Items || []) as AILearningRecord[];
  }

  /**
   * Query successful patterns for a domain
   */
  private async querySuccessfulPatterns(domain: string, startTimestamp: number): Promise<AILearningRecord[]> {
    const result = await this.docClient.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'domain = :domain AND #ts >= :startTimestamp',
        FilterExpression: 'recordType = :recordType',
        ExpressionAttributeNames: {
          '#ts': 'timestamp',
        },
        ExpressionAttributeValues: {
          ':domain': domain,
          ':startTimestamp': startTimestamp,
          ':recordType': 'pattern-success',
        },
      })
    );

    return (result.Items || []) as AILearningRecord[];
  }

  /**
   * Analyze selector strategies to determine preferences
   */
  private analyzeSelectorStrategies(
    executions: AILearningRecord[],
    failures: AILearningRecord[]
  ): SelectorStrategy[] {
    // Count failures by strategy
    const failuresByStrategy = new Map<SelectorStrategy, number>();
    failures.forEach(failure => {
      if (failure.selectorStrategy) {
        const count = failuresByStrategy.get(failure.selectorStrategy) || 0;
        failuresByStrategy.set(failure.selectorStrategy, count + 1);
      }
    });

    // Calculate success rates (executions - failures)
    const totalExecutions = executions.length;
    const strategyScores = new Map<SelectorStrategy, number>();

    // Default strategies in priority order
    const allStrategies: SelectorStrategy[] = [
      'data-testid',
      'id',
      'aria-label',
      'name',
      'class',
      'xpath',
      'text-content',
    ];

    allStrategies.forEach(strategy => {
      const failures = failuresByStrategy.get(strategy) || 0;
      const successRate = totalExecutions > 0 ? (totalExecutions - failures) / totalExecutions : 1;
      strategyScores.set(strategy, successRate);
    });

    // Sort strategies by success rate (descending)
    return allStrategies.sort((a, b) => {
      const scoreA = strategyScores.get(a) || 0;
      const scoreB = strategyScores.get(b) || 0;
      return scoreB - scoreA;
    });
  }

  /**
   * Identify failing patterns from execution history
   */
  private identifyFailingPatterns(executions: AILearningRecord[]): string[] {
    const patternFailures = new Map<string, number>();
    const patternTotals = new Map<string, number>();

    executions.forEach(exec => {
      const pattern = exec.metadata?.scenario || 'unknown';
      const total = patternTotals.get(pattern) || 0;
      patternTotals.set(pattern, total + 1);

      if (!exec.success) {
        const failures = patternFailures.get(pattern) || 0;
        patternFailures.set(pattern, failures + 1);
      }
    });

    // Identify patterns with >50% failure rate
    const failingPatterns: string[] = [];
    patternTotals.forEach((total, pattern) => {
      const failures = patternFailures.get(pattern) || 0;
      const failureRate = failures / total;
      if (failureRate > 0.5 && total >= 3) { // At least 3 executions and >50% failure
        failingPatterns.push(pattern);
      }
    });

    return failingPatterns;
  }

  /**
   * Extract domain from URL
   */
  private extractDomain(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch (error) {
      console.warn(`[Learning Engine] Failed to extract domain from URL: ${url}`);
      return 'unknown';
    }
  }

  /**
   * Get selector failure statistics for a domain
   */
  async getSelectorFailureStats(domain: string, lookbackDays: number = 30): Promise<FailedSelector[]> {
    const startTimestamp = Date.now() - (lookbackDays * 24 * 60 * 60 * 1000);
    const failures = await this.querySelectorFailures(domain, startTimestamp);

    // Group by selector
    const selectorMap = new Map<string, { strategy: SelectorStrategy; count: number; lastFailure: number }>();

    failures.forEach(failure => {
      if (failure.selector && failure.selectorStrategy) {
        const existing = selectorMap.get(failure.selector);
        if (existing) {
          existing.count++;
          existing.lastFailure = Math.max(existing.lastFailure, failure.timestamp);
        } else {
          selectorMap.set(failure.selector, {
            strategy: failure.selectorStrategy,
            count: 1,
            lastFailure: failure.timestamp,
          });
        }
      }
    });

    // Convert to FailedSelector array
    const failedSelectors: FailedSelector[] = [];
    selectorMap.forEach((data, selector) => {
      failedSelectors.push({
        selector,
        strategy: data.strategy,
        failureCount: data.count,
        lastFailure: new Date(data.lastFailure).toISOString(),
      });
    });

    // Sort by failure count (descending)
    return failedSelectors.sort((a, b) => b.failureCount - a.failureCount);
  }
}

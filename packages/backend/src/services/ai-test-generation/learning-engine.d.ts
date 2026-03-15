/**
 * Learning Engine Service
 *
 * Tracks test execution results to improve future test generation.
 * Analyzes selector failures, success rates, and test patterns to provide
 * domain-specific learning context to the AI Engine.
 */
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { LearningContext, SelectorStrategy, FailedSelector } from '../../types/ai-test-generation';
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
export declare class LearningEngine {
    private docClient;
    private tableName;
    constructor(tableName?: string, docClient?: DynamoDBDocumentClient);
    /**
     * Record test execution result for learning
     *
     * @param result - Execution result with success/failure information
     */
    recordExecution(result: ExecutionResult): Promise<void>;
    /**
     * Record selector failure for learning
     *
     * @param domain - Application domain
     * @param selector - Failed selector
     * @param strategy - Selector strategy used
     * @param reason - Failure reason
     */
    private recordSelectorFailure;
    /**
     * Record successful test pattern for learning
     *
     * @param domain - Application domain
     * @param pattern - Successful test pattern description
     * @param testCaseId - Test case ID
     */
    recordSuccessfulPattern(domain: string, pattern: string, testCaseId: string): Promise<void>;
    /**
     * Get learning context for a specific domain
     *
     * @param domain - Application domain
     * @param lookbackDays - Number of days to look back for learning data (default: 30)
     * @returns Learning context with successful patterns, failing patterns, and selector preferences
     */
    getLearningContext(domain: string, lookbackDays?: number): Promise<LearningContext>;
    /**
     * Query execution records for a domain
     */
    private queryExecutions;
    /**
     * Query selector failures for a domain
     */
    private querySelectorFailures;
    /**
     * Query successful patterns for a domain
     */
    private querySuccessfulPatterns;
    /**
     * Analyze selector strategies to determine preferences
     */
    private analyzeSelectorStrategies;
    /**
     * Identify failing patterns from execution history
     */
    private identifyFailingPatterns;
    /**
     * Extract domain from URL
     */
    private extractDomain;
    /**
     * Get selector failure statistics for a domain
     */
    getSelectorFailureStats(domain: string, lookbackDays?: number): Promise<FailedSelector[]>;
}

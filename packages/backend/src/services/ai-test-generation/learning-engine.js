"use strict";
/**
 * Learning Engine Service
 *
 * Tracks test execution results to improve future test generation.
 * Analyzes selector failures, success rates, and test patterns to provide
 * domain-specific learning context to the AI Engine.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LearningEngine = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
/**
 * Learning Engine
 *
 * Learns from test execution results to improve future test generation.
 */
class LearningEngine {
    docClient;
    tableName;
    constructor(tableName = 'AILearning', docClient) {
        if (docClient) {
            this.docClient = docClient;
        }
        else {
            const client = new client_dynamodb_1.DynamoDBClient({});
            this.docClient = lib_dynamodb_1.DynamoDBDocumentClient.from(client);
        }
        this.tableName = tableName;
    }
    /**
     * Record test execution result for learning
     *
     * @param result - Execution result with success/failure information
     */
    async recordExecution(result) {
        const domain = this.extractDomain(result.url);
        const timestamp = Date.now();
        // Record overall execution result
        const executionRecord = {
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
            await this.docClient.send(new lib_dynamodb_1.PutCommand({
                TableName: this.tableName,
                Item: executionRecord,
            }));
            console.log(`[Learning Engine] Recorded execution: ${result.executionId}, success: ${result.success}`);
            // Record selector failures if any
            if (!result.success && result.failedSteps) {
                for (const failedStep of result.failedSteps) {
                    if (failedStep.selector && failedStep.selectorStrategy) {
                        await this.recordSelectorFailure(domain, failedStep.selector, failedStep.selectorStrategy, failedStep.error);
                    }
                }
            }
        }
        catch (error) {
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
    async recordSelectorFailure(domain, selector, strategy, reason) {
        const timestamp = Date.now();
        const failureRecord = {
            domain,
            timestamp,
            recordType: 'selector-failure',
            selector,
            selectorStrategy: strategy,
            failureReason: reason,
        };
        try {
            await this.docClient.send(new lib_dynamodb_1.PutCommand({
                TableName: this.tableName,
                Item: failureRecord,
            }));
            console.log(`[Learning Engine] Recorded selector failure: ${selector} (${strategy})`);
        }
        catch (error) {
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
    async recordSuccessfulPattern(domain, pattern, testCaseId) {
        const timestamp = Date.now();
        const patternRecord = {
            domain,
            timestamp,
            recordType: 'pattern-success',
            testPattern: pattern,
            testCaseId,
            success: true,
        };
        try {
            await this.docClient.send(new lib_dynamodb_1.PutCommand({
                TableName: this.tableName,
                Item: patternRecord,
            }));
            console.log(`[Learning Engine] Recorded successful pattern: ${pattern}`);
        }
        catch (error) {
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
    async getLearningContext(domain, lookbackDays = 30) {
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
        }
        catch (error) {
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
    async queryExecutions(domain, startTimestamp) {
        const result = await this.docClient.send(new lib_dynamodb_1.QueryCommand({
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
        }));
        return (result.Items || []);
    }
    /**
     * Query selector failures for a domain
     */
    async querySelectorFailures(domain, startTimestamp) {
        const result = await this.docClient.send(new lib_dynamodb_1.QueryCommand({
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
        }));
        return (result.Items || []);
    }
    /**
     * Query successful patterns for a domain
     */
    async querySuccessfulPatterns(domain, startTimestamp) {
        const result = await this.docClient.send(new lib_dynamodb_1.QueryCommand({
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
        }));
        return (result.Items || []);
    }
    /**
     * Analyze selector strategies to determine preferences
     */
    analyzeSelectorStrategies(executions, failures) {
        // Count failures by strategy
        const failuresByStrategy = new Map();
        failures.forEach(failure => {
            if (failure.selectorStrategy) {
                const count = failuresByStrategy.get(failure.selectorStrategy) || 0;
                failuresByStrategy.set(failure.selectorStrategy, count + 1);
            }
        });
        // Calculate success rates (executions - failures)
        const totalExecutions = executions.length;
        const strategyScores = new Map();
        // Default strategies in priority order
        const allStrategies = [
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
    identifyFailingPatterns(executions) {
        const patternFailures = new Map();
        const patternTotals = new Map();
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
        const failingPatterns = [];
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
    extractDomain(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname;
        }
        catch (error) {
            console.warn(`[Learning Engine] Failed to extract domain from URL: ${url}`);
            return 'unknown';
        }
    }
    /**
     * Get selector failure statistics for a domain
     */
    async getSelectorFailureStats(domain, lookbackDays = 30) {
        const startTimestamp = Date.now() - (lookbackDays * 24 * 60 * 60 * 1000);
        const failures = await this.querySelectorFailures(domain, startTimestamp);
        // Group by selector
        const selectorMap = new Map();
        failures.forEach(failure => {
            if (failure.selector && failure.selectorStrategy) {
                const existing = selectorMap.get(failure.selector);
                if (existing) {
                    existing.count++;
                    existing.lastFailure = Math.max(existing.lastFailure, failure.timestamp);
                }
                else {
                    selectorMap.set(failure.selector, {
                        strategy: failure.selectorStrategy,
                        count: 1,
                        lastFailure: failure.timestamp,
                    });
                }
            }
        });
        // Convert to FailedSelector array
        const failedSelectors = [];
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
exports.LearningEngine = LearningEngine;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGVhcm5pbmctZW5naW5lLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsibGVhcm5pbmctZW5naW5lLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7OztBQUVILDhEQUEwRDtBQUMxRCx3REFBeUY7QUEwQnpGOzs7O0dBSUc7QUFDSCxNQUFhLGNBQWM7SUFDakIsU0FBUyxDQUF5QjtJQUNsQyxTQUFTLENBQVM7SUFFMUIsWUFDRSxZQUFvQixZQUFZLEVBQ2hDLFNBQWtDO1FBRWxDLElBQUksU0FBUyxFQUFFLENBQUM7WUFDZCxJQUFJLENBQUMsU0FBUyxHQUFHLFNBQVMsQ0FBQztRQUM3QixDQUFDO2FBQU0sQ0FBQztZQUNOLE1BQU0sTUFBTSxHQUFHLElBQUksZ0NBQWMsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUN0QyxJQUFJLENBQUMsU0FBUyxHQUFHLHFDQUFzQixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUN2RCxDQUFDO1FBQ0QsSUFBSSxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUM7SUFDN0IsQ0FBQztJQUVEOzs7O09BSUc7SUFDSCxLQUFLLENBQUMsZUFBZSxDQUFDLE1BQXVCO1FBQzNDLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQzlDLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUU3QixrQ0FBa0M7UUFDbEMsTUFBTSxlQUFlLEdBQXFCO1lBQ3hDLE1BQU07WUFDTixTQUFTO1lBQ1QsVUFBVSxFQUFFLFdBQVc7WUFDdkIsVUFBVSxFQUFFLE1BQU0sQ0FBQyxVQUFVO1lBQzdCLFdBQVcsRUFBRSxNQUFNLENBQUMsV0FBVztZQUMvQixPQUFPLEVBQUUsTUFBTSxDQUFDLE9BQU87WUFDdkIsUUFBUSxFQUFFO2dCQUNSLEdBQUcsRUFBRSxNQUFNLENBQUMsR0FBRztnQkFDZixRQUFRLEVBQUUsTUFBTSxD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QUMsT0FBTyxDQUFDLFFBQVEsRUFBRTt3QkFDaEMsUUFBUSxFQUFFLE9BQU8sQ0FBQyxnQkFBZ0I7d0JBQ2xDLEtBQUssRUFBRSxDQUFDO3dCQUNSLFdBQVcsRUFBRSxPQUFPLENBQUMsU0FBUztxQkFDL0IsQ0FBQyxDQUFDO2dCQUNMLENBQUM7WUFDSCxDQUFDO1FBQ0gsQ0FBQyxDQUFDLENBQUM7UUFFSCxrQ0FBa0M7UUFDbEMsTUFBTSxlQUFlLEdBQXFCLEVBQUUsQ0FBQztRQUM3QyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxFQUFFLFFBQVEsRUFBRSxFQUFFO1lBQ3JDLGVBQWUsQ0FBQyxJQUFJLENBQUM7Z0JBQ25CLFFBQVE7Z0JBQ1IsUUFBUSxFQUFFLElBQUksQ0FBQyxRQUFRO2dCQUN2QixZQUFZLEVBQUUsSUFBSSxDQUFDLEtBQUs7Z0JBQ3hCLFdBQVcsRUFBRSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsV0FBVyxFQUFFO2FBQ3RELENBQUMsQ0FBQztRQUNMLENBQUMsQ0FBQyxDQUFDO1FBRUgscUNBQXFDO1FBQ3JDLE9BQU8sZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxZQUFZLEdBQUcsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDO0lBQ3pFLENBQUM7Q0FDRjtBQXBZRCx3Q0FvWUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogTGVhcm5pbmcgRW5naW5lIFNlcnZpY2VcclxuICogXHJcbiAqIFRyYWNrcyB0ZXN0IGV4ZWN1dGlvbiByZXN1bHRzIHRvIGltcHJvdmUgZnV0dXJlIHRlc3QgZ2VuZXJhdGlvbi5cclxuICogQW5hbHl6ZXMgc2VsZWN0b3IgZmFpbHVyZXMsIHN1Y2Nlc3MgcmF0ZXMsIGFuZCB0ZXN0IHBhdHRlcm5zIHRvIHByb3ZpZGVcclxuICogZG9tYWluLXNwZWNpZmljIGxlYXJuaW5nIGNvbnRleHQgdG8gdGhlIEFJIEVuZ2luZS5cclxuICovXHJcblxyXG5pbXBvcnQgeyBEeW5hbW9EQkNsaWVudCB9IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1keW5hbW9kYic7XHJcbmltcG9ydCB7IER5bmFtb0RCRG9jdW1lbnRDbGllbnQsIFB1dENvbW1hbmQsIFF1ZXJ5Q29tbWFuZCB9IGZyb20gJ0Bhd3Mtc2RrL2xpYi1keW5hbW9kYic7XHJcbmltcG9ydCB7XHJcbiAgQUlMZWFybmluZ1JlY29yZCxcclxuICBMZWFybmluZ0NvbnRleHQsXHJcbiAgU2VsZWN0b3JTdHJhdGVneSxcclxuICBUZXN0UGF0dGVybixcclxuICBGYWlsZWRTZWxlY3RvcixcclxufSBmcm9tICcuLi8uLi90eXBlcy9haS10ZXN0LWdlbmVyYXRpb24nO1xyXG5cclxuLyoqXHJcbiAqIEV4ZWN1dGlvbiByZXN1bHQgZm9yIGxlYXJuaW5nXHJcbiAqL1xyXG5leHBvcnQgaW50ZXJmYWNlIEV4ZWN1dGlvblJlc3VsdCB7XHJcbiAgdGVzdENhc2VJZDogc3RyaW5nO1xyXG4gIGV4ZWN1dGlvbklkOiBzdHJpbmc7XHJcbiAgc3VjY2VzczogYm9vbGVhbjtcclxuICB1cmw6IHN0cmluZztcclxuICBzY2VuYXJpbz86IHN0cmluZztcclxuICBmYWlsZWRTdGVwcz86IHtcclxuICAgIHN0ZXBOdW1iZXI6IG51bWJlcjtcclxuICAgIHNlbGVjdG9yPzogc3RyaW5nO1xyXG4gICAgc2VsZWN0b3JTdHJhdGVneT86IFNlbGVjdG9yU3RyYXRlZ3k7XHJcbiAgICBlcnJvcjogc3RyaW5nO1xyXG4gIH1bXTtcclxufVxyXG5cclxuLyoqXHJcbiAqIExlYXJuaW5nIEVuZ2luZVxyXG4gKiBcclxuICogTGVhcm5zIGZyb20gdGVzdCBleGVjdXRpb24gcmVzdWx0cyB0byBpbXByb3ZlIGZ1dHVyZSB0ZXN0IGdlbmVyYXRpb24uXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgTGVhcm5pbmdFbmdpbmUge1xyXG4gIHByaXZhdGUgZG9jQ2xpZW50OiBEeW5hbW9EQkRvY3VtZW50Q2xpZW50O1xyXG4gIHByaXZhdGUgdGFibGVOYW1lOiBzdHJpbmc7XHJcblxyXG4gIGNvbnN0cnVjdG9yKFxyXG4gICAgdGFibGVOYW1lOiBzdHJpbmcgPSAnQUlMZWFybmluZycsXHJcbiAgICBkb2NDbGllbnQ/OiBEeW5hbW9EQkRvY3VtZW50Q2xpZW50XHJcbiAgKSB7XHJcbiAgICBpZiAoZG9jQ2xpZW50KSB7XHJcbiAgICAgIHRoaXMuZG9jQ2xpZW50ID0gZG9jQ2xpZW50O1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgY29uc3QgY2xpZW50ID0gbmV3IER5bmFtb0RCQ2xpZW50KHt9KTtcclxuICAgICAgdGhpcy5kb2NDbGllbnQgPSBEeW5hbW9EQkRvY3VtZW50Q2xpZW50LmZyb20oY2xpZW50KTtcclxuICAgIH1cclxuICAgIHRoaXMudGFibGVOYW1lID0gdGFibGVOYW1lO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogUmVjb3JkIHRlc3QgZXhlY3V0aW9uIHJlc3VsdCBmb3IgbGVhcm5pbmdcclxuICAgKiBcclxuICAgKiBAcGFyYW0gcmVzdWx0IC0gRXhlY3V0aW9uIHJlc3VsdCB3aXRoIHN1Y2Nlc3MvZmFpbHVyZSBpbmZvcm1hdGlvblxyXG4gICAqL1xyXG4gIGFzeW5jIHJlY29yZEV4ZWN1dGlvbihyZXN1bHQ6IEV4ZWN1dGlvblJlc3VsdCk6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgY29uc3QgZG9tYWluID0gdGhpcy5leHRyYWN0RG9tYWluKHJlc3VsdC51cmwpO1xyXG4gICAgY29uc3QgdGltZXN0YW1wID0gRGF0ZS5ub3coKTtcclxuXHJcbiAgICAvLyBSZWNvcmQgb3ZlcmFsbCBleGVjdXRpb24gcmVzdWx0XHJcbiAgICBjb25zdCBleGVjdXRpb25SZWNvcmQ6IEFJTGVhcm5pbmdSZWNvcmQgPSB7XHJcbiAgICAgIGRvbWFpbixcclxuICAgICAgdGltZXN0YW1wLFxyXG4gICAgICByZWNvcmRUeXBlOiAnZXhlY3V0aW9uJyxcclxuICAgICAgdGVzdENhc2VJZDogcmVzdWx0LnRlc3RDYXNlSWQsXHJcbiAgICAgIGV4ZWN1dGlvbklkOiByZXN1bHQuZXhlY3V0aW9uSWQsXHJcbiAgICAgIHN1Y2Nlc3M6IHJlc3VsdC5zdWNjZXNzLFxyXG4gICAgICBtZXRhZGF0YToge1xyXG4gICAgICAgIHVybDogcmVzdWx0LnVybCxcclxuICAgICAgICBzY2VuYXJpbzogcmVzdWx0LnNjZW5hcmlvLFxyXG4gICAgICB9LFxyXG4gICAgfTtcclxuXHJcbiAgICB0cnkge1xyXG4gICAgICBhd2FpdCB0aGlzLmRvY0NsaWVudC5zZW5kKFxyXG4gICAgICAgIG5ldyBQdXRDb21tYW5kKHtcclxuICAgICAgICAgIFRhYmxlTmFtZTogdGhpcy50YWJsZU5hbWUsXHJcbiAgICAgICAgICBJdGVtOiBleGVjdXRpb25SZWNvcmQsXHJcbiAgICAgICAgfSlcclxuICAgICAgKTtcclxuXHJcbiAgICAgIGNvbnNvbGUubG9nKGBbTGVhcm5pbmcgRW5naW5lXSBSZWNvcmRlZCBleGVjdXRpb246ICR7cmVzdWx0LmV4ZWN1dGlvbklkfSwgc3VjY2VzczogJHtyZXN1bHQuc3VjY2Vzc31gKTtcclxuXHJcbiAgICAgIC8vIFJlY29yZCBzZWxlY3RvciBmYWlsdXJlcyBpZiBhbnlcclxuICAgICAgaWYgKCFyZXN1bHQuc3VjY2VzcyAmJiByZXN1bHQuZmFpbGVkU3RlcHMpIHtcclxuICAgICAgICBmb3IgKGNvbnN0IGZhaWxlZFN0ZXAgb2YgcmVzdWx0LmZhaWxlZFN0ZXBzKSB7XHJcbiAgICAgICAgICBpZiAoZmFpbGVkU3RlcC5zZWxlY3RvciAmJiBmYWlsZWRTdGVwLnNlbGVjdG9yU3RyYXRlZ3kpIHtcclxuICAgICAgICAgICAgYXdhaXQgdGhpcy5yZWNvcmRTZWxlY3RvckZhaWx1cmUoXHJcbiAgICAgICAgICAgICAgZG9tYWluLFxyXG4gICAgICAgICAgICAgIGZhaWxlZFN0ZXAuc2VsZWN0b3IsXHJcbiAgICAgICAgICAgICAgZmFpbGVkU3RlcC5zZWxlY3RvclN0cmF0ZWd5LFxyXG4gICAgICAgICAgICAgIGZhaWxlZFN0ZXAuZXJyb3JcclxuICAgICAgICAgICAgKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1tMZWFybmluZyBFbmdpbmVdIEZhaWxlZCB0byByZWNvcmQgZXhlY3V0aW9uOicsIGVycm9yKTtcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKGBGYWlsZWQgdG8gcmVjb3JkIGV4ZWN1dGlvbjogJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6ICdVbmtub3duIGVycm9yJ31gKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFJlY29yZCBzZWxlY3RvciBmYWlsdXJlIGZvciBsZWFybmluZ1xyXG4gICAqIFxyXG4gICAqIEBwYXJhbSBkb21haW4gLSBBcHBsaWNhdGlvbiBkb21haW5cclxuICAgKiBAcGFyYW0gc2VsZWN0b3IgLSBGYWlsZWQgc2VsZWN0b3JcclxuICAgKiBAcGFyYW0gc3RyYXRlZ3kgLSBTZWxlY3RvciBzdHJhdGVneSB1c2VkXHJcbiAgICogQHBhcmFtIHJlYXNvbiAtIEZhaWx1cmUgcmVhc29uXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBhc3luYyByZWNvcmRTZWxlY3RvckZhaWx1cmUoXHJcbiAgICBkb21haW46IHN0cmluZyxcclxuICAgIHNlbGVjdG9yOiBzdHJpbmcsXHJcbiAgICBzdHJhdGVneTogU2VsZWN0b3JTdHJhdGVneSxcclxuICAgIHJlYXNvbjogc3RyaW5nXHJcbiAgKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICBjb25zdCB0aW1lc3RhbXAgPSBEYXRlLm5vdygpO1xyXG5cclxuICAgIGNvbnN0IGZhaWx1cmVSZWNvcmQ6IEFJTGVhcm5pbmdSZWNvcmQgPSB7XHJcbiAgICAgIGRvbWFpbixcclxuICAgICAgdGltZXN0YW1wLFxyXG4gICAgICByZWNvcmRUeXBlOiAnc2VsZWN0b3ItZmFpbHVyZScsXHJcbiAgICAgIHNlbGVjdG9yLFxyXG4gICAgICBzZWxlY3RvclN0cmF0ZWd5OiBzdHJhdGVneSxcclxuICAgICAgZmFpbHVyZVJlYXNvbjogcmVhc29uLFxyXG4gICAgfTtcclxuXHJcbiAgICB0cnkge1xyXG4gICAgICBhd2FpdCB0aGlzLmRvY0NsaWVudC5zZW5kKFxyXG4gICAgICAgIG5ldyBQdXRDb21tYW5kKHtcclxuICAgICAgICAgIFRhYmxlTmFtZTogdGhpcy50YWJsZU5hbWUsXHJcbiAgICAgICAgICBJdGVtOiBmYWlsdXJlUmVjb3JkLFxyXG4gICAgICAgIH0pXHJcbiAgICAgICk7XHJcblxyXG4gICAgICBjb25zb2xlLmxvZyhgW0xlYXJuaW5nIEVuZ2luZV0gUmVjb3JkZWQgc2VsZWN0b3IgZmFpbHVyZTogJHtzZWxlY3Rvcn0gKCR7c3RyYXRlZ3l9KWApO1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc29sZS5lcnJvcignW0xlYXJuaW5nIEVuZ2luZV0gRmFpbGVkIHRvIHJlY29yZCBzZWxlY3RvciBmYWlsdXJlOicsIGVycm9yKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFJlY29yZCBzdWNjZXNzZnVsIHRlc3QgcGF0dGVybiBmb3IgbGVhcm5pbmdcclxuICAgKiBcclxuICAgKiBAcGFyYW0gZG9tYWluIC0gQXBwbGljYXRpb24gZG9tYWluXHJcbiAgICogQHBhcmFtIHBhdHRlcm4gLSBTdWNjZXNzZnVsIHRlc3QgcGF0dGVybiBkZXNjcmlwdGlvblxyXG4gICAqIEBwYXJhbSB0ZXN0Q2FzZUlkIC0gVGVzdCBjYXNlIElEXHJcbiAgICovXHJcbiAgYXN5bmMgcmVjb3JkU3VjY2Vzc2Z1bFBhdHRlcm4oXHJcbiAgICBkb21haW46IHN0cmluZyxcclxuICAgIHBhdHRlcm46IHN0cmluZyxcclxuICAgIHRlc3RDYXNlSWQ6IHN0cmluZ1xyXG4gICk6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgY29uc3QgdGltZXN0YW1wID0gRGF0ZS5ub3coKTtcclxuXHJcbiAgICBjb25zdCBwYXR0ZXJuUmVjb3JkOiBBSUxlYXJuaW5nUmVjb3JkID0ge1xyXG4gICAgICBkb21haW4sXHJcbiAgICAgIHRpbWVzdGFtcCxcclxuICAgICAgcmVjb3JkVHlwZTogJ3BhdHRlcm4tc3VjY2VzcycsXHJcbiAgICAgIHRlc3RQYXR0ZXJuOiBwYXR0ZXJuLFxyXG4gICAgICB0ZXN0Q2FzZUlkLFxyXG4gICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgfTtcclxuXHJcbiAgICB0cnkge1xyXG4gICAgICBhd2FpdCB0aGlzLmRvY0NsaWVudC5zZW5kKFxyXG4gICAgICAgIG5ldyBQdXRDb21tYW5kKHtcclxuICAgICAgICAgIFRhYmxlTmFtZTogdGhpcy50YWJsZU5hbWUsXHJcbiAgICAgICAgICBJdGVtOiBwYXR0ZXJuUmVjb3JkLFxyXG4gICAgICAgIH0pXHJcbiAgICAgICk7XHJcblxyXG4gICAgICBjb25zb2xlLmxvZyhgW0xlYXJuaW5nIEVuZ2luZV0gUmVjb3JkZWQgc3VjY2Vzc2Z1bCBwYXR0ZXJuOiAke3BhdHRlcm59YCk7XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBjb25zb2xlLmVycm9yKCdbTGVhcm5pbmcgRW5naW5lXSBGYWlsZWQgdG8gcmVjb3JkIHN1Y2Nlc3NmdWwgcGF0dGVybjonLCBlcnJvcik7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBHZXQgbGVhcm5pbmcgY29udGV4dCBmb3IgYSBzcGVjaWZpYyBkb21haW5cclxuICAgKiBcclxuICAgKiBAcGFyYW0gZG9tYWluIC0gQXBwbGljYXRpb24gZG9tYWluXHJcbiAgICogQHBhcmFtIGxvb2tiYWNrRGF5cyAtIE51bWJlciBvZiBkYXlzIHRvIGxvb2sgYmFjayBmb3IgbGVhcm5pbmcgZGF0YSAoZGVmYXVsdDogMzApXHJcbiAgICogQHJldHVybnMgTGVhcm5pbmcgY29udGV4dCB3aXRoIHN1Y2Nlc3NmdWwgcGF0dGVybnMsIGZhaWxpbmcgcGF0dGVybnMsIGFuZCBzZWxlY3RvciBwcmVmZXJlbmNlc1xyXG4gICAqL1xyXG4gIGFzeW5jIGdldExlYXJuaW5nQ29udGV4dChkb21haW46IHN0cmluZywgbG9va2JhY2tEYXlzOiBudW1iZXIgPSAzMCk6IFByb21pc2U8TGVhcm5pbmdDb250ZXh0PiB7XHJcbiAgICBjb25zdCBzdGFydFRpbWVzdGFtcCA9IERhdGUubm93KCkgLSAobG9va2JhY2tEYXlzICogMjQgKiA2MCAqIDYwICogMTAwMCk7XHJcblxyXG4gICAgdHJ5IHtcclxuICAgICAgLy8gUXVlcnkgZXhlY3V0aW9uIHJlY29yZHMgZm9yIHRoaXMgZG9tYWluXHJcbiAgICAgIGNvbnN0IGV4ZWN1dGlvbnMgPSBhd2FpdCB0aGlzLnF1ZXJ5RXhlY3V0aW9ucyhkb21haW4sIHN0YXJ0VGltZXN0YW1wKTtcclxuXHJcbiAgICAgIC8vIFF1ZXJ5IHNlbGVjdG9yIGZhaWx1cmVzIGZvciB0aGlzIGRvbWFpblxyXG4gICAgICBjb25zdCBzZWxlY3RvckZhaWx1cmVzID0gYXdhaXQgdGhpcy5xdWVyeVNlbGVjdG9yRmFpbHVyZXMoZG9tYWluLCBzdGFydFRpbWVzdGFtcCk7XHJcblxyXG4gICAgICAvLyBRdWVyeSBzdWNjZXNzZnVsIHBhdHRlcm5zIGZvciB0aGlzIGRvbWFpblxyXG4gICAgICBjb25zdCBzdWNjZXNzZnVsUGF0dGVybnMgPSBhd2FpdCB0aGlzLnF1ZXJ5U3VjY2Vzc2Z1bFBhdHRlcm5zKGRvbWFpbiwgc3RhcnRUaW1lc3RhbXApO1xyXG5cclxuICAgICAgLy8gQW5hbHl6ZSBzZWxlY3RvciBzdHJhdGVneSBzdWNjZXNzIHJhdGVzXHJcbiAgICAgIGNvbnN0IHNlbGVjdG9yUHJlZmVyZW5jZXMgPSB0aGlzLmFuYWx5emVTZWxlY3RvclN0cmF0ZWdpZXMoZXhlY3V0aW9ucywgc2VsZWN0b3JGYWlsdXJlcyk7XHJcblxyXG4gICAgICAvLyBFeHRyYWN0IHN1Y2Nlc3NmdWwgcGF0dGVybiBkZXNjcmlwdGlvbnNcclxuICAgICAgY29uc3Qgc3VjY2Vzc2Z1bFBhdHRlcm5EZXNjcmlwdGlvbnMgPSBzdWNjZXNzZnVsUGF0dGVybnMubWFwKHAgPT4gcC50ZXN0UGF0dGVybiB8fCAndW5rbm93bicpO1xyXG5cclxuICAgICAgLy8gRXh0cmFjdCBmYWlsaW5nIHBhdHRlcm4gZGVzY3JpcHRpb25zIChwYXR0ZXJucyB3aXRoIGhpZ2ggZmFpbHVyZSByYXRlcylcclxuICAgICAgY29uc3QgZmFpbGluZ1BhdHRlcm5EZXNjcmlwdGlvbnMgPSB0aGlzLmlkZW50aWZ5RmFpbGluZ1BhdHRlcm5zKGV4ZWN1dGlvbnMpO1xyXG5cclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBzdWNjZXNzZnVsUGF0dGVybnM6IHN1Y2Nlc3NmdWxQYXR0ZXJuRGVzY3JpcHRpb25zLFxyXG4gICAgICAgIGZhaWxpbmdQYXR0ZXJuczogZmFpbGluZ1BhdHRlcm5EZXNjcmlwdGlvbnMsXHJcbiAgICAgICAgc2VsZWN0b3JQcmVmZXJlbmNlcyxcclxuICAgICAgfTtcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1tMZWFybmluZyBFbmdpbmVdIEZhaWxlZCB0byBnZXQgbGVhcm5pbmcgY29udGV4dDonLCBlcnJvcik7XHJcbiAgICAgIC8vIFJldHVybiBlbXB0eSBjb250ZXh0IG9uIGVycm9yXHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgc3VjY2Vzc2Z1bFBhdHRlcm5zOiBbXSxcclxuICAgICAgICBmYWlsaW5nUGF0dGVybnM6IFtdLFxyXG4gICAgICAgIHNlbGVjdG9yUHJlZmVyZW5jZXM6IFtdLFxyXG4gICAgICB9O1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogUXVlcnkgZXhlY3V0aW9uIHJlY29yZHMgZm9yIGEgZG9tYWluXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBhc3luYyBxdWVyeUV4ZWN1dGlvbnMoZG9tYWluOiBzdHJpbmcsIHN0YXJ0VGltZXN0YW1wOiBudW1iZXIpOiBQcm9taXNlPEFJTGVhcm5pbmdSZWNvcmRbXT4ge1xyXG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5kb2NDbGllbnQuc2VuZChcclxuICAgICAgbmV3IFF1ZXJ5Q29tbWFuZCh7XHJcbiAgICAgICAgVGFibGVOYW1lOiB0aGlzLnRhYmxlTmFtZSxcclxuICAgICAgICBLZXlDb25kaXRpb25FeHByZXNzaW9uOiAnZG9tYWluID0gOmRvbWFpbiBBTkQgI3RzID49IDpzdGFydFRpbWVzdGFtcCcsXHJcbiAgICAgICAgRmlsdGVyRXhwcmVzc2lvbjogJ3JlY29yZFR5cGUgPSA6cmVjb3JkVHlwZScsXHJcbiAgICAgICAgRXhwcmVzc2lvbkF0dHJpYnV0ZU5hbWVzOiB7XHJcbiAgICAgICAgICAnI3RzJzogJ3RpbWVzdGFtcCcsXHJcbiAgICAgICAgfSxcclxuICAgICAgICBFeHByZXNzaW9uQXR0cmlidXRlVmFsdWVzOiB7XHJcbiAgICAgICAgICAnOmRvbWFpbic6IGRvbWFpbixcclxuICAgICAgICAgICc6c3RhcnRUaW1lc3RhbXAnOiBzdGFydFRpbWVzdGFtcCxcclxuICAgICAgICAgICc6cmVjb3JkVHlwZSc6ICdleGVjdXRpb24nLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIH0pXHJcbiAgICApO1xyXG5cclxuICAgIHJldHVybiAocmVzdWx0Lkl0ZW1zIHx8IFtdKSBhcyBBSUxlYXJuaW5nUmVjb3JkW107XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBRdWVyeSBzZWxlY3RvciBmYWlsdXJlcyBmb3IgYSBkb21haW5cclxuICAgKi9cclxuICBwcml2YXRlIGFzeW5jIHF1ZXJ5U2VsZWN0b3JGYWlsdXJlcyhkb21haW46IHN0cmluZywgc3RhcnRUaW1lc3RhbXA6IG51bWJlcik6IFByb21pc2U8QUlMZWFybmluZ1JlY29yZFtdPiB7XHJcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLmRvY0NsaWVudC5zZW5kKFxyXG4gICAgICBuZXcgUXVlcnlDb21tYW5kKHtcclxuICAgICAgICBUYWJsZU5hbWU6IHRoaXMudGFibGVOYW1lLFxyXG4gICAgICAgIEtleUNvbmRpdGlvbkV4cHJlc3Npb246ICdkb21haW4gPSA6ZG9tYWluIEFORCAjdHMgPj0gOnN0YXJ0VGltZXN0YW1wJyxcclxuICAgICAgICBGaWx0ZXJFeHByZXNzaW9uOiAncmVjb3JkVHlwZSA9IDpyZWNvcmRUeXBlJyxcclxuICAgICAgICBFeHByZXNzaW9uQXR0cmlidXRlTmFtZXM6IHtcclxuICAgICAgICAgICcjdHMnOiAndGltZXN0YW1wJyxcclxuICAgICAgICB9LFxyXG4gICAgICAgIEV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXM6IHtcclxuICAgICAgICAgICc6ZG9tYWluJzogZG9tYWluLFxyXG4gICAgICAgICAgJzpzdGFydFRpbWVzdGFtcCc6IHN0YXJ0VGltZXN0YW1wLFxyXG4gICAgICAgICAgJzpyZWNvcmRUeXBlJzogJ3NlbGVjdG9yLWZhaWx1cmUnLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIH0pXHJcbiAgICApO1xyXG5cclxuICAgIHJldHVybiAocmVzdWx0Lkl0ZW1zIHx8IFtdKSBhcyBBSUxlYXJuaW5nUmVjb3JkW107XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBRdWVyeSBzdWNjZXNzZnVsIHBhdHRlcm5zIGZvciBhIGRvbWFpblxyXG4gICAqL1xyXG4gIHByaXZhdGUgYXN5bmMgcXVlcnlTdWNjZXNzZnVsUGF0dGVybnMoZG9tYWluOiBzdHJpbmcsIHN0YXJ0VGltZXN0YW1wOiBudW1iZXIpOiBQcm9taXNlPEFJTGVhcm5pbmdSZWNvcmRbXT4ge1xyXG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5kb2NDbGllbnQuc2VuZChcclxuICAgICAgbmV3IFF1ZXJ5Q29tbWFuZCh7XHJcbiAgICAgICAgVGFibGVOYW1lOiB0aGlzLnRhYmxlTmFtZSxcclxuICAgICAgICBLZXlDb25kaXRpb25FeHByZXNzaW9uOiAnZG9tYWluID0gOmRvbWFpbiBBTkQgI3RzID49IDpzdGFydFRpbWVzdGFtcCcsXHJcbiAgICAgICAgRmlsdGVyRXhwcmVzc2lvbjogJ3JlY29yZFR5cGUgPSA6cmVjb3JkVHlwZScsXHJcbiAgICAgICAgRXhwcmVzc2lvbkF0dHJpYnV0ZU5hbWVzOiB7XHJcbiAgICAgICAgICAnI3RzJzogJ3RpbWVzdGFtcCcsXHJcbiAgICAgICAgfSxcclxuICAgICAgICBFeHByZXNzaW9uQXR0cmlidXRlVmFsdWVzOiB7XHJcbiAgICAgICAgICAnOmRvbWFpbic6IGRvbWFpbixcclxuICAgICAgICAgICc6c3RhcnRUaW1lc3RhbXAnOiBzdGFydFRpbWVzdGFtcCxcclxuICAgICAgICAgICc6cmVjb3JkVHlwZSc6ICdwYXR0ZXJuLXN1Y2Nlc3MnLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIH0pXHJcbiAgICApO1xyXG5cclxuICAgIHJldHVybiAocmVzdWx0Lkl0ZW1zIHx8IFtdKSBhcyBBSUxlYXJuaW5nUmVjb3JkW107XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBBbmFseXplIHNlbGVjdG9yIHN0cmF0ZWdpZXMgdG8gZGV0ZXJtaW5lIHByZWZlcmVuY2VzXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBhbmFseXplU2VsZWN0b3JTdHJhdGVnaWVzKFxyXG4gICAgZXhlY3V0aW9uczogQUlMZWFybmluZ1JlY29yZFtdLFxyXG4gICAgZmFpbHVyZXM6IEFJTGVhcm5pbmdSZWNvcmRbXVxyXG4gICk6IFNlbGVjdG9yU3RyYXRlZ3lbXSB7XHJcbiAgICAvLyBDb3VudCBmYWlsdXJlcyBieSBzdHJhdGVneVxyXG4gICAgY29uc3QgZmFpbHVyZXNCeVN0cmF0ZWd5ID0gbmV3IE1hcDxTZWxlY3RvclN0cmF0ZWd5LCBudW1iZXI+KCk7XHJcbiAgICBmYWlsdXJlcy5mb3JFYWNoKGZhaWx1cmUgPT4ge1xyXG4gICAgICBpZiAoZmFpbHVyZS5zZWxlY3RvclN0cmF0ZWd5KSB7XHJcbiAgICAgICAgY29uc3QgY291bnQgPSBmYWlsdXJlc0J5U3RyYXRlZ3kuZ2V0KGZhaWx1cmUuc2VsZWN0b3JTdHJhdGVneSkgfHwgMDtcclxuICAgICAgICBmYWlsdXJlc0J5U3RyYXRlZ3kuc2V0KGZhaWx1cmUuc2VsZWN0b3JTdHJhdGVneSwgY291bnQgKyAxKTtcclxuICAgICAgfVxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQ2FsY3VsYXRlIHN1Y2Nlc3MgcmF0ZXMgKGV4ZWN1dGlvbnMgLSBmYWlsdXJlcylcclxuICAgIGNvbnN0IHRvdGFsRXhlY3V0aW9ucyA9IGV4ZWN1dGlvbnMubGVuZ3RoO1xyXG4gICAgY29uc3Qgc3RyYXRlZ3lTY29yZXMgPSBuZXcgTWFwPFNlbGVjdG9yU3RyYXRlZ3ksIG51bWJlcj4oKTtcclxuXHJcbiAgICAvLyBEZWZhdWx0IHN0cmF0ZWdpZXMgaW4gcHJpb3JpdHkgb3JkZXJcclxuICAgIGNvbnN0IGFsbFN0cmF0ZWdpZXM6IFNlbGVjdG9yU3RyYXRlZ3lbXSA9IFtcclxuICAgICAgJ2RhdGEtdGVzdGlkJyxcclxuICAgICAgJ2lkJyxcclxuICAgICAgJ2FyaWEtbGFiZWwnLFxyXG4gICAgICAnbmFtZScsXHJcbiAgICAgICdjbGFzcycsXHJcbiAgICAgICd4cGF0aCcsXHJcbiAgICAgICd0ZXh0LWNvbnRlbnQnLFxyXG4gICAgXTtcclxuXHJcbiAgICBhbGxTdHJhdGVnaWVzLmZvckVhY2goc3RyYXRlZ3kgPT4ge1xyXG4gICAgICBjb25zdCBmYWlsdXJlcyA9IGZhaWx1cmVzQnlTdHJhdGVneS5nZXQoc3RyYXRlZ3kpIHx8IDA7XHJcbiAgICAgIGNvbnN0IHN1Y2Nlc3NSYXRlID0gdG90YWxFeGVjdXRpb25zID4gMCA/ICh0b3RhbEV4ZWN1dGlvbnMgLSBmYWlsdXJlcykgLyB0b3RhbEV4ZWN1dGlvbnMgOiAxO1xyXG4gICAgICBzdHJhdGVneVNjb3Jlcy5zZXQoc3RyYXRlZ3ksIHN1Y2Nlc3NSYXRlKTtcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFNvcnQgc3RyYXRlZ2llcyBieSBzdWNjZXNzIHJhdGUgKGRlc2NlbmRpbmcpXHJcbiAgICByZXR1cm4gYWxsU3RyYXRlZ2llcy5zb3J0KChhLCBiKSA9PiB7XHJcbiAgICAgIGNvbnN0IHNjb3JlQSA9IHN0cmF0ZWd5U2NvcmVzLmdldChhKSB8fCAwO1xyXG4gICAgICBjb25zdCBzY29yZUIgPSBzdHJhdGVneVNjb3Jlcy5nZXQoYikgfHwgMDtcclxuICAgICAgcmV0dXJuIHNjb3JlQiAtIHNjb3JlQTtcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogSWRlbnRpZnkgZmFpbGluZyBwYXR0ZXJucyBmcm9tIGV4ZWN1dGlvbiBoaXN0b3J5XHJcbiAgICovXHJcbiAgcHJpdmF0ZSBpZGVudGlmeUZhaWxpbmdQYXR0ZXJucyhleGVjdXRpb25zOiBBSUxlYXJuaW5nUmVjb3JkW10pOiBzdHJpbmdbXSB7XHJcbiAgICBjb25zdCBwYXR0ZXJuRmFpbHVyZXMgPSBuZXcgTWFwPHN0cmluZywgbnVtYmVyPigpO1xyXG4gICAgY29uc3QgcGF0dGVyblRvdGFscyA9IG5ldyBNYXA8c3RyaW5nLCBudW1iZXI+KCk7XHJcblxyXG4gICAgZXhlY3V0aW9ucy5mb3JFYWNoKGV4ZWMgPT4ge1xyXG4gICAgICBjb25zdCBwYXR0ZXJuID0gZXhlYy5tZXRhZGF0YT8uc2NlbmFyaW8gfHwgJ3Vua25vd24nO1xyXG4gICAgICBjb25zdCB0b3RhbCA9IHBhdHRlcm5Ub3RhbHMuZ2V0KHBhdHRlcm4pIHx8IDA7XHJcbiAgICAgIHBhdHRlcm5Ub3RhbHMuc2V0KHBhdHRlcm4sIHRvdGFsICsgMSk7XHJcblxyXG4gICAgICBpZiAoIWV4ZWMuc3VjY2Vzcykge1xyXG4gICAgICAgIGNvbnN0IGZhaWx1cmVzID0gcGF0dGVybkZhaWx1cmVzLmdldChwYXR0ZXJuKSB8fCAwO1xyXG4gICAgICAgIHBhdHRlcm5GYWlsdXJlcy5zZXQocGF0dGVybiwgZmFpbHVyZXMgKyAxKTtcclxuICAgICAgfVxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gSWRlbnRpZnkgcGF0dGVybnMgd2l0aCA+NTAlIGZhaWx1cmUgcmF0ZVxyXG4gICAgY29uc3QgZmFpbGluZ1BhdHRlcm5zOiBzdHJpbmdbXSA9IFtdO1xyXG4gICAgcGF0dGVyblRvdGFscy5mb3JFYWNoKCh0b3RhbCwgcGF0dGVybikgPT4ge1xyXG4gICAgICBjb25zdCBmYWlsdXJlcyA9IHBhdHRlcm5GYWlsdXJlcy5nZXQocGF0dGVybikgfHwgMDtcclxuICAgICAgY29uc3QgZmFpbHVyZVJhdGUgPSBmYWlsdXJlcyAvIHRvdGFsO1xyXG4gICAgICBpZiAoZmFpbHVyZVJhdGUgPiAwLjUgJiYgdG90YWwgPj0gMykgeyAvLyBBdCBsZWFzdCAzIGV4ZWN1dGlvbnMgYW5kID41MCUgZmFpbHVyZVxyXG4gICAgICAgIGZhaWxpbmdQYXR0ZXJucy5wdXNoKHBhdHRlcm4pO1xyXG4gICAgICB9XHJcbiAgICB9KTtcclxuXHJcbiAgICByZXR1cm4gZmFpbGluZ1BhdHRlcm5zO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogRXh0cmFjdCBkb21haW4gZnJvbSBVUkxcclxuICAgKi9cclxuICBwcml2YXRlIGV4dHJhY3REb21haW4odXJsOiBzdHJpbmcpOiBzdHJpbmcge1xyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3QgdXJsT2JqID0gbmV3IFVSTCh1cmwpO1xyXG4gICAgICByZXR1cm4gdXJsT2JqLmhvc3RuYW1lO1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc29sZS53YXJuKGBbTGVhcm5pbmcgRW5naW5lXSBGYWlsZWQgdG8gZXh0cmFjdCBkb21haW4gZnJvbSBVUkw6ICR7dXJsfWApO1xyXG4gICAgICByZXR1cm4gJ3Vua25vd24nO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR2V0IHNlbGVjdG9yIGZhaWx1cmUgc3RhdGlzdGljcyBmb3IgYSBkb21haW5cclxuICAgKi9cclxuICBhc3luYyBnZXRTZWxlY3RvckZhaWx1cmVTdGF0cyhkb21haW46IHN0cmluZywgbG9va2JhY2tEYXlzOiBudW1iZXIgPSAzMCk6IFByb21pc2U8RmFpbGVkU2VsZWN0b3JbXT4ge1xyXG4gICAgY29uc3Qgc3RhcnRUaW1lc3RhbXAgPSBEYXRlLm5vdygpIC0gKGxvb2tiYWNrRGF5cyAqIDI0ICogNjAgKiA2MCAqIDEwMDApO1xyXG4gICAgY29uc3QgZmFpbHVyZXMgPSBhd2FpdCB0aGlzLnF1ZXJ5U2VsZWN0b3JGYWlsdXJlcyhkb21haW4sIHN0YXJ0VGltZXN0YW1wKTtcclxuXHJcbiAgICAvLyBHcm91cCBieSBzZWxlY3RvclxyXG4gICAgY29uc3Qgc2VsZWN0b3JNYXAgPSBuZXcgTWFwPHN0cmluZywgeyBzdHJhdGVneTogU2VsZWN0b3JTdHJhdGVneTsgY291bnQ6IG51bWJlcjsgbGFzdEZhaWx1cmU6IG51bWJlciB9PigpO1xyXG5cclxuICAgIGZhaWx1cmVzLmZvckVhY2goZmFpbHVyZSA9PiB7XHJcbiAgICAgIGlmIChmYWlsdXJlLnNlbGVjdG9yICYmIGZhaWx1cmUuc2VsZWN0b3JTdHJhdGVneSkge1xyXG4gICAgICAgIGNvbnN0IGV4aXN0aW5nID0gc2VsZWN0b3JNYXAuZ2V0KGZhaWx1cmUuc2VsZWN0b3IpO1xyXG4gICAgICAgIGlmIChleGlzdGluZykge1xyXG4gICAgICAgICAgZXhpc3RpbmcuY291bnQrKztcclxuICAgICAgICAgIGV4aXN0aW5nLmxhc3RGYWlsdXJlID0gTWF0aC5tYXgoZXhpc3RpbmcubGFzdEZhaWx1cmUsIGZhaWx1cmUudGltZXN0YW1wKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgc2VsZWN0b3JNYXAuc2V0KGZhaWx1cmUuc2VsZWN0b3IsIHtcclxuICAgICAgICAgICAgc3RyYXRlZ3k6IGZhaWx1cmUuc2VsZWN0b3JTdHJhdGVneSxcclxuICAgICAgICAgICAgY291bnQ6IDEsXHJcbiAgICAgICAgICAgIGxhc3RGYWlsdXJlOiBmYWlsdXJlLnRpbWVzdGFtcCxcclxuICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQ29udmVydCB0byBGYWlsZWRTZWxlY3RvciBhcnJheVxyXG4gICAgY29uc3QgZmFpbGVkU2VsZWN0b3JzOiBGYWlsZWRTZWxlY3RvcltdID0gW107XHJcbiAgICBzZWxlY3Rvck1hcC5mb3JFYWNoKChkYXRhLCBzZWxlY3RvcikgPT4ge1xyXG4gICAgICBmYWlsZWRTZWxlY3RvcnMucHVzaCh7XHJcbiAgICAgICAgc2VsZWN0b3IsXHJcbiAgICAgICAgc3RyYXRlZ3k6IGRhdGEuc3RyYXRlZ3ksXHJcbiAgICAgICAgZmFpbHVyZUNvdW50OiBkYXRhLmNvdW50LFxyXG4gICAgICAgIGxhc3RGYWlsdXJlOiBuZXcgRGF0ZShkYXRhLmxhc3RGYWlsdXJlKS50b0lTT1N0cmluZygpLFxyXG4gICAgICB9KTtcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFNvcnQgYnkgZmFpbHVyZSBjb3VudCAoZGVzY2VuZGluZylcclxuICAgIHJldHVybiBmYWlsZWRTZWxlY3RvcnMuc29ydCgoYSwgYikgPT4gYi5mYWlsdXJlQ291bnQgLSBhLmZhaWx1cmVDb3VudCk7XHJcbiAgfVxyXG59XHJcbiJdfQ==
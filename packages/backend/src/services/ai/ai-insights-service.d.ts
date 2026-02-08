/**
 * AI Insights Service
 * Generates intelligent recommendations and trend analysis from MISRA analysis data
 */
import { InsightGenerationRequest, InsightGenerationResponse, UserFeedback } from '../../types/ai-insights';
import { DynamoDBClientWrapper } from '../../database/dynamodb-client';
export declare class AIInsightsService {
    private analysisService;
    private readonly MIN_DATA_POINTS;
    private readonly BASELINE_CONFIDENCE;
    private readonly HIGH_CONFIDENCE_THRESHOLD;
    constructor(dbClient: DynamoDBClientWrapper);
    /**
     * Generate insights from analysis data
     */
    generateInsights(request: InsightGenerationRequest): Promise<InsightGenerationResponse>;
    /**
     * Generate quality insights from analysis results
     */
    private generateQualityInsights;
    /**
     * Detect patterns across multiple analyses
     */
    private detectPatterns;
    /**
     * Analyze trends over time
     */
    private analyzeTrends;
    /**
     * Generate actionable recommendations
     */
    private generateRecommendations;
    /**
     * Generate optimization suggestions based on analysis patterns
     */
    private generateOptimizationSuggestions;
    /**
     * Store user feedback for learning
     */
    storeFeedback(feedback: UserFeedback): Promise<void>;
    /**
     * Apply user feedback to improve recommendations
     */
    private applyUserFeedback;
    /**
     * Generate baseline insights when insufficient data is available
     */
    private generateBaselineInsights;
    /**
     * Get baseline recommendations
     */
    private getBaselineRecommendations;
    /**
     * Calculate confidence level based on data availability
     */
    private calculateConfidenceLevel;
    /**
     * Calculate confidence score
     */
    private calculateConfidence;
    /**
     * Calculate severity trend for a specific rule
     */
    private calculateSeverityTrend;
}

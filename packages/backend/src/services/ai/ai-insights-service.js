"use strict";
/**
 * AI Insights Service
 * Generates intelligent recommendations and trend analysis from MISRA analysis data
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIInsightsService = void 0;
const uuid_1 = require("uuid");
const ai_insights_1 = require("../../types/ai-insights");
const analysis_results_service_1 = require("../analysis-results-service");
class AIInsightsService {
    analysisService;
    MIN_DATA_POINTS = 3;
    BASELINE_CONFIDENCE = 50;
    HIGH_CONFIDENCE_THRESHOLD = 80;
    constructor(dbClient) {
        this.analysisService = new analysis_results_service_1.AnalysisResultsService(dbClient);
    }
    /**
     * Generate insights from analysis data
     */
    async generateInsights(request) {
        const timeRangeDays = request.time_range_days || 30;
        const startTime = Date.now() - (timeRangeDays * 24 * 60 * 60 * 1000);
        // Fetch analysis results for the user
        const analyses = await this.analysisService.getAnalysesByUserId(request.user_id, { limit: 100 });
        // Filter by time range
        const recentAnalyses = analyses.filter(a => a.timestamp >= startTime);
        const insights = [];
        const patterns = [];
        const trends = [];
        const recommendations = [];
        // Determine confidence level based on data availability
        const confidenceLevel = this.calculateConfidenceLevel(recentAnalyses.length);
        if (recentAnalyses.length >= this.MIN_DATA_POINTS) {
            // Generate data-driven insights
            insights.push(...this.generateQualityInsights(request.user_id, recentAnalyses));
            patterns.push(...this.detectPatterns(recentAnalyses));
            trends.push(...this.analyzeTrends(recentAnalyses, timeRangeDays));
            recommendations.push(...this.generateRecommendations(recentAnalyses, patterns, trends));
        }
        // Add baseline recommendations if requested or insufficient data
        if (request.include_baseline || recentAnalyses.length < this.MIN_DATA_POINTS) {
            insights.push(...this.generateBaselineInsights(request.user_id));
            recommendations.push(...this.getBaselineRecommendations());
        }
        return {
            insights,
            patterns,
            trends,
            recommendations,
            metadata: {
                total_analyses: recentAnalyses.length,
                time_range_days: timeRangeDays,
                confidence_level: confidenceLevel,
                generated_at: Date.now()
            }
        };
    }
    /**
     * Generate quality insights from analysis results
     */
    generateQualityInsights(userId, analyses) {
        const insights = [];
        // Calculate average violations
        const totalViolations = analyses.reduce((sum, a) => sum + (a.violations_count || 0), 0);
        const avgViolations = totalViolations / analyses.length;
        // High violation count insight
        if (avgViolations > 50) {
            insights.push({
                insight_id: (0, uuid_1.v4)(),
                user_id: userId,
                type: ai_insights_1.InsightType.QUALITY,
                severity: ai_insights_1.InsightSeverity.HIGH,
                category: ai_insights_1.InsightCategory.CODE_QUALITY,
                title: 'High Average Violation Count',
                description: `Your code has an average of ${avgViolations.toFixed(1)} MISRA violations per file. This is above the recommended threshold of 50 violations.`,
                recommendation: 'Focus on addressing the most critical violations first. Consider implementing automated code formatting and linting in your development workflow.',
                confidence_score: this.calculateConfidence(analyses.length),
                data_points: analyses.length,
                created_at: Date.now()
            });
        }
        else if (avgViolations < 10) {
            insights.push({
                insight_id: (0, uuid_1.v4)(),
                user_id: userId,
                type: ai_insights_1.InsightType.QUALITY,
                severity: ai_insights_1.InsightSeverity.INFO,
                category: ai_insights_1.InsightCategory.CODE_QUALITY,
                title: 'Excellent Code Quality',
                description: `Your code maintains an average of only ${avgViolations.toFixed(1)} MISRA violations per file. This is excellent!`,
                recommendation: 'Continue following your current coding practices. Consider documenting your coding standards for team reference.',
                confidence_score: this.calculateConfidence(analyses.length),
                data_points: analyses.length,
                created_at: Date.now()
            });
        }
        // Analyze violation severity distribution
        const criticalCount = analyses.filter(a => a.violations?.some((v) => v.severity === 'required')).length;
        if (criticalCount > analyses.length * 0.5) {
            insights.push({
                insight_id: (0, uuid_1.v4)(),
                user_id: userId,
                type: ai_insights_1.InsightType.QUALITY,
                severity: ai_insights_1.InsightSeverity.CRITICAL,
                category: ai_insights_1.InsightCategory.SECURITY,
                title: 'High Critical Violation Rate',
                description: `${((criticalCount / analyses.length) * 100).toFixed(1)}% of your files contain critical (required) MISRA violations.`,
                recommendation: 'Prioritize fixing required violations as they represent mandatory compliance rules. These violations may indicate potential safety or security issues.',
                confidence_score: this.calculateConfidence(analyses.length),
                data_points: analyses.length,
                created_at: Date.now()
            });
        }
        return insights;
    }
    /**
     * Detect patterns across multiple analyses
     */
    detectPatterns(analyses) {
        const patterns = [];
        const ruleFrequency = new Map();
        // Analyze violation patterns
        analyses.forEach(analysis => {
            const violations = analysis.violations || [];
            violations.forEach((violation) => {
                const ruleId = violation.rule_id;
                if (!ruleFrequency.has(ruleId)) {
                    ruleFrequency.set(ruleId, {
                        count: 0,
                        files: new Set(),
                        firstSeen: analysis.timestamp,
                        lastSeen: analysis.timestamp
                    });
                }
                const data = ruleFrequency.get(ruleId);
                data.count++;
                data.files.add(analysis.file_id);
                data.lastSeen = Math.max(data.lastSeen, analysis.timestamp);
            });
        });
        // Create pattern detections for frequently violated rules
        ruleFrequency.forEach((data, ruleId) => {
            if (data.count >= 3) { // Pattern threshold
                patterns.push({
                    pattern_id: (0, uuid_1.v4)(),
                    pattern_type: `frequent_violation_${ruleId}`,
                    frequency: data.count,
                    first_seen: data.firstSeen,
                    last_seen: data.lastSeen,
                    affected_files: Array.from(data.files),
                    severity_trend: this.calculateSeverityTrend(analyses, ruleId)
                });
            }
        });
        return patterns;
    }
    /**
     * Analyze trends over time
     */
    analyzeTrends(analyses, timeRangeDays) {
        const trends = [];
        // Sort analyses by timestamp
        const sortedAnalyses = [...analyses].sort((a, b) => a.timestamp - b.timestamp);
        // Violation count trend
        const violationDataPoints = sortedAnalyses.map(a => ({
            timestamp: a.timestamp,
            value: a.violations_count || 0
        }));
        if (violationDataPoints.length >= 2) {
            const firstValue = violationDataPoints[0].value;
            const lastValue = violationDataPoints[violationDataPoints.length - 1].value;
            const changePercentage = firstValue > 0
                ? ((lastValue - firstValue) / firstValue) * 100
                : 0;
            trends.push({
                trend_id: (0, uuid_1.v4)(),
                metric: 'violation_count',
                direction: changePercentage > 5 ? 'up' : changePercentage < -5 ? 'down' : 'stable',
                change_percentage: changePercentage,
                time_period_days: timeRangeDays,
                data_points: violationDataPoints
            });
        }
        // Critical violations trend
        const criticalDataPoints = sortedAnalyses.map(a => ({
            timestamp: a.timestamp,
            value: a.violations?.filter((v) => v.severity === 'required').length || 0
        }));
        if (criticalDataPoints.length >= 2) {
            const firstValue = criticalDataPoints[0].value;
            const lastValue = criticalDataPoints[criticalDataPoints.length - 1].value;
            const changePercentage = firstValue > 0
                ? ((lastValue - firstValue) / firstValue) * 100
                : 0;
            trends.push({
                trend_id: (0, uuid_1.v4)(),
                metric: 'critical_violations',
                direction: changePercentage > 5 ? 'up' : changePercentage < -5 ? 'down' : 'stable',
                change_percentage: changePercentage,
                time_period_days: timeRangeDays,
                data_points: criticalDataPoints
            });
        }
        // Code quality score trend (inverse of violations)
        const qualityDataPoints = sortedAnalyses.map(a => ({
            timestamp: a.timestamp,
            value: Math.max(0, 100 - (a.violations_count || 0))
        }));
        if (qualityDataPoints.length >= 2) {
            const firstValue = qualityDataPoints[0].value;
            const lastValue = qualityDataPoints[qualityDataPoints.length - 1].value;
            const changePercentage = firstValue > 0
                ? ((lastValue - firstValue) / firstValue) * 100
                : 0;
            trends.push({
                trend_id: (0, uuid_1.v4)(),
                metric: 'quality_score',
                direction: changePercentage > 5 ? 'up' : changePercentage < -5 ? 'down' : 'stable',
                change_percentage: changePercentage,
                time_period_days: timeRangeDays,
                data_points: qualityDataPoints
            });
        }
        return trends;
    }
    /**
     * Generate actionable recommendations
     */
    generateRecommendations(analyses, patterns, trends) {
        const recommendations = [];
        // Recommendations based on patterns
        patterns.forEach(pattern => {
            if (pattern.frequency >= 5) {
                recommendations.push({
                    action_id: (0, uuid_1.v4)(),
                    title: `Address Recurring ${pattern.pattern_type} Pattern`,
                    description: `This violation pattern has been detected ${pattern.frequency} times across ${pattern.affected_files.length} files.`,
                    priority: 2,
                    estimated_impact: 'high',
                    effort_level: 'medium',
                    resources: [
                        'https://misra.org.uk/misra-c/',
                        'https://www.perforce.com/resources/qac/misra-c-cpp'
                    ]
                });
            }
        });
        // Recommendations based on trends
        trends.forEach(trend => {
            if (trend.metric === 'violation_count' && trend.direction === 'up' && trend.change_percentage > 20) {
                recommendations.push({
                    action_id: (0, uuid_1.v4)(),
                    title: 'Violation Count Increasing',
                    description: `Your violation count has increased by ${trend.change_percentage.toFixed(1)}% over the past ${trend.time_period_days} days.`,
                    priority: 1,
                    estimated_impact: 'high',
                    effort_level: 'high',
                    resources: [
                        'https://www.misra.org.uk/Publications/tabid/57/Default.aspx'
                    ]
                });
            }
            else if (trend.metric === 'violation_count' && trend.direction === 'down' && trend.change_percentage < -20) {
                recommendations.push({
                    action_id: (0, uuid_1.v4)(),
                    title: 'Great Progress on Code Quality',
                    description: `Your violation count has decreased by ${Math.abs(trend.change_percentage).toFixed(1)}% over the past ${trend.time_period_days} days. Keep up the good work!`,
                    priority: 5,
                    estimated_impact: 'low',
                    effort_level: 'low',
                    resources: []
                });
            }
            // Critical violations trend
            if (trend.metric === 'critical_violations' && trend.direction === 'up') {
                recommendations.push({
                    action_id: (0, uuid_1.v4)(),
                    title: 'Critical Violations Increasing',
                    description: `Critical (required) violations have increased by ${Math.abs(trend.change_percentage).toFixed(1)}%. These represent mandatory compliance rules.`,
                    priority: 1,
                    estimated_impact: 'high',
                    effort_level: 'high',
                    resources: [
                        'https://misra.org.uk/misra-c/',
                        'https://www.perforce.com/resources/qac/misra-c-cpp'
                    ]
                });
            }
            // Quality score improvements
            if (trend.metric === 'quality_score' && trend.direction === 'up' && trend.change_percentage > 10) {
                recommendations.push({
                    action_id: (0, uuid_1.v4)(),
                    title: 'Code Quality Improving',
                    description: `Your code quality score has improved by ${trend.change_percentage.toFixed(1)}%. Continue your current practices.`,
                    priority: 4,
                    estimated_impact: 'medium',
                    effort_level: 'low',
                    resources: []
                });
            }
        });
        // Optimization suggestions based on analysis data
        recommendations.push(...this.generateOptimizationSuggestions(analyses, patterns, trends));
        return recommendations;
    }
    /**
     * Generate optimization suggestions based on analysis patterns
     */
    generateOptimizationSuggestions(analyses, patterns, trends) {
        const suggestions = [];
        // Suggest automated tooling if many violations
        const avgViolations = analyses.reduce((sum, a) => sum + (a.violations_count || 0), 0) / analyses.length;
        if (avgViolations > 30) {
            suggestions.push({
                action_id: (0, uuid_1.v4)(),
                title: 'Implement Automated Code Formatting',
                description: 'With an average of ' + avgViolations.toFixed(1) + ' violations per file, automated formatting tools can help reduce common issues.',
                priority: 2,
                estimated_impact: 'high',
                effort_level: 'low',
                resources: [
                    'https://clang.llvm.org/docs/ClangFormat.html',
                    'https://github.com/uncrustify/uncrustify'
                ]
            });
        }
        // Suggest code review process if degrading patterns
        const degradingPatterns = patterns.filter(p => p.severity_trend === 'degrading');
        if (degradingPatterns.length > 0) {
            suggestions.push({
                action_id: (0, uuid_1.v4)(),
                title: 'Strengthen Code Review Process',
                description: `${degradingPatterns.length} violation patterns are degrading. Enhanced code reviews can catch these issues earlier.`,
                priority: 2,
                estimated_impact: 'high',
                effort_level: 'medium',
                resources: [
                    'https://google.github.io/eng-practices/review/',
                    'https://www.perforce.com/blog/qac/9-best-practices-for-code-review'
                ]
            });
        }
        // Suggest training if consistent patterns
        const frequentPatterns = patterns.filter(p => p.frequency >= 10);
        if (frequentPatterns.length > 0) {
            suggestions.push({
                action_id: (0, uuid_1.v4)(),
                title: 'Team Training on Common Violations',
                description: `${frequentPatterns.length} violation patterns occur frequently. Team training can address these systematically.`,
                priority: 3,
                estimated_impact: 'medium',
                effort_level: 'medium',
                resources: [
                    'https://www.misra.org.uk/Training/tabid/171/Default.aspx'
                ]
            });
        }
        // Suggest refactoring if quality declining
        const qualityTrend = trends.find(t => t.metric === 'quality_score');
        if (qualityTrend && qualityTrend.direction === 'down' && qualityTrend.change_percentage < -15) {
            suggestions.push({
                action_id: (0, uuid_1.v4)(),
                title: 'Consider Code Refactoring',
                description: 'Code quality has declined significantly. Refactoring problematic areas can improve maintainability.',
                priority: 2,
                estimated_impact: 'high',
                effort_level: 'high',
                resources: [
                    'https://refactoring.guru/',
                    'https://www.amazon.com/Refactoring-Improving-Design-Existing-Code/dp/0201485672'
                ]
            });
        }
        return suggestions;
    }
    /**
     * Store user feedback for learning
     */
    async storeFeedback(feedback) {
        // Store feedback in DynamoDB for future learning
        // This would be implemented with a feedback table
        console.log('Storing user feedback:', feedback);
        // TODO: Implement feedback storage when feedback table is created
    }
    /**
     * Apply user feedback to improve recommendations
     */
    applyUserFeedback(recommendations, userId) {
        // In a full implementation, this would:
        // 1. Fetch historical feedback for this user
        // 2. Adjust recommendation priorities based on what was helpful
        // 3. Filter out recommendation types that were consistently unhelpful
        // 4. Personalize recommendations based on user preferences
        // For now, return recommendations as-is
        // TODO: Implement feedback-based learning when feedback data is available
        return recommendations;
    }
    /**
     * Generate baseline insights when insufficient data is available
     */
    generateBaselineInsights(userId) {
        return [
            {
                insight_id: (0, uuid_1.v4)(),
                user_id: userId,
                type: ai_insights_1.InsightType.BASELINE,
                severity: ai_insights_1.InsightSeverity.INFO,
                category: ai_insights_1.InsightCategory.BEST_PRACTICES,
                title: 'Getting Started with MISRA Compliance',
                description: 'MISRA C/C++ standards help ensure code safety, security, and reliability. Start by addressing required violations first.',
                recommendation: 'Upload more code files to receive personalized insights based on your coding patterns.',
                confidence_score: this.BASELINE_CONFIDENCE,
                data_points: 0,
                created_at: Date.now()
            },
            {
                insight_id: (0, uuid_1.v4)(),
                user_id: userId,
                type: ai_insights_1.InsightType.BASELINE,
                severity: ai_insights_1.InsightSeverity.INFO,
                category: ai_insights_1.InsightCategory.CODE_QUALITY,
                title: 'Industry Best Practices',
                description: 'Industry standards recommend maintaining fewer than 50 MISRA violations per 1000 lines of code.',
                recommendation: 'Focus on consistent code reviews and automated static analysis integration in your CI/CD pipeline.',
                confidence_score: this.BASELINE_CONFIDENCE,
                data_points: 0,
                created_at: Date.now()
            }
        ];
    }
    /**
     * Get baseline recommendations
     */
    getBaselineRecommendations() {
        return [
            {
                action_id: (0, uuid_1.v4)(),
                title: 'Integrate MISRA Analysis in CI/CD',
                description: 'Automate MISRA compliance checking in your continuous integration pipeline to catch violations early.',
                priority: 1,
                estimated_impact: 'high',
                effort_level: 'medium',
                resources: [
                    'https://misra.org.uk/',
                    'https://www.perforce.com/resources/qac/misra-c-cpp'
                ]
            },
            {
                action_id: (0, uuid_1.v4)(),
                title: 'Establish Coding Standards',
                description: 'Document and enforce team coding standards based on MISRA guidelines.',
                priority: 2,
                estimated_impact: 'high',
                effort_level: 'low',
                resources: [
                    'https://www.misra.org.uk/Publications/tabid/57/Default.aspx'
                ]
            },
            {
                action_id: (0, uuid_1.v4)(),
                title: 'Regular Code Reviews',
                description: 'Implement peer code reviews focusing on MISRA compliance and code quality.',
                priority: 3,
                estimated_impact: 'medium',
                effort_level: 'low',
                resources: []
            }
        ];
    }
    /**
     * Calculate confidence level based on data availability
     */
    calculateConfidenceLevel(dataPoints) {
        if (dataPoints < this.MIN_DATA_POINTS)
            return 'low';
        if (dataPoints < 10)
            return 'medium';
        return 'high';
    }
    /**
     * Calculate confidence score
     */
    calculateConfidence(dataPoints) {
        if (dataPoints < this.MIN_DATA_POINTS)
            return this.BASELINE_CONFIDENCE;
        if (dataPoints >= 20)
            return 95;
        if (dataPoints >= 10)
            return 85;
        return 70;
    }
    /**
     * Calculate severity trend for a specific rule
     */
    calculateSeverityTrend(analyses, ruleId) {
        const sortedAnalyses = [...analyses].sort((a, b) => a.timestamp - b.timestamp);
        const recentCount = sortedAnalyses.slice(-3).filter(a => a.violations?.some((v) => v.rule_id === ruleId)).length;
        const olderCount = sortedAnalyses.slice(0, 3).filter(a => a.violations?.some((v) => v.rule_id === ruleId)).length;
        if (recentCount < olderCount)
            return 'improving';
        if (recentCount > olderCount)
            return 'degrading';
        return 'stable';
    }
}
exports.AIInsightsService = AIInsightsService;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWktaW5zaWdodHMtc2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImFpLWluc2lnaHRzLXNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7R0FHRzs7O0FBRUgsK0JBQW1DO0FBQ25DLHlEQVlnQztBQUNoQywwRUFBb0U7QUFHcEUsTUFBYSxpQkFBaUI7SUFDcEIsZUFBZSxDQUF3QjtJQUM5QixlQUFlLEdBQUcsQ0FBQyxDQUFBO0lBQ25CLG1CQUFtQixHQUFHLEVBQUUsQ0FBQTtJQUN4Qix5QkFBeUIsR0FBRyxFQUFFLENBQUE7SUFFL0MsWUFBWSxRQUErQjtRQUN6QyxJQUFJLENBQUMsZUFBZSxHQUFHLElBQUksaURBQXNCLENBQUMsUUFBUSxDQUFDLENBQUE7SUFDN0QsQ0FBQztJQUVEOztPQUVHO0lBQ0gsS0FBSyxDQUFDLGdCQUFnQixDQUFDLE9BQWlDO1FBQ3RELE1BQU0sYUFBYSxHQUFHLE9BQU8sQ0FBQyxlQUFlLElBQUksRUFBRSxDQUFBO1FBQ25ELE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLGFBQWEsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUMsQ0FBQTtRQUVwRSxzQ0FBc0M7UUFDdEMsTUFBTSxRQUFRLEdBQUcsTUFBTSxJQUFJLENBQUMsZUFBZSxDQUFDLG1CQUFtQixDQUM3RCxPQUFPLENBQUMsT0FBTyxFQUNmLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRSxDQUNmLENBQUE7UUFFRCx1QkFBdUI7UUFDdkIsTUFBTSxjQUFjLEdBQUcsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxTQUFTLElBQUksU0FBUyxDQUFDLENBQUE7UUFFckUsTUFBTSxRQUFRLEdBQWMsRUFBRSxDQUFBO1FBQzlCLE1BQU0sUUFBUSxHQUF1QixFQUFFLENBQUE7UUFDdkMsTUFBTSxNQUFNLEdBQW9CLEVB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O0lBQ1gsQ0FBQztJQUVEOztPQUVHO0lBQ0ssc0JBQXNCLENBQUMsUUFBZSxFQUFFLE1BQWM7UUFDNUQsTUFBTSxjQUFjLEdBQUcsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxTQUFTLEdBQUcsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQzlFLE1BQU0sV0FBVyxHQUFHLGNBQWMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FDdEQsQ0FBQyxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFNLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLEtBQUssTUFBTSxDQUFDLENBQ3JELENBQUMsTUFBTSxDQUFBO1FBRVIsTUFBTSxVQUFVLEdBQUcsY0FBYyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQ3ZELENBQUMsQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBTSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxLQUFLLE1BQU0sQ0FBQyxDQUNyRCxDQUFDLE1BQU0sQ0FBQTtRQUVSLElBQUksV0FBVyxHQUFHLFVBQVU7WUFBRSxPQUFPLFdBQVcsQ0FBQTtRQUNoRCxJQUFJLFdBQVcsR0FBRyxVQUFVO1lBQUUsT0FBTyxXQUFXLENBQUE7UUFDaEQsT0FBTyxRQUFRLENBQUE7SUFDakIsQ0FBQztDQUNGO0FBbGpCRCw4Q0FrakJDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIEFJIEluc2lnaHRzIFNlcnZpY2VcclxuICogR2VuZXJhdGVzIGludGVsbGlnZW50IHJlY29tbWVuZGF0aW9ucyBhbmQgdHJlbmQgYW5hbHlzaXMgZnJvbSBNSVNSQSBhbmFseXNpcyBkYXRhXHJcbiAqL1xyXG5cclxuaW1wb3J0IHsgdjQgYXMgdXVpZHY0IH0gZnJvbSAndXVpZCdcclxuaW1wb3J0IHtcclxuICBJbnNpZ2h0LFxyXG4gIEluc2lnaHRUeXBlLFxyXG4gIEluc2lnaHRTZXZlcml0eSxcclxuICBJbnNpZ2h0Q2F0ZWdvcnksXHJcbiAgUGF0dGVybkRldGVjdGlvbixcclxuICBUcmVuZEFuYWx5c2lzLFxyXG4gIFJlY29tbWVuZGF0aW9uQWN0aW9uLFxyXG4gIEluc2lnaHRHZW5lcmF0aW9uUmVxdWVzdCxcclxuICBJbnNpZ2h0R2VuZXJhdGlvblJlc3BvbnNlLFxyXG4gIERhdGFQb2ludCxcclxuICBVc2VyRmVlZGJhY2tcclxufSBmcm9tICcuLi8uLi90eXBlcy9haS1pbnNpZ2h0cydcclxuaW1wb3J0IHsgQW5hbHlzaXNSZXN1bHRzU2VydmljZSB9IGZyb20gJy4uL2FuYWx5c2lzLXJlc3VsdHMtc2VydmljZSdcclxuaW1wb3J0IHsgRHluYW1vREJDbGllbnRXcmFwcGVyIH0gZnJvbSAnLi4vLi4vZGF0YWJhc2UvZHluYW1vZGItY2xpZW50J1xyXG5cclxuZXhwb3J0IGNsYXNzIEFJSW5zaWdodHNTZXJ2aWNlIHtcclxuICBwcml2YXRlIGFuYWx5c2lzU2VydmljZTogQW5hbHlzaXNSZXN1bHRzU2VydmljZVxyXG4gIHByaXZhdGUgcmVhZG9ubHkgTUlOX0RBVEFfUE9JTlRTID0gM1xyXG4gIHByaXZhdGUgcmVhZG9ubHkgQkFTRUxJTkVfQ09ORklERU5DRSA9IDUwXHJcbiAgcHJpdmF0ZSByZWFkb25seSBISUdIX0NPTkZJREVOQ0VfVEhSRVNIT0xEID0gODBcclxuXHJcbiAgY29uc3RydWN0b3IoZGJDbGllbnQ6IER5bmFtb0RCQ2xpZW50V3JhcHBlcikge1xyXG4gICAgdGhpcy5hbmFseXNpc1NlcnZpY2UgPSBuZXcgQW5hbHlzaXNSZXN1bHRzU2VydmljZShkYkNsaWVudClcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEdlbmVyYXRlIGluc2lnaHRzIGZyb20gYW5hbHlzaXMgZGF0YVxyXG4gICAqL1xyXG4gIGFzeW5jIGdlbmVyYXRlSW5zaWdodHMocmVxdWVzdDogSW5zaWdodEdlbmVyYXRpb25SZXF1ZXN0KTogUHJvbWlzZTxJbnNpZ2h0R2VuZXJhdGlvblJlc3BvbnNlPiB7XHJcbiAgICBjb25zdCB0aW1lUmFuZ2VEYXlzID0gcmVxdWVzdC50aW1lX3JhbmdlX2RheXMgfHwgMzBcclxuICAgIGNvbnN0IHN0YXJ0VGltZSA9IERhdGUubm93KCkgLSAodGltZVJhbmdlRGF5cyAqIDI0ICogNjAgKiA2MCAqIDEwMDApXHJcblxyXG4gICAgLy8gRmV0Y2ggYW5hbHlzaXMgcmVzdWx0cyBmb3IgdGhlIHVzZXJcclxuICAgIGNvbnN0IGFuYWx5c2VzID0gYXdhaXQgdGhpcy5hbmFseXNpc1NlcnZpY2UuZ2V0QW5hbHlzZXNCeVVzZXJJZChcclxuICAgICAgcmVxdWVzdC51c2VyX2lkLFxyXG4gICAgICB7IGxpbWl0OiAxMDAgfVxyXG4gICAgKVxyXG5cclxuICAgIC8vIEZpbHRlciBieSB0aW1lIHJhbmdlXHJcbiAgICBjb25zdCByZWNlbnRBbmFseXNlcyA9IGFuYWx5c2VzLmZpbHRlcihhID0+IGEudGltZXN0YW1wID49IHN0YXJ0VGltZSlcclxuXHJcbiAgICBjb25zdCBpbnNpZ2h0czogSW5zaWdodFtdID0gW11cclxuICAgIGNvbnN0IHBhdHRlcm5zOiBQYXR0ZXJuRGV0ZWN0aW9uW10gPSBbXVxyXG4gICAgY29uc3QgdHJlbmRzOiBUcmVuZEFuYWx5c2lzW10gPSBbXVxyXG4gICAgY29uc3QgcmVjb21tZW5kYXRpb25zOiBSZWNvbW1lbmRhdGlvbkFjdGlvbltdID0gW11cclxuXHJcbiAgICAvLyBEZXRlcm1pbmUgY29uZmlkZW5jZSBsZXZlbCBiYXNlZCBvbiBkYXRhIGF2YWlsYWJpbGl0eVxyXG4gICAgY29uc3QgY29uZmlkZW5jZUxldmVsID0gdGhpcy5jYWxjdWxhdGVDb25maWRlbmNlTGV2ZWwocmVjZW50QW5hbHlzZXMubGVuZ3RoKVxyXG5cclxuICAgIGlmIChyZWNlbnRBbmFseXNlcy5sZW5ndGggPj0gdGhpcy5NSU5fREFUQV9QT0lOVFMpIHtcclxuICAgICAgLy8gR2VuZXJhdGUgZGF0YS1kcml2ZW4gaW5zaWdodHNcclxuICAgICAgaW5zaWdodHMucHVzaCguLi50aGlzLmdlbmVyYXRlUXVhbGl0eUluc2lnaHRzKHJlcXVlc3QudXNlcl9pZCwgcmVjZW50QW5hbHlzZXMpKVxyXG4gICAgICBwYXR0ZXJucy5wdXNoKC4uLnRoaXMuZGV0ZWN0UGF0dGVybnMocmVjZW50QW5hbHlzZXMpKVxyXG4gICAgICB0cmVuZHMucHVzaCguLi50aGlzLmFuYWx5emVUcmVuZHMocmVjZW50QW5hbHlzZXMsIHRpbWVSYW5nZURheXMpKVxyXG4gICAgICByZWNvbW1lbmRhdGlvbnMucHVzaCguLi50aGlzLmdlbmVyYXRlUmVjb21tZW5kYXRpb25zKHJlY2VudEFuYWx5c2VzLCBwYXR0ZXJucywgdHJlbmRzKSlcclxuICAgIH1cclxuXHJcbiAgICAvLyBBZGQgYmFzZWxpbmUgcmVjb21tZW5kYXRpb25zIGlmIHJlcXVlc3RlZCBvciBpbnN1ZmZpY2llbnQgZGF0YVxyXG4gICAgaWYgKHJlcXVlc3QuaW5jbHVkZV9iYXNlbGluZSB8fCByZWNlbnRBbmFseXNlcy5sZW5ndGggPCB0aGlzLk1JTl9EQVRBX1BPSU5UUykge1xyXG4gICAgICBpbnNpZ2h0cy5wdXNoKC4uLnRoaXMuZ2VuZXJhdGVCYXNlbGluZUluc2lnaHRzKHJlcXVlc3QudXNlcl9pZCkpXHJcbiAgICAgIHJlY29tbWVuZGF0aW9ucy5wdXNoKC4uLnRoaXMuZ2V0QmFzZWxpbmVSZWNvbW1lbmRhdGlvbnMoKSlcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBpbnNpZ2h0cyxcclxuICAgICAgcGF0dGVybnMsXHJcbiAgICAgIHRyZW5kcyxcclxuICAgICAgcmVjb21tZW5kYXRpb25zLFxyXG4gICAgICBtZXRhZGF0YToge1xyXG4gICAgICAgIHRvdGFsX2FuYWx5c2VzOiByZWNlbnRBbmFseXNlcy5sZW5ndGgsXHJcbiAgICAgICAgdGltZV9yYW5nZV9kYXlzOiB0aW1lUmFuZ2VEYXlzLFxyXG4gICAgICAgIGNvbmZpZGVuY2VfbGV2ZWw6IGNvbmZpZGVuY2VMZXZlbCxcclxuICAgICAgICBnZW5lcmF0ZWRfYXQ6IERhdGUubm93KClcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR2VuZXJhdGUgcXVhbGl0eSBpbnNpZ2h0cyBmcm9tIGFuYWx5c2lzIHJlc3VsdHNcclxuICAgKi9cclxuICBwcml2YXRlIGdlbmVyYXRlUXVhbGl0eUluc2lnaHRzKHVzZXJJZDogc3RyaW5nLCBhbmFseXNlczogYW55W10pOiBJbnNpZ2h0W10ge1xyXG4gICAgY29uc3QgaW5zaWdodHM6IEluc2lnaHRbXSA9IFtdXHJcblxyXG4gICAgLy8gQ2FsY3VsYXRlIGF2ZXJhZ2UgdmlvbGF0aW9uc1xyXG4gICAgY29uc3QgdG90YWxWaW9sYXRpb25zID0gYW5hbHlzZXMucmVkdWNlKChzdW0sIGEpID0+IHN1bSArIChhLnZpb2xhdGlvbnNfY291bnQgfHwgMCksIDApXHJcbiAgICBjb25zdCBhdmdWaW9sYXRpb25zID0gdG90YWxWaW9sYXRpb25zIC8gYW5hbHlzZXMubGVuZ3RoXHJcblxyXG4gICAgLy8gSGlnaCB2aW9sYXRpb24gY291bnQgaW5zaWdodFxyXG4gICAgaWYgKGF2Z1Zpb2xhdGlvbnMgPiA1MCkge1xyXG4gICAgICBpbnNpZ2h0cy5wdXNoKHtcclxuICAgICAgICBpbnNpZ2h0X2lkOiB1dWlkdjQoKSxcclxuICAgICAgICB1c2VyX2lkOiB1c2VySWQsXHJcbiAgICAgICAgdHlwZTogSW5zaWdodFR5cGUuUVVBTElUWSxcclxuICAgICAgICBzZXZlcml0eTogSW5zaWdodFNldmVyaXR5LkhJR0gsXHJcbiAgICAgICAgY2F0ZWdvcnk6IEluc2lnaHRDYXRlZ29yeS5DT0RFX1FVQUxJVFksXHJcbiAgICAgICAgdGl0bGU6ICdIaWdoIEF2ZXJhZ2UgVmlvbGF0aW9uIENvdW50JyxcclxuICAgICAgICBkZXNjcmlwdGlvbjogYFlvdXIgY29kZSBoYXMgYW4gYXZlcmFnZSBvZiAke2F2Z1Zpb2xhdGlvbnMudG9GaXhlZCgxKX0gTUlTUkEgdmlvbGF0aW9ucyBwZXIgZmlsZS4gVGhpcyBpcyBhYm92ZSB0aGUgcmVjb21tZW5kZWQgdGhyZXNob2xkIG9mIDUwIHZpb2xhdGlvbnMuYCxcclxuICAgICAgICByZWNvbW1lbmRhdGlvbjogJ0ZvY3VzIG9uIGFkZHJlc3NpbmcgdGhlIG1vc3QgY3JpdGljYWwgdmlvbGF0aW9ucyBmaXJzdC4gQ29uc2lkZXIgaW1wbGVtZW50aW5nIGF1dG9tYXRlZCBjb2RlIGZvcm1hdHRpbmcgYW5kIGxpbnRpbmcgaW4geW91ciBkZXZlbG9wbWVudCB3b3JrZmxvdy4nLFxyXG4gICAgICAgIGNvbmZpZGVuY2Vfc2NvcmU6IHRoaXMuY2FsY3VsYXRlQ29uZmlkZW5jZShhbmFseXNlcy5sZW5ndGgpLFxyXG4gICAgICAgIGRhdGFfcG9pbnRzOiBhbmFseXNlcy5sZW5ndGgsXHJcbiAgICAgICAgY3JlYXRlZF9hdDogRGF0ZS5ub3coKVxyXG4gICAgICB9KVxyXG4gICAgfSBlbHNlIGlmIChhdmdWaW9sYXRpb25zIDwgMTApIHtcclxuICAgICAgaW5zaWdodHMucHVzaCh7XHJcbiAgICAgICAgaW5zaWdodF9pZDogdXVpZHY0KCksXHJcbiAgICAgICAgdXNlcl9pZDogdXNlcklkLFxyXG4gICAgICAgIHR5cGU6IEluc2lnaHRUeXBlLlFVQUxJVFksXHJcbiAgICAgICAgc2V2ZXJpdHk6IEluc2lnaHRTZXZlcml0eS5JTkZPLFxyXG4gICAgICAgIGNhdGVnb3J5OiBJbnNpZ2h0Q2F0ZWdvcnkuQ09ERV9RVUFMSVRZLFxyXG4gICAgICAgIHRpdGxlOiAnRXhjZWxsZW50IENvZGUgUXVhbGl0eScsXHJcbiAgICAgICAgZGVzY3JpcHRpb246IGBZb3VyIGNvZGUgbWFpbnRhaW5zIGFuIGF2ZXJhZ2Ugb2Ygb25seSAke2F2Z1Zpb2xhdGlvbnMudG9GaXhlZCgxKX0gTUlTUkEgdmlvbGF0aW9ucyBwZXIgZmlsZS4gVGhpcyBpcyBleGNlbGxlbnQhYCxcclxuICAgICAgICByZWNvbW1lbmRhdGlvbjogJ0NvbnRpbnVlIGZvbGxvd2luZyB5b3VyIGN1cnJlbnQgY29kaW5nIHByYWN0aWNlcy4gQ29uc2lkZXIgZG9jdW1lbnRpbmcgeW91ciBjb2Rpbmcgc3RhbmRhcmRzIGZvciB0ZWFtIHJlZmVyZW5jZS4nLFxyXG4gICAgICAgIGNvbmZpZGVuY2Vfc2NvcmU6IHRoaXMuY2FsY3VsYXRlQ29uZmlkZW5jZShhbmFseXNlcy5sZW5ndGgpLFxyXG4gICAgICAgIGRhdGFfcG9pbnRzOiBhbmFseXNlcy5sZW5ndGgsXHJcbiAgICAgICAgY3JlYXRlZF9hdDogRGF0ZS5ub3coKVxyXG4gICAgICB9KVxyXG4gICAgfVxyXG5cclxuICAgIC8vIEFuYWx5emUgdmlvbGF0aW9uIHNldmVyaXR5IGRpc3RyaWJ1dGlvblxyXG4gICAgY29uc3QgY3JpdGljYWxDb3VudCA9IGFuYWx5c2VzLmZpbHRlcihhID0+IFxyXG4gICAgICBhLnZpb2xhdGlvbnM/LnNvbWUoKHY6IGFueSkgPT4gdi5zZXZlcml0eSA9PT0gJ3JlcXVpcmVkJylcclxuICAgICkubGVuZ3RoXHJcblxyXG4gICAgaWYgKGNyaXRpY2FsQ291bnQgPiBhbmFseXNlcy5sZW5ndGggKiAwLjUpIHtcclxuICAgICAgaW5zaWdodHMucHVzaCh7XHJcbiAgICAgICAgaW5zaWdodF9pZDogdXVpZHY0KCksXHJcbiAgICAgICAgdXNlcl9pZDogdXNlcklkLFxyXG4gICAgICAgIHR5cGU6IEluc2lnaHRUeXBlLlFVQUxJVFksXHJcbiAgICAgICAgc2V2ZXJpdHk6IEluc2lnaHRTZXZlcml0eS5DUklUSUNBTCxcclxuICAgICAgICBjYXRlZ29yeTogSW5zaWdodENhdGVnb3J5LlNFQ1VSSVRZLFxyXG4gICAgICAgIHRpdGxlOiAnSGlnaCBDcml0aWNhbCBWaW9sYXRpb24gUmF0ZScsXHJcbiAgICAgICAgZGVzY3JpcHRpb246IGAkeygoY3JpdGljYWxDb3VudCAvIGFuYWx5c2VzLmxlbmd0aCkgKiAxMDApLnRvRml4ZWQoMSl9JSBvZiB5b3VyIGZpbGVzIGNvbnRhaW4gY3JpdGljYWwgKHJlcXVpcmVkKSBNSVNSQSB2aW9sYXRpb25zLmAsXHJcbiAgICAgICAgcmVjb21tZW5kYXRpb246ICdQcmlvcml0aXplIGZpeGluZyByZXF1aXJlZCB2aW9sYXRpb25zIGFzIHRoZXkgcmVwcmVzZW50IG1hbmRhdG9yeSBjb21wbGlhbmNlIHJ1bGVzLiBUaGVzZSB2aW9sYXRpb25zIG1heSBpbmRpY2F0ZSBwb3RlbnRpYWwgc2FmZXR5IG9yIHNlY3VyaXR5IGlzc3Vlcy4nLFxyXG4gICAgICAgIGNvbmZpZGVuY2Vfc2NvcmU6IHRoaXMuY2FsY3VsYXRlQ29uZmlkZW5jZShhbmFseXNlcy5sZW5ndGgpLFxyXG4gICAgICAgIGRhdGFfcG9pbnRzOiBhbmFseXNlcy5sZW5ndGgsXHJcbiAgICAgICAgY3JlYXRlZF9hdDogRGF0ZS5ub3coKVxyXG4gICAgICB9KVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBpbnNpZ2h0c1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogRGV0ZWN0IHBhdHRlcm5zIGFjcm9zcyBtdWx0aXBsZSBhbmFseXNlc1xyXG4gICAqL1xyXG4gIHByaXZhdGUgZGV0ZWN0UGF0dGVybnMoYW5hbHlzZXM6IGFueVtdKTogUGF0dGVybkRldGVjdGlvbltdIHtcclxuICAgIGNvbnN0IHBhdHRlcm5zOiBQYXR0ZXJuRGV0ZWN0aW9uW10gPSBbXVxyXG4gICAgY29uc3QgcnVsZUZyZXF1ZW5jeTogTWFwPHN0cmluZywgeyBjb3VudDogbnVtYmVyLCBmaWxlczogU2V0PHN0cmluZz4sIGZpcnN0U2VlbjogbnVtYmVyLCBsYXN0U2VlbjogbnVtYmVyIH0+ID0gbmV3IE1hcCgpXHJcblxyXG4gICAgLy8gQW5hbHl6ZSB2aW9sYXRpb24gcGF0dGVybnNcclxuICAgIGFuYWx5c2VzLmZvckVhY2goYW5hbHlzaXMgPT4ge1xyXG4gICAgICBjb25zdCB2aW9sYXRpb25zID0gYW5hbHlzaXMudmlvbGF0aW9ucyB8fCBbXVxyXG4gICAgICB2aW9sYXRpb25zLmZvckVhY2goKHZpb2xhdGlvbjogYW55KSA9PiB7XHJcbiAgICAgICAgY29uc3QgcnVsZUlkID0gdmlvbGF0aW9uLnJ1bGVfaWRcclxuICAgICAgICBpZiAoIXJ1bGVGcmVxdWVuY3kuaGFzKHJ1bGVJZCkpIHtcclxuICAgICAgICAgIHJ1bGVGcmVxdWVuY3kuc2V0KHJ1bGVJZCwge1xyXG4gICAgICAgICAgICBjb3VudDogMCxcclxuICAgICAgICAgICAgZmlsZXM6IG5ldyBTZXQoKSxcclxuICAgICAgICAgICAgZmlyc3RTZWVuOiBhbmFseXNpcy50aW1lc3RhbXAsXHJcbiAgICAgICAgICAgIGxhc3RTZWVuOiBhbmFseXNpcy50aW1lc3RhbXBcclxuICAgICAgICAgIH0pXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBkYXRhID0gcnVsZUZyZXF1ZW5jeS5nZXQocnVsZUlkKSFcclxuICAgICAgICBkYXRhLmNvdW50KytcclxuICAgICAgICBkYXRhLmZpbGVzLmFkZChhbmFseXNpcy5maWxlX2lkKVxyXG4gICAgICAgIGRhdGEubGFzdFNlZW4gPSBNYXRoLm1heChkYXRhLmxhc3RTZWVuLCBhbmFseXNpcy50aW1lc3RhbXApXHJcbiAgICAgIH0pXHJcbiAgICB9KVxyXG5cclxuICAgIC8vIENyZWF0ZSBwYXR0ZXJuIGRldGVjdGlvbnMgZm9yIGZyZXF1ZW50bHkgdmlvbGF0ZWQgcnVsZXNcclxuICAgIHJ1bGVGcmVxdWVuY3kuZm9yRWFjaCgoZGF0YSwgcnVsZUlkKSA9PiB7XHJcbiAgICAgIGlmIChkYXRhLmNvdW50ID49IDMpIHsgLy8gUGF0dGVybiB0aHJlc2hvbGRcclxuICAgICAgICBwYXR0ZXJucy5wdXNoKHtcclxuICAgICAgICAgIHBhdHRlcm5faWQ6IHV1aWR2NCgpLFxyXG4gICAgICAgICAgcGF0dGVybl90eXBlOiBgZnJlcXVlbnRfdmlvbGF0aW9uXyR7cnVsZUlkfWAsXHJcbiAgICAgICAgICBmcmVxdWVuY3k6IGRhdGEuY291bnQsXHJcbiAgICAgICAgICBmaXJzdF9zZWVuOiBkYXRhLmZpcnN0U2VlbixcclxuICAgICAgICAgIGxhc3Rfc2VlbjogZGF0YS5sYXN0U2VlbixcclxuICAgICAgICAgIGFmZmVjdGVkX2ZpbGVzOiBBcnJheS5mcm9tKGRhdGEuZmlsZXMpLFxyXG4gICAgICAgICAgc2V2ZXJpdHlfdHJlbmQ6IHRoaXMuY2FsY3VsYXRlU2V2ZXJpdHlUcmVuZChhbmFseXNlcywgcnVsZUlkKVxyXG4gICAgICAgIH0pXHJcbiAgICAgIH1cclxuICAgIH0pXHJcblxyXG4gICAgcmV0dXJuIHBhdHRlcm5zXHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBBbmFseXplIHRyZW5kcyBvdmVyIHRpbWVcclxuICAgKi9cclxuICBwcml2YXRlIGFuYWx5emVUcmVuZHMoYW5hbHlzZXM6IGFueVtdLCB0aW1lUmFuZ2VEYXlzOiBudW1iZXIpOiBUcmVuZEFuYWx5c2lzW10ge1xyXG4gICAgY29uc3QgdHJlbmRzOiBUcmVuZEFuYWx5c2lzW10gPSBbXVxyXG5cclxuICAgIC8vIFNvcnQgYW5hbHlzZXMgYnkgdGltZXN0YW1wXHJcbiAgICBjb25zdCBzb3J0ZWRBbmFseXNlcyA9IFsuLi5hbmFseXNlc10uc29ydCgoYSwgYikgPT4gYS50aW1lc3RhbXAgLSBiLnRpbWVzdGFtcClcclxuXHJcbiAgICAvLyBWaW9sYXRpb24gY291bnQgdHJlbmRcclxuICAgIGNvbnN0IHZpb2xhdGlvbkRhdGFQb2ludHM6IERhdGFQb2ludFtdID0gc29ydGVkQW5hbHlzZXMubWFwKGEgPT4gKHtcclxuICAgICAgdGltZXN0YW1wOiBhLnRpbWVzdGFtcCxcclxuICAgICAgdmFsdWU6IGEudmlvbGF0aW9uc19jb3VudCB8fCAwXHJcbiAgICB9KSlcclxuXHJcbiAgICBpZiAodmlvbGF0aW9uRGF0YVBvaW50cy5sZW5ndGggPj0gMikge1xyXG4gICAgICBjb25zdCBmaXJzdFZhbHVlID0gdmlvbGF0aW9uRGF0YVBvaW50c1swXS52YWx1ZVxyXG4gICAgICBjb25zdCBsYXN0VmFsdWUgPSB2aW9sYXRpb25EYXRhUG9pbnRzW3Zpb2xhdGlvbkRhdGFQb2ludHMubGVuZ3RoIC0gMV0udmFsdWVcclxuICAgICAgY29uc3QgY2hhbmdlUGVyY2VudGFnZSA9IGZpcnN0VmFsdWUgPiAwIFxyXG4gICAgICAgID8gKChsYXN0VmFsdWUgLSBmaXJzdFZhbHVlKSAvIGZpcnN0VmFsdWUpICogMTAwIFxyXG4gICAgICAgIDogMFxyXG5cclxuICAgICAgdHJlbmRzLnB1c2goe1xyXG4gICAgICAgIHRyZW5kX2lkOiB1dWlkdjQoKSxcclxuICAgICAgICBtZXRyaWM6ICd2aW9sYXRpb25fY291bnQnLFxyXG4gICAgICAgIGRpcmVjdGlvbjogY2hhbmdlUGVyY2VudGFnZSA+IDUgPyAndXAnIDogY2hhbmdlUGVyY2VudGFnZSA8IC01ID8gJ2Rvd24nIDogJ3N0YWJsZScsXHJcbiAgICAgICAgY2hhbmdlX3BlcmNlbnRhZ2U6IGNoYW5nZVBlcmNlbnRhZ2UsXHJcbiAgICAgICAgdGltZV9wZXJpb2RfZGF5czogdGltZVJhbmdlRGF5cyxcclxuICAgICAgICBkYXRhX3BvaW50czogdmlvbGF0aW9uRGF0YVBvaW50c1xyXG4gICAgICB9KVxyXG4gICAgfVxyXG5cclxuICAgIC8vIENyaXRpY2FsIHZpb2xhdGlvbnMgdHJlbmRcclxuICAgIGNvbnN0IGNyaXRpY2FsRGF0YVBvaW50czogRGF0YVBvaW50W10gPSBzb3J0ZWRBbmFseXNlcy5tYXAoYSA9PiAoe1xyXG4gICAgICB0aW1lc3RhbXA6IGEudGltZXN0YW1wLFxyXG4gICAgICB2YWx1ZTogYS52aW9sYXRpb25zPy5maWx0ZXIoKHY6IGFueSkgPT4gdi5zZXZlcml0eSA9PT0gJ3JlcXVpcmVkJykubGVuZ3RoIHx8IDBcclxuICAgIH0pKVxyXG5cclxuICAgIGlmIChjcml0aWNhbERhdGFQb2ludHMubGVuZ3RoID49IDIpIHtcclxuICAgICAgY29uc3QgZmlyc3RWYWx1ZSA9IGNyaXRpY2FsRGF0YVBvaW50c1swXS52YWx1ZVxyXG4gICAgICBjb25zdCBsYXN0VmFsdWUgPSBjcml0aWNhbERhdGFQb2ludHNbY3JpdGljYWxEYXRhUG9pbnRzLmxlbmd0aCAtIDFdLnZhbHVlXHJcbiAgICAgIGNvbnN0IGNoYW5nZVBlcmNlbnRhZ2UgPSBmaXJzdFZhbHVlID4gMCBcclxuICAgICAgICA/ICgobGFzdFZhbHVlIC0gZmlyc3RWYWx1ZSkgLyBmaXJzdFZhbHVlKSAqIDEwMCBcclxuICAgICAgICA6IDBcclxuXHJcbiAgICAgIHRyZW5kcy5wdXNoKHtcclxuICAgICAgICB0cmVuZF9pZDogdXVpZHY0KCksXHJcbiAgICAgICAgbWV0cmljOiAnY3JpdGljYWxfdmlvbGF0aW9ucycsXHJcbiAgICAgICAgZGlyZWN0aW9uOiBjaGFuZ2VQZXJjZW50YWdlID4gNSA/ICd1cCcgOiBjaGFuZ2VQZXJjZW50YWdlIDwgLTUgPyAnZG93bicgOiAnc3RhYmxlJyxcclxuICAgICAgICBjaGFuZ2VfcGVyY2VudGFnZTogY2hhbmdlUGVyY2VudGFnZSxcclxuICAgICAgICB0aW1lX3BlcmlvZF9kYXlzOiB0aW1lUmFuZ2VEYXlzLFxyXG4gICAgICAgIGRhdGFfcG9pbnRzOiBjcml0aWNhbERhdGFQb2ludHNcclxuICAgICAgfSlcclxuICAgIH1cclxuXHJcbiAgICAvLyBDb2RlIHF1YWxpdHkgc2NvcmUgdHJlbmQgKGludmVyc2Ugb2YgdmlvbGF0aW9ucylcclxuICAgIGNvbnN0IHF1YWxpdHlEYXRhUG9pbnRzOiBEYXRhUG9pbnRbXSA9IHNvcnRlZEFuYWx5c2VzLm1hcChhID0+ICh7XHJcbiAgICAgIHRpbWVzdGFtcDogYS50aW1lc3RhbXAsXHJcbiAgICAgIHZhbHVlOiBNYXRoLm1heCgwLCAxMDAgLSAoYS52aW9sYXRpb25zX2NvdW50IHx8IDApKVxyXG4gICAgfSkpXHJcblxyXG4gICAgaWYgKHF1YWxpdHlEYXRhUG9pbnRzLmxlbmd0aCA+PSAyKSB7XHJcbiAgICAgIGNvbnN0IGZpcnN0VmFsdWUgPSBxdWFsaXR5RGF0YVBvaW50c1swXS52YWx1ZVxyXG4gICAgICBjb25zdCBsYXN0VmFsdWUgPSBxdWFsaXR5RGF0YVBvaW50c1txdWFsaXR5RGF0YVBvaW50cy5sZW5ndGggLSAxXS52YWx1ZVxyXG4gICAgICBjb25zdCBjaGFuZ2VQZXJjZW50YWdlID0gZmlyc3RWYWx1ZSA+IDAgXHJcbiAgICAgICAgPyAoKGxhc3RWYWx1ZSAtIGZpcnN0VmFsdWUpIC8gZmlyc3RWYWx1ZSkgKiAxMDAgXHJcbiAgICAgICAgOiAwXHJcblxyXG4gICAgICB0cmVuZHMucHVzaCh7XHJcbiAgICAgICAgdHJlbmRfaWQ6IHV1aWR2NCgpLFxyXG4gICAgICAgIG1ldHJpYzogJ3F1YWxpdHlfc2NvcmUnLFxyXG4gICAgICAgIGRpcmVjdGlvbjogY2hhbmdlUGVyY2VudGFnZSA+IDUgPyAndXAnIDogY2hhbmdlUGVyY2VudGFnZSA8IC01ID8gJ2Rvd24nIDogJ3N0YWJsZScsXHJcbiAgICAgICAgY2hhbmdlX3BlcmNlbnRhZ2U6IGNoYW5nZVBlcmNlbnRhZ2UsXHJcbiAgICAgICAgdGltZV9wZXJpb2RfZGF5czogdGltZVJhbmdlRGF5cyxcclxuICAgICAgICBkYXRhX3BvaW50czogcXVhbGl0eURhdGFQb2ludHNcclxuICAgICAgfSlcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdHJlbmRzXHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBHZW5lcmF0ZSBhY3Rpb25hYmxlIHJlY29tbWVuZGF0aW9uc1xyXG4gICAqL1xyXG4gIHByaXZhdGUgZ2VuZXJhdGVSZWNvbW1lbmRhdGlvbnMoXHJcbiAgICBhbmFseXNlczogYW55W10sXHJcbiAgICBwYXR0ZXJuczogUGF0dGVybkRldGVjdGlvbltdLFxyXG4gICAgdHJlbmRzOiBUcmVuZEFuYWx5c2lzW11cclxuICApOiBSZWNvbW1lbmRhdGlvbkFjdGlvbltdIHtcclxuICAgIGNvbnN0IHJlY29tbWVuZGF0aW9uczogUmVjb21tZW5kYXRpb25BY3Rpb25bXSA9IFtdXHJcblxyXG4gICAgLy8gUmVjb21tZW5kYXRpb25zIGJhc2VkIG9uIHBhdHRlcm5zXHJcbiAgICBwYXR0ZXJucy5mb3JFYWNoKHBhdHRlcm4gPT4ge1xyXG4gICAgICBpZiAocGF0dGVybi5mcmVxdWVuY3kgPj0gNSkge1xyXG4gICAgICAgIHJlY29tbWVuZGF0aW9ucy5wdXNoKHtcclxuICAgICAgICAgIGFjdGlvbl9pZDogdXVpZHY0KCksXHJcbiAgICAgICAgICB0aXRsZTogYEFkZHJlc3MgUmVjdXJyaW5nICR7cGF0dGVybi5wYXR0ZXJuX3R5cGV9IFBhdHRlcm5gLFxyXG4gICAgICAgICAgZGVzY3JpcHRpb246IGBUaGlzIHZpb2xhdGlvbiBwYXR0ZXJuIGhhcyBiZWVuIGRldGVjdGVkICR7cGF0dGVybi5mcmVxdWVuY3l9IHRpbWVzIGFjcm9zcyAke3BhdHRlcm4uYWZmZWN0ZWRfZmlsZXMubGVuZ3RofSBmaWxlcy5gLFxyXG4gICAgICAgICAgcHJpb3JpdHk6IDIsXHJcbiAgICAgICAgICBlc3RpbWF0ZWRfaW1wYWN0OiAnaGlnaCcsXHJcbiAgICAgICAgICBlZmZvcnRfbGV2ZWw6ICdtZWRpdW0nLFxyXG4gICAgICAgICAgcmVzb3VyY2VzOiBbXHJcbiAgICAgICAgICAgICdodHRwczovL21pc3JhLm9yZy51ay9taXNyYS1jLycsXHJcbiAgICAgICAgICAgICdodHRwczovL3d3dy5wZXJmb3JjZS5jb20vcmVzb3VyY2VzL3FhYy9taXNyYS1jLWNwcCdcclxuICAgICAgICAgIF1cclxuICAgICAgICB9KVxyXG4gICAgICB9XHJcbiAgICB9KVxyXG5cclxuICAgIC8vIFJlY29tbWVuZGF0aW9ucyBiYXNlZCBvbiB0cmVuZHNcclxuICAgIHRyZW5kcy5mb3JFYWNoKHRyZW5kID0+IHtcclxuICAgICAgaWYgKHRyZW5kLm1ldHJpYyA9PT0gJ3Zpb2xhdGlvbl9jb3VudCcgJiYgdHJlbmQuZGlyZWN0aW9uID09PSAndXAnICYmIHRyZW5kLmNoYW5nZV9wZXJjZW50YWdlID4gMjApIHtcclxuICAgICAgICByZWNvbW1lbmRhdGlvbnMucHVzaCh7XHJcbiAgICAgICAgICBhY3Rpb25faWQ6IHV1aWR2NCgpLFxyXG4gICAgICAgICAgdGl0bGU6ICdWaW9sYXRpb24gQ291bnQgSW5jcmVhc2luZycsXHJcbiAgICAgICAgICBkZXNjcmlwdGlvbjogYFlvdXIgdmlvbGF0aW9uIGNvdW50IGhhcyBpbmNyZWFzZWQgYnkgJHt0cmVuZC5jaGFuZ2VfcGVyY2VudGFnZS50b0ZpeGVkKDEpfSUgb3ZlciB0aGUgcGFzdCAke3RyZW5kLnRpbWVfcGVyaW9kX2RheXN9IGRheXMuYCxcclxuICAgICAgICAgIHByaW9yaXR5OiAxLFxyXG4gICAgICAgICAgZXN0aW1hdGVkX2ltcGFjdDogJ2hpZ2gnLFxyXG4gICAgICAgICAgZWZmb3J0X2xldmVsOiAnaGlnaCcsXHJcbiAgICAgICAgICByZXNvdXJjZXM6IFtcclxuICAgICAgICAgICAgJ2h0dHBzOi8vd3d3Lm1pc3JhLm9yZy51ay9QdWJsaWNhdGlvbnMvdGFiaWQvNTcvRGVmYXVsdC5hc3B4J1xyXG4gICAgICAgICAgXVxyXG4gICAgICAgIH0pXHJcbiAgICAgIH0gZWxzZSBpZiAodHJlbmQubWV0cmljID09PSAndmlvbGF0aW9uX2NvdW50JyAmJiB0cmVuZC5kaXJlY3Rpb24gPT09ICdkb3duJyAmJiB0cmVuZC5jaGFuZ2VfcGVyY2VudGFnZSA8IC0yMCkge1xyXG4gICAgICAgIHJlY29tbWVuZGF0aW9ucy5wdXNoKHtcclxuICAgICAgICAgIGFjdGlvbl9pZDogdXVpZHY0KCksXHJcbiAgICAgICAgICB0aXRsZTogJ0dyZWF0IFByb2dyZXNzIG9uIENvZGUgUXVhbGl0eScsXHJcbiAgICAgICAgICBkZXNjcmlwdGlvbjogYFlvdXIgdmlvbGF0aW9uIGNvdW50IGhhcyBkZWNyZWFzZWQgYnkgJHtNYXRoLmFicyh0cmVuZC5jaGFuZ2VfcGVyY2VudGFnZSkudG9GaXhlZCgxKX0lIG92ZXIgdGhlIHBhc3QgJHt0cmVuZC50aW1lX3BlcmlvZF9kYXlzfSBkYXlzLiBLZWVwIHVwIHRoZSBnb29kIHdvcmshYCxcclxuICAgICAgICAgIHByaW9yaXR5OiA1LFxyXG4gICAgICAgICAgZXN0aW1hdGVkX2ltcGFjdDogJ2xvdycsXHJcbiAgICAgICAgICBlZmZvcnRfbGV2ZWw6ICdsb3cnLFxyXG4gICAgICAgICAgcmVzb3VyY2VzOiBbXVxyXG4gICAgICAgIH0pXHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIENyaXRpY2FsIHZpb2xhdGlvbnMgdHJlbmRcclxuICAgICAgaWYgKHRyZW5kLm1ldHJpYyA9PT0gJ2NyaXRpY2FsX3Zpb2xhdGlvbnMnICYmIHRyZW5kLmRpcmVjdGlvbiA9PT0gJ3VwJykge1xyXG4gICAgICAgIHJlY29tbWVuZGF0aW9ucy5wdXNoKHtcclxuICAgICAgICAgIGFjdGlvbl9pZDogdXVpZHY0KCksXHJcbiAgICAgICAgICB0aXRsZTogJ0NyaXRpY2FsIFZpb2xhdGlvbnMgSW5jcmVhc2luZycsXHJcbiAgICAgICAgICBkZXNjcmlwdGlvbjogYENyaXRpY2FsIChyZXF1aXJlZCkgdmlvbGF0aW9ucyBoYXZlIGluY3JlYXNlZCBieSAke01hdGguYWJzKHRyZW5kLmNoYW5nZV9wZXJjZW50YWdlKS50b0ZpeGVkKDEpfSUuIFRoZXNlIHJlcHJlc2VudCBtYW5kYXRvcnkgY29tcGxpYW5jZSBydWxlcy5gLFxyXG4gICAgICAgICAgcHJpb3JpdHk6IDEsXHJcbiAgICAgICAgICBlc3RpbWF0ZWRfaW1wYWN0OiAnaGlnaCcsXHJcbiAgICAgICAgICBlZmZvcnRfbGV2ZWw6ICdoaWdoJyxcclxuICAgICAgICAgIHJlc291cmNlczogW1xyXG4gICAgICAgICAgICAnaHR0cHM6Ly9taXNyYS5vcmcudWsvbWlzcmEtYy8nLFxyXG4gICAgICAgICAgICAnaHR0cHM6Ly93d3cucGVyZm9yY2UuY29tL3Jlc291cmNlcy9xYWMvbWlzcmEtYy1jcHAnXHJcbiAgICAgICAgICBdXHJcbiAgICAgICAgfSlcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gUXVhbGl0eSBzY29yZSBpbXByb3ZlbWVudHNcclxuICAgICAgaWYgKHRyZW5kLm1ldHJpYyA9PT0gJ3F1YWxpdHlfc2NvcmUnICYmIHRyZW5kLmRpcmVjdGlvbiA9PT0gJ3VwJyAmJiB0cmVuZC5jaGFuZ2VfcGVyY2VudGFnZSA+IDEwKSB7XHJcbiAgICAgICAgcmVjb21tZW5kYXRpb25zLnB1c2goe1xyXG4gICAgICAgICAgYWN0aW9uX2lkOiB1dWlkdjQoKSxcclxuICAgICAgICAgIHRpdGxlOiAnQ29kZSBRdWFsaXR5IEltcHJvdmluZycsXHJcbiAgICAgICAgICBkZXNjcmlwdGlvbjogYFlvdXIgY29kZSBxdWFsaXR5IHNjb3JlIGhhcyBpbXByb3ZlZCBieSAke3RyZW5kLmNoYW5nZV9wZXJjZW50YWdlLnRvRml4ZWQoMSl9JS4gQ29udGludWUgeW91ciBjdXJyZW50IHByYWN0aWNlcy5gLFxyXG4gICAgICAgICAgcHJpb3JpdHk6IDQsXHJcbiAgICAgICAgICBlc3RpbWF0ZWRfaW1wYWN0OiAnbWVkaXVtJyxcclxuICAgICAgICAgIGVmZm9ydF9sZXZlbDogJ2xvdycsXHJcbiAgICAgICAgICByZXNvdXJjZXM6IFtdXHJcbiAgICAgICAgfSlcclxuICAgICAgfVxyXG4gICAgfSlcclxuXHJcbiAgICAvLyBPcHRpbWl6YXRpb24gc3VnZ2VzdGlvbnMgYmFzZWQgb24gYW5hbHlzaXMgZGF0YVxyXG4gICAgcmVjb21tZW5kYXRpb25zLnB1c2goLi4udGhpcy5nZW5lcmF0ZU9wdGltaXphdGlvblN1Z2dlc3Rpb25zKGFuYWx5c2VzLCBwYXR0ZXJucywgdHJlbmRzKSlcclxuXHJcbiAgICByZXR1cm4gcmVjb21tZW5kYXRpb25zXHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBHZW5lcmF0ZSBvcHRpbWl6YXRpb24gc3VnZ2VzdGlvbnMgYmFzZWQgb24gYW5hbHlzaXMgcGF0dGVybnNcclxuICAgKi9cclxuICBwcml2YXRlIGdlbmVyYXRlT3B0aW1pemF0aW9uU3VnZ2VzdGlvbnMoXHJcbiAgICBhbmFseXNlczogYW55W10sXHJcbiAgICBwYXR0ZXJuczogUGF0dGVybkRldGVjdGlvbltdLFxyXG4gICAgdHJlbmRzOiBUcmVuZEFuYWx5c2lzW11cclxuICApOiBSZWNvbW1lbmRhdGlvbkFjdGlvbltdIHtcclxuICAgIGNvbnN0IHN1Z2dlc3Rpb25zOiBSZWNvbW1lbmRhdGlvbkFjdGlvbltdID0gW11cclxuXHJcbiAgICAvLyBTdWdnZXN0IGF1dG9tYXRlZCB0b29saW5nIGlmIG1hbnkgdmlvbGF0aW9uc1xyXG4gICAgY29uc3QgYXZnVmlvbGF0aW9ucyA9IGFuYWx5c2VzLnJlZHVjZSgoc3VtLCBhKSA9PiBzdW0gKyAoYS52aW9sYXRpb25zX2NvdW50IHx8IDApLCAwKSAvIGFuYWx5c2VzLmxlbmd0aFxyXG4gICAgaWYgKGF2Z1Zpb2xhdGlvbnMgPiAzMCkge1xyXG4gICAgICBzdWdnZXN0aW9ucy5wdXNoKHtcclxuICAgICAgICBhY3Rpb25faWQ6IHV1aWR2NCgpLFxyXG4gICAgICAgIHRpdGxlOiAnSW1wbGVtZW50IEF1dG9tYXRlZCBDb2RlIEZvcm1hdHRpbmcnLFxyXG4gICAgICAgIGRlc2NyaXB0aW9uOiAnV2l0aCBhbiBhdmVyYWdlIG9mICcgKyBhdmdWaW9sYXRpb25zLnRvRml4ZWQoMSkgKyAnIHZpb2xhdGlvbnMgcGVyIGZpbGUsIGF1dG9tYXRlZCBmb3JtYXR0aW5nIHRvb2xzIGNhbiBoZWxwIHJlZHVjZSBjb21tb24gaXNzdWVzLicsXHJcbiAgICAgICAgcHJpb3JpdHk6IDIsXHJcbiAgICAgICAgZXN0aW1hdGVkX2ltcGFjdDogJ2hpZ2gnLFxyXG4gICAgICAgIGVmZm9ydF9sZXZlbDogJ2xvdycsXHJcbiAgICAgICAgcmVzb3VyY2VzOiBbXHJcbiAgICAgICAgICAnaHR0cHM6Ly9jbGFuZy5sbHZtLm9yZy9kb2NzL0NsYW5nRm9ybWF0Lmh0bWwnLFxyXG4gICAgICAgICAgJ2h0dHBzOi8vZ2l0aHViLmNvbS91bmNydXN0aWZ5L3VuY3J1c3RpZnknXHJcbiAgICAgICAgXVxyXG4gICAgICB9KVxyXG4gICAgfVxyXG5cclxuICAgIC8vIFN1Z2dlc3QgY29kZSByZXZpZXcgcHJvY2VzcyBpZiBkZWdyYWRpbmcgcGF0dGVybnNcclxuICAgIGNvbnN0IGRlZ3JhZGluZ1BhdHRlcm5zID0gcGF0dGVybnMuZmlsdGVyKHAgPT4gcC5zZXZlcml0eV90cmVuZCA9PT0gJ2RlZ3JhZGluZycpXHJcbiAgICBpZiAoZGVncmFkaW5nUGF0dGVybnMubGVuZ3RoID4gMCkge1xyXG4gICAgICBzdWdnZXN0aW9ucy5wdXNoKHtcclxuICAgICAgICBhY3Rpb25faWQ6IHV1aWR2NCgpLFxyXG4gICAgICAgIHRpdGxlOiAnU3RyZW5ndGhlbiBDb2RlIFJldmlldyBQcm9jZXNzJyxcclxuICAgICAgICBkZXNjcmlwdGlvbjogYCR7ZGVncmFkaW5nUGF0dGVybnMubGVuZ3RofSB2aW9sYXRpb24gcGF0dGVybnMgYXJlIGRlZ3JhZGluZy4gRW5oYW5jZWQgY29kZSByZXZpZXdzIGNhbiBjYXRjaCB0aGVzZSBpc3N1ZXMgZWFybGllci5gLFxyXG4gICAgICAgIHByaW9yaXR5OiAyLFxyXG4gICAgICAgIGVzdGltYXRlZF9pbXBhY3Q6ICdoaWdoJyxcclxuICAgICAgICBlZmZvcnRfbGV2ZWw6ICdtZWRpdW0nLFxyXG4gICAgICAgIHJlc291cmNlczogW1xyXG4gICAgICAgICAgJ2h0dHBzOi8vZ29vZ2xlLmdpdGh1Yi5pby9lbmctcHJhY3RpY2VzL3Jldmlldy8nLFxyXG4gICAgICAgICAgJ2h0dHBzOi8vd3d3LnBlcmZvcmNlLmNvbS9ibG9nL3FhYy85LWJlc3QtcHJhY3RpY2VzLWZvci1jb2RlLXJldmlldydcclxuICAgICAgICBdXHJcbiAgICAgIH0pXHJcbiAgICB9XHJcblxyXG4gICAgLy8gU3VnZ2VzdCB0cmFpbmluZyBpZiBjb25zaXN0ZW50IHBhdHRlcm5zXHJcbiAgICBjb25zdCBmcmVxdWVudFBhdHRlcm5zID0gcGF0dGVybnMuZmlsdGVyKHAgPT4gcC5mcmVxdWVuY3kgPj0gMTApXHJcbiAgICBpZiAoZnJlcXVlbnRQYXR0ZXJucy5sZW5ndGggPiAwKSB7XHJcbiAgICAgIHN1Z2dlc3Rpb25zLnB1c2goe1xyXG4gICAgICAgIGFjdGlvbl9pZDogdXVpZHY0KCksXHJcbiAgICAgICAgdGl0bGU6ICdUZWFtIFRyYWluaW5nIG9uIENvbW1vbiBWaW9sYXRpb25zJyxcclxuICAgICAgICBkZXNjcmlwdGlvbjogYCR7ZnJlcXVlbnRQYXR0ZXJucy5sZW5ndGh9IHZpb2xhdGlvbiBwYXR0ZXJucyBvY2N1ciBmcmVxdWVudGx5LiBUZWFtIHRyYWluaW5nIGNhbiBhZGRyZXNzIHRoZXNlIHN5c3RlbWF0aWNhbGx5LmAsXHJcbiAgICAgICAgcHJpb3JpdHk6IDMsXHJcbiAgICAgICAgZXN0aW1hdGVkX2ltcGFjdDogJ21lZGl1bScsXHJcbiAgICAgICAgZWZmb3J0X2xldmVsOiAnbWVkaXVtJyxcclxuICAgICAgICByZXNvdXJjZXM6IFtcclxuICAgICAgICAgICdodHRwczovL3d3dy5taXNyYS5vcmcudWsvVHJhaW5pbmcvdGFiaWQvMTcxL0RlZmF1bHQuYXNweCdcclxuICAgICAgICBdXHJcbiAgICAgIH0pXHJcbiAgICB9XHJcblxyXG4gICAgLy8gU3VnZ2VzdCByZWZhY3RvcmluZyBpZiBxdWFsaXR5IGRlY2xpbmluZ1xyXG4gICAgY29uc3QgcXVhbGl0eVRyZW5kID0gdHJlbmRzLmZpbmQodCA9PiB0Lm1ldHJpYyA9PT0gJ3F1YWxpdHlfc2NvcmUnKVxyXG4gICAgaWYgKHF1YWxpdHlUcmVuZCAmJiBxdWFsaXR5VHJlbmQuZGlyZWN0aW9uID09PSAnZG93bicgJiYgcXVhbGl0eVRyZW5kLmNoYW5nZV9wZXJjZW50YWdlIDwgLTE1KSB7XHJcbiAgICAgIHN1Z2dlc3Rpb25zLnB1c2goe1xyXG4gICAgICAgIGFjdGlvbl9pZDogdXVpZHY0KCksXHJcbiAgICAgICAgdGl0bGU6ICdDb25zaWRlciBDb2RlIFJlZmFjdG9yaW5nJyxcclxuICAgICAgICBkZXNjcmlwdGlvbjogJ0NvZGUgcXVhbGl0eSBoYXMgZGVjbGluZWQgc2lnbmlmaWNhbnRseS4gUmVmYWN0b3JpbmcgcHJvYmxlbWF0aWMgYXJlYXMgY2FuIGltcHJvdmUgbWFpbnRhaW5hYmlsaXR5LicsXHJcbiAgICAgICAgcHJpb3JpdHk6IDIsXHJcbiAgICAgICAgZXN0aW1hdGVkX2ltcGFjdDogJ2hpZ2gnLFxyXG4gICAgICAgIGVmZm9ydF9sZXZlbDogJ2hpZ2gnLFxyXG4gICAgICAgIHJlc291cmNlczogW1xyXG4gICAgICAgICAgJ2h0dHBzOi8vcmVmYWN0b3JpbmcuZ3VydS8nLFxyXG4gICAgICAgICAgJ2h0dHBzOi8vd3d3LmFtYXpvbi5jb20vUmVmYWN0b3JpbmctSW1wcm92aW5nLURlc2lnbi1FeGlzdGluZy1Db2RlL2RwLzAyMDE0ODU2NzInXHJcbiAgICAgICAgXVxyXG4gICAgICB9KVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBzdWdnZXN0aW9uc1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogU3RvcmUgdXNlciBmZWVkYmFjayBmb3IgbGVhcm5pbmdcclxuICAgKi9cclxuICBhc3luYyBzdG9yZUZlZWRiYWNrKGZlZWRiYWNrOiBVc2VyRmVlZGJhY2spOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIC8vIFN0b3JlIGZlZWRiYWNrIGluIER5bmFtb0RCIGZvciBmdXR1cmUgbGVhcm5pbmdcclxuICAgIC8vIFRoaXMgd291bGQgYmUgaW1wbGVtZW50ZWQgd2l0aCBhIGZlZWRiYWNrIHRhYmxlXHJcbiAgICBjb25zb2xlLmxvZygnU3RvcmluZyB1c2VyIGZlZWRiYWNrOicsIGZlZWRiYWNrKVxyXG4gICAgLy8gVE9ETzogSW1wbGVtZW50IGZlZWRiYWNrIHN0b3JhZ2Ugd2hlbiBmZWVkYmFjayB0YWJsZSBpcyBjcmVhdGVkXHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBBcHBseSB1c2VyIGZlZWRiYWNrIHRvIGltcHJvdmUgcmVjb21tZW5kYXRpb25zXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBhcHBseVVzZXJGZWVkYmFjayhcclxuICAgIHJlY29tbWVuZGF0aW9uczogUmVjb21tZW5kYXRpb25BY3Rpb25bXSxcclxuICAgIHVzZXJJZDogc3RyaW5nXHJcbiAgKTogUmVjb21tZW5kYXRpb25BY3Rpb25bXSB7XHJcbiAgICAvLyBJbiBhIGZ1bGwgaW1wbGVtZW50YXRpb24sIHRoaXMgd291bGQ6XHJcbiAgICAvLyAxLiBGZXRjaCBoaXN0b3JpY2FsIGZlZWRiYWNrIGZvciB0aGlzIHVzZXJcclxuICAgIC8vIDIuIEFkanVzdCByZWNvbW1lbmRhdGlvbiBwcmlvcml0aWVzIGJhc2VkIG9uIHdoYXQgd2FzIGhlbHBmdWxcclxuICAgIC8vIDMuIEZpbHRlciBvdXQgcmVjb21tZW5kYXRpb24gdHlwZXMgdGhhdCB3ZXJlIGNvbnNpc3RlbnRseSB1bmhlbHBmdWxcclxuICAgIC8vIDQuIFBlcnNvbmFsaXplIHJlY29tbWVuZGF0aW9ucyBiYXNlZCBvbiB1c2VyIHByZWZlcmVuY2VzXHJcbiAgICBcclxuICAgIC8vIEZvciBub3csIHJldHVybiByZWNvbW1lbmRhdGlvbnMgYXMtaXNcclxuICAgIC8vIFRPRE86IEltcGxlbWVudCBmZWVkYmFjay1iYXNlZCBsZWFybmluZyB3aGVuIGZlZWRiYWNrIGRhdGEgaXMgYXZhaWxhYmxlXHJcbiAgICByZXR1cm4gcmVjb21tZW5kYXRpb25zXHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBHZW5lcmF0ZSBiYXNlbGluZSBpbnNpZ2h0cyB3aGVuIGluc3VmZmljaWVudCBkYXRhIGlzIGF2YWlsYWJsZVxyXG4gICAqL1xyXG4gIHByaXZhdGUgZ2VuZXJhdGVCYXNlbGluZUluc2lnaHRzKHVzZXJJZDogc3RyaW5nKTogSW5zaWdodFtdIHtcclxuICAgIHJldHVybiBbXHJcbiAgICAgIHtcclxuICAgICAgICBpbnNpZ2h0X2lkOiB1dWlkdjQoKSxcclxuICAgICAgICB1c2VyX2lkOiB1c2VySWQsXHJcbiAgICAgICAgdHlwZTogSW5zaWdodFR5cGUuQkFTRUxJTkUsXHJcbiAgICAgICAgc2V2ZXJpdHk6IEluc2lnaHRTZXZlcml0eS5JTkZPLFxyXG4gICAgICAgIGNhdGVnb3J5OiBJbnNpZ2h0Q2F0ZWdvcnkuQkVTVF9QUkFDVElDRVMsXHJcbiAgICAgICAgdGl0bGU6ICdHZXR0aW5nIFN0YXJ0ZWQgd2l0aCBNSVNSQSBDb21wbGlhbmNlJyxcclxuICAgICAgICBkZXNjcmlwdGlvbjogJ01JU1JBIEMvQysrIHN0YW5kYXJkcyBoZWxwIGVuc3VyZSBjb2RlIHNhZmV0eSwgc2VjdXJpdHksIGFuZCByZWxpYWJpbGl0eS4gU3RhcnQgYnkgYWRkcmVzc2luZyByZXF1aXJlZCB2aW9sYXRpb25zIGZpcnN0LicsXHJcbiAgICAgICAgcmVjb21tZW5kYXRpb246ICdVcGxvYWQgbW9yZSBjb2RlIGZpbGVzIHRvIHJlY2VpdmUgcGVyc29uYWxpemVkIGluc2lnaHRzIGJhc2VkIG9uIHlvdXIgY29kaW5nIHBhdHRlcm5zLicsXHJcbiAgICAgICAgY29uZmlkZW5jZV9zY29yZTogdGhpcy5CQVNFTElORV9DT05GSURFTkNFLFxyXG4gICAgICAgIGRhdGFfcG9pbnRzOiAwLFxyXG4gICAgICAgIGNyZWF0ZWRfYXQ6IERhdGUubm93KClcclxuICAgICAgfSxcclxuICAgICAge1xyXG4gICAgICAgIGluc2lnaHRfaWQ6IHV1aWR2NCgpLFxyXG4gICAgICAgIHVzZXJfaWQ6IHVzZXJJZCxcclxuICAgICAgICB0eXBlOiBJbnNpZ2h0VHlwZS5CQVNFTElORSxcclxuICAgICAgICBzZXZlcml0eTogSW5zaWdodFNldmVyaXR5LklORk8sXHJcbiAgICAgICAgY2F0ZWdvcnk6IEluc2lnaHRDYXRlZ29yeS5DT0RFX1FVQUxJVFksXHJcbiAgICAgICAgdGl0bGU6ICdJbmR1c3RyeSBCZXN0IFByYWN0aWNlcycsXHJcbiAgICAgICAgZGVzY3JpcHRpb246ICdJbmR1c3RyeSBzdGFuZGFyZHMgcmVjb21tZW5kIG1haW50YWluaW5nIGZld2VyIHRoYW4gNTAgTUlTUkEgdmlvbGF0aW9ucyBwZXIgMTAwMCBsaW5lcyBvZiBjb2RlLicsXHJcbiAgICAgICAgcmVjb21tZW5kYXRpb246ICdGb2N1cyBvbiBjb25zaXN0ZW50IGNvZGUgcmV2aWV3cyBhbmQgYXV0b21hdGVkIHN0YXRpYyBhbmFseXNpcyBpbnRlZ3JhdGlvbiBpbiB5b3VyIENJL0NEIHBpcGVsaW5lLicsXHJcbiAgICAgICAgY29uZmlkZW5jZV9zY29yZTogdGhpcy5CQVNFTElORV9DT05GSURFTkNFLFxyXG4gICAgICAgIGRhdGFfcG9pbnRzOiAwLFxyXG4gICAgICAgIGNyZWF0ZWRfYXQ6IERhdGUubm93KClcclxuICAgICAgfVxyXG4gICAgXVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR2V0IGJhc2VsaW5lIHJlY29tbWVuZGF0aW9uc1xyXG4gICAqL1xyXG4gIHByaXZhdGUgZ2V0QmFzZWxpbmVSZWNvbW1lbmRhdGlvbnMoKTogUmVjb21tZW5kYXRpb25BY3Rpb25bXSB7XHJcbiAgICByZXR1cm4gW1xyXG4gICAgICB7XHJcbiAgICAgICAgYWN0aW9uX2lkOiB1dWlkdjQoKSxcclxuICAgICAgICB0aXRsZTogJ0ludGVncmF0ZSBNSVNSQSBBbmFseXNpcyBpbiBDSS9DRCcsXHJcbiAgICAgICAgZGVzY3JpcHRpb246ICdBdXRvbWF0ZSBNSVNSQSBjb21wbGlhbmNlIGNoZWNraW5nIGluIHlvdXIgY29udGludW91cyBpbnRlZ3JhdGlvbiBwaXBlbGluZSB0byBjYXRjaCB2aW9sYXRpb25zIGVhcmx5LicsXHJcbiAgICAgICAgcHJpb3JpdHk6IDEsXHJcbiAgICAgICAgZXN0aW1hdGVkX2ltcGFjdDogJ2hpZ2gnLFxyXG4gICAgICAgIGVmZm9ydF9sZXZlbDogJ21lZGl1bScsXHJcbiAgICAgICAgcmVzb3VyY2VzOiBbXHJcbiAgICAgICAgICAnaHR0cHM6Ly9taXNyYS5vcmcudWsvJyxcclxuICAgICAgICAgICdodHRwczovL3d3dy5wZXJmb3JjZS5jb20vcmVzb3VyY2VzL3FhYy9taXNyYS1jLWNwcCdcclxuICAgICAgICBdXHJcbiAgICAgIH0sXHJcbiAgICAgIHtcclxuICAgICAgICBhY3Rpb25faWQ6IHV1aWR2NCgpLFxyXG4gICAgICAgIHRpdGxlOiAnRXN0YWJsaXNoIENvZGluZyBTdGFuZGFyZHMnLFxyXG4gICAgICAgIGRlc2NyaXB0aW9uOiAnRG9jdW1lbnQgYW5kIGVuZm9yY2UgdGVhbSBjb2Rpbmcgc3RhbmRhcmRzIGJhc2VkIG9uIE1JU1JBIGd1aWRlbGluZXMuJyxcclxuICAgICAgICBwcmlvcml0eTogMixcclxuICAgICAgICBlc3RpbWF0ZWRfaW1wYWN0OiAnaGlnaCcsXHJcbiAgICAgICAgZWZmb3J0X2xldmVsOiAnbG93JyxcclxuICAgICAgICByZXNvdXJjZXM6IFtcclxuICAgICAgICAgICdodHRwczovL3d3dy5taXNyYS5vcmcudWsvUHVibGljYXRpb25zL3RhYmlkLzU3L0RlZmF1bHQuYXNweCdcclxuICAgICAgICBdXHJcbiAgICAgIH0sXHJcbiAgICAgIHtcclxuICAgICAgICBhY3Rpb25faWQ6IHV1aWR2NCgpLFxyXG4gICAgICAgIHRpdGxlOiAnUmVndWxhciBDb2RlIFJldmlld3MnLFxyXG4gICAgICAgIGRlc2NyaXB0aW9uOiAnSW1wbGVtZW50IHBlZXIgY29kZSByZXZpZXdzIGZvY3VzaW5nIG9uIE1JU1JBIGNvbXBsaWFuY2UgYW5kIGNvZGUgcXVhbGl0eS4nLFxyXG4gICAgICAgIHByaW9yaXR5OiAzLFxyXG4gICAgICAgIGVzdGltYXRlZF9pbXBhY3Q6ICdtZWRpdW0nLFxyXG4gICAgICAgIGVmZm9ydF9sZXZlbDogJ2xvdycsXHJcbiAgICAgICAgcmVzb3VyY2VzOiBbXVxyXG4gICAgICB9XHJcbiAgICBdXHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBDYWxjdWxhdGUgY29uZmlkZW5jZSBsZXZlbCBiYXNlZCBvbiBkYXRhIGF2YWlsYWJpbGl0eVxyXG4gICAqL1xyXG4gIHByaXZhdGUgY2FsY3VsYXRlQ29uZmlkZW5jZUxldmVsKGRhdGFQb2ludHM6IG51bWJlcik6ICdsb3cnIHwgJ21lZGl1bScgfCAnaGlnaCcge1xyXG4gICAgaWYgKGRhdGFQb2ludHMgPCB0aGlzLk1JTl9EQVRBX1BPSU5UUykgcmV0dXJuICdsb3cnXHJcbiAgICBpZiAoZGF0YVBvaW50cyA8IDEwKSByZXR1cm4gJ21lZGl1bSdcclxuICAgIHJldHVybiAnaGlnaCdcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENhbGN1bGF0ZSBjb25maWRlbmNlIHNjb3JlXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBjYWxjdWxhdGVDb25maWRlbmNlKGRhdGFQb2ludHM6IG51bWJlcik6IG51bWJlciB7XHJcbiAgICBpZiAoZGF0YVBvaW50cyA8IHRoaXMuTUlOX0RBVEFfUE9JTlRTKSByZXR1cm4gdGhpcy5CQVNFTElORV9DT05GSURFTkNFXHJcbiAgICBpZiAoZGF0YVBvaW50cyA+PSAyMCkgcmV0dXJuIDk1XHJcbiAgICBpZiAoZGF0YVBvaW50cyA+PSAxMCkgcmV0dXJuIDg1XHJcbiAgICByZXR1cm4gNzBcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENhbGN1bGF0ZSBzZXZlcml0eSB0cmVuZCBmb3IgYSBzcGVjaWZpYyBydWxlXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBjYWxjdWxhdGVTZXZlcml0eVRyZW5kKGFuYWx5c2VzOiBhbnlbXSwgcnVsZUlkOiBzdHJpbmcpOiAnaW1wcm92aW5nJyB8ICdzdGFibGUnIHwgJ2RlZ3JhZGluZycge1xyXG4gICAgY29uc3Qgc29ydGVkQW5hbHlzZXMgPSBbLi4uYW5hbHlzZXNdLnNvcnQoKGEsIGIpID0+IGEudGltZXN0YW1wIC0gYi50aW1lc3RhbXApXHJcbiAgICBjb25zdCByZWNlbnRDb3VudCA9IHNvcnRlZEFuYWx5c2VzLnNsaWNlKC0zKS5maWx0ZXIoYSA9PiBcclxuICAgICAgYS52aW9sYXRpb25zPy5zb21lKCh2OiBhbnkpID0+IHYucnVsZV9pZCA9PT0gcnVsZUlkKVxyXG4gICAgKS5sZW5ndGhcclxuXHJcbiAgICBjb25zdCBvbGRlckNvdW50ID0gc29ydGVkQW5hbHlzZXMuc2xpY2UoMCwgMykuZmlsdGVyKGEgPT4gXHJcbiAgICAgIGEudmlvbGF0aW9ucz8uc29tZSgodjogYW55KSA9PiB2LnJ1bGVfaWQgPT09IHJ1bGVJZClcclxuICAgICkubGVuZ3RoXHJcblxyXG4gICAgaWYgKHJlY2VudENvdW50IDwgb2xkZXJDb3VudCkgcmV0dXJuICdpbXByb3ZpbmcnXHJcbiAgICBpZiAocmVjZW50Q291bnQgPiBvbGRlckNvdW50KSByZXR1cm4gJ2RlZ3JhZGluZydcclxuICAgIHJldHVybiAnc3RhYmxlJ1xyXG4gIH1cclxufVxyXG4iXX0=
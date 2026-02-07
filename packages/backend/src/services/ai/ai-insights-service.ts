/**
 * AI Insights Service
 * Generates intelligent recommendations and trend analysis from MISRA analysis data
 */

import { v4 as uuidv4 } from 'uuid'
import {
  Insight,
  InsightType,
  InsightSeverity,
  InsightCategory,
  PatternDetection,
  TrendAnalysis,
  RecommendationAction,
  InsightGenerationRequest,
  InsightGenerationResponse,
  DataPoint,
  UserFeedback
} from '../../types/ai-insights'
import { AnalysisResultsService } from '../analysis-results-service'
import { DynamoDBClientWrapper } from '../../database/dynamodb-client'

export class AIInsightsService {
  private analysisService: AnalysisResultsService
  private readonly MIN_DATA_POINTS = 3
  private readonly BASELINE_CONFIDENCE = 50
  private readonly HIGH_CONFIDENCE_THRESHOLD = 80

  constructor(dbClient: DynamoDBClientWrapper) {
    this.analysisService = new AnalysisResultsService(dbClient)
  }

  /**
   * Generate insights from analysis data
   */
  async generateInsights(request: InsightGenerationRequest): Promise<InsightGenerationResponse> {
    const timeRangeDays = request.time_range_days || 30
    const startTime = Date.now() - (timeRangeDays * 24 * 60 * 60 * 1000)

    // Fetch analysis results for the user
    const analyses = await this.analysisService.getAnalysesByUserId(
      request.user_id,
      { limit: 100 }
    )

    // Filter by time range
    const recentAnalyses = analyses.filter(a => a.timestamp >= startTime)

    const insights: Insight[] = []
    const patterns: PatternDetection[] = []
    const trends: TrendAnalysis[] = []
    const recommendations: RecommendationAction[] = []

    // Determine confidence level based on data availability
    const confidenceLevel = this.calculateConfidenceLevel(recentAnalyses.length)

    if (recentAnalyses.length >= this.MIN_DATA_POINTS) {
      // Generate data-driven insights
      insights.push(...this.generateQualityInsights(request.user_id, recentAnalyses))
      patterns.push(...this.detectPatterns(recentAnalyses))
      trends.push(...this.analyzeTrends(recentAnalyses, timeRangeDays))
      recommendations.push(...this.generateRecommendations(recentAnalyses, patterns, trends))
    }

    // Add baseline recommendations if requested or insufficient data
    if (request.include_baseline || recentAnalyses.length < this.MIN_DATA_POINTS) {
      insights.push(...this.generateBaselineInsights(request.user_id))
      recommendations.push(...this.getBaselineRecommendations())
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
    }
  }

  /**
   * Generate quality insights from analysis results
   */
  private generateQualityInsights(userId: string, analyses: any[]): Insight[] {
    const insights: Insight[] = []

    // Calculate average violations
    const totalViolations = analyses.reduce((sum, a) => sum + (a.violations_count || 0), 0)
    const avgViolations = totalViolations / analyses.length

    // High violation count insight
    if (avgViolations > 50) {
      insights.push({
        insight_id: uuidv4(),
        user_id: userId,
        type: InsightType.QUALITY,
        severity: InsightSeverity.HIGH,
        category: InsightCategory.CODE_QUALITY,
        title: 'High Average Violation Count',
        description: `Your code has an average of ${avgViolations.toFixed(1)} MISRA violations per file. This is above the recommended threshold of 50 violations.`,
        recommendation: 'Focus on addressing the most critical violations first. Consider implementing automated code formatting and linting in your development workflow.',
        confidence_score: this.calculateConfidence(analyses.length),
        data_points: analyses.length,
        created_at: Date.now()
      })
    } else if (avgViolations < 10) {
      insights.push({
        insight_id: uuidv4(),
        user_id: userId,
        type: InsightType.QUALITY,
        severity: InsightSeverity.INFO,
        category: InsightCategory.CODE_QUALITY,
        title: 'Excellent Code Quality',
        description: `Your code maintains an average of only ${avgViolations.toFixed(1)} MISRA violations per file. This is excellent!`,
        recommendation: 'Continue following your current coding practices. Consider documenting your coding standards for team reference.',
        confidence_score: this.calculateConfidence(analyses.length),
        data_points: analyses.length,
        created_at: Date.now()
      })
    }

    // Analyze violation severity distribution
    const criticalCount = analyses.filter(a => 
      a.violations?.some((v: any) => v.severity === 'required')
    ).length

    if (criticalCount > analyses.length * 0.5) {
      insights.push({
        insight_id: uuidv4(),
        user_id: userId,
        type: InsightType.QUALITY,
        severity: InsightSeverity.CRITICAL,
        category: InsightCategory.SECURITY,
        title: 'High Critical Violation Rate',
        description: `${((criticalCount / analyses.length) * 100).toFixed(1)}% of your files contain critical (required) MISRA violations.`,
        recommendation: 'Prioritize fixing required violations as they represent mandatory compliance rules. These violations may indicate potential safety or security issues.',
        confidence_score: this.calculateConfidence(analyses.length),
        data_points: analyses.length,
        created_at: Date.now()
      })
    }

    return insights
  }

  /**
   * Detect patterns across multiple analyses
   */
  private detectPatterns(analyses: any[]): PatternDetection[] {
    const patterns: PatternDetection[] = []
    const ruleFrequency: Map<string, { count: number, files: Set<string>, firstSeen: number, lastSeen: number }> = new Map()

    // Analyze violation patterns
    analyses.forEach(analysis => {
      const violations = analysis.violations || []
      violations.forEach((violation: any) => {
        const ruleId = violation.rule_id
        if (!ruleFrequency.has(ruleId)) {
          ruleFrequency.set(ruleId, {
            count: 0,
            files: new Set(),
            firstSeen: analysis.timestamp,
            lastSeen: analysis.timestamp
          })
        }

        const data = ruleFrequency.get(ruleId)!
        data.count++
        data.files.add(analysis.file_id)
        data.lastSeen = Math.max(data.lastSeen, analysis.timestamp)
      })
    })

    // Create pattern detections for frequently violated rules
    ruleFrequency.forEach((data, ruleId) => {
      if (data.count >= 3) { // Pattern threshold
        patterns.push({
          pattern_id: uuidv4(),
          pattern_type: `frequent_violation_${ruleId}`,
          frequency: data.count,
          first_seen: data.firstSeen,
          last_seen: data.lastSeen,
          affected_files: Array.from(data.files),
          severity_trend: this.calculateSeverityTrend(analyses, ruleId)
        })
      }
    })

    return patterns
  }

  /**
   * Analyze trends over time
   */
  private analyzeTrends(analyses: any[], timeRangeDays: number): TrendAnalysis[] {
    const trends: TrendAnalysis[] = []

    // Sort analyses by timestamp
    const sortedAnalyses = [...analyses].sort((a, b) => a.timestamp - b.timestamp)

    // Violation count trend
    const violationDataPoints: DataPoint[] = sortedAnalyses.map(a => ({
      timestamp: a.timestamp,
      value: a.violations_count || 0
    }))

    if (violationDataPoints.length >= 2) {
      const firstValue = violationDataPoints[0].value
      const lastValue = violationDataPoints[violationDataPoints.length - 1].value
      const changePercentage = firstValue > 0 
        ? ((lastValue - firstValue) / firstValue) * 100 
        : 0

      trends.push({
        trend_id: uuidv4(),
        metric: 'violation_count',
        direction: changePercentage > 5 ? 'up' : changePercentage < -5 ? 'down' : 'stable',
        change_percentage: changePercentage,
        time_period_days: timeRangeDays,
        data_points: violationDataPoints
      })
    }

    // Critical violations trend
    const criticalDataPoints: DataPoint[] = sortedAnalyses.map(a => ({
      timestamp: a.timestamp,
      value: a.violations?.filter((v: any) => v.severity === 'required').length || 0
    }))

    if (criticalDataPoints.length >= 2) {
      const firstValue = criticalDataPoints[0].value
      const lastValue = criticalDataPoints[criticalDataPoints.length - 1].value
      const changePercentage = firstValue > 0 
        ? ((lastValue - firstValue) / firstValue) * 100 
        : 0

      trends.push({
        trend_id: uuidv4(),
        metric: 'critical_violations',
        direction: changePercentage > 5 ? 'up' : changePercentage < -5 ? 'down' : 'stable',
        change_percentage: changePercentage,
        time_period_days: timeRangeDays,
        data_points: criticalDataPoints
      })
    }

    // Code quality score trend (inverse of violations)
    const qualityDataPoints: DataPoint[] = sortedAnalyses.map(a => ({
      timestamp: a.timestamp,
      value: Math.max(0, 100 - (a.violations_count || 0))
    }))

    if (qualityDataPoints.length >= 2) {
      const firstValue = qualityDataPoints[0].value
      const lastValue = qualityDataPoints[qualityDataPoints.length - 1].value
      const changePercentage = firstValue > 0 
        ? ((lastValue - firstValue) / firstValue) * 100 
        : 0

      trends.push({
        trend_id: uuidv4(),
        metric: 'quality_score',
        direction: changePercentage > 5 ? 'up' : changePercentage < -5 ? 'down' : 'stable',
        change_percentage: changePercentage,
        time_period_days: timeRangeDays,
        data_points: qualityDataPoints
      })
    }

    return trends
  }

  /**
   * Generate actionable recommendations
   */
  private generateRecommendations(
    analyses: any[],
    patterns: PatternDetection[],
    trends: TrendAnalysis[]
  ): RecommendationAction[] {
    const recommendations: RecommendationAction[] = []

    // Recommendations based on patterns
    patterns.forEach(pattern => {
      if (pattern.frequency >= 5) {
        recommendations.push({
          action_id: uuidv4(),
          title: `Address Recurring ${pattern.pattern_type} Pattern`,
          description: `This violation pattern has been detected ${pattern.frequency} times across ${pattern.affected_files.length} files.`,
          priority: 2,
          estimated_impact: 'high',
          effort_level: 'medium',
          resources: [
            'https://misra.org.uk/misra-c/',
            'https://www.perforce.com/resources/qac/misra-c-cpp'
          ]
        })
      }
    })

    // Recommendations based on trends
    trends.forEach(trend => {
      if (trend.metric === 'violation_count' && trend.direction === 'up' && trend.change_percentage > 20) {
        recommendations.push({
          action_id: uuidv4(),
          title: 'Violation Count Increasing',
          description: `Your violation count has increased by ${trend.change_percentage.toFixed(1)}% over the past ${trend.time_period_days} days.`,
          priority: 1,
          estimated_impact: 'high',
          effort_level: 'high',
          resources: [
            'https://www.misra.org.uk/Publications/tabid/57/Default.aspx'
          ]
        })
      } else if (trend.metric === 'violation_count' && trend.direction === 'down' && trend.change_percentage < -20) {
        recommendations.push({
          action_id: uuidv4(),
          title: 'Great Progress on Code Quality',
          description: `Your violation count has decreased by ${Math.abs(trend.change_percentage).toFixed(1)}% over the past ${trend.time_period_days} days. Keep up the good work!`,
          priority: 5,
          estimated_impact: 'low',
          effort_level: 'low',
          resources: []
        })
      }

      // Critical violations trend
      if (trend.metric === 'critical_violations' && trend.direction === 'up') {
        recommendations.push({
          action_id: uuidv4(),
          title: 'Critical Violations Increasing',
          description: `Critical (required) violations have increased by ${Math.abs(trend.change_percentage).toFixed(1)}%. These represent mandatory compliance rules.`,
          priority: 1,
          estimated_impact: 'high',
          effort_level: 'high',
          resources: [
            'https://misra.org.uk/misra-c/',
            'https://www.perforce.com/resources/qac/misra-c-cpp'
          ]
        })
      }

      // Quality score improvements
      if (trend.metric === 'quality_score' && trend.direction === 'up' && trend.change_percentage > 10) {
        recommendations.push({
          action_id: uuidv4(),
          title: 'Code Quality Improving',
          description: `Your code quality score has improved by ${trend.change_percentage.toFixed(1)}%. Continue your current practices.`,
          priority: 4,
          estimated_impact: 'medium',
          effort_level: 'low',
          resources: []
        })
      }
    })

    // Optimization suggestions based on analysis data
    recommendations.push(...this.generateOptimizationSuggestions(analyses, patterns, trends))

    return recommendations
  }

  /**
   * Generate optimization suggestions based on analysis patterns
   */
  private generateOptimizationSuggestions(
    analyses: any[],
    patterns: PatternDetection[],
    trends: TrendAnalysis[]
  ): RecommendationAction[] {
    const suggestions: RecommendationAction[] = []

    // Suggest automated tooling if many violations
    const avgViolations = analyses.reduce((sum, a) => sum + (a.violations_count || 0), 0) / analyses.length
    if (avgViolations > 30) {
      suggestions.push({
        action_id: uuidv4(),
        title: 'Implement Automated Code Formatting',
        description: 'With an average of ' + avgViolations.toFixed(1) + ' violations per file, automated formatting tools can help reduce common issues.',
        priority: 2,
        estimated_impact: 'high',
        effort_level: 'low',
        resources: [
          'https://clang.llvm.org/docs/ClangFormat.html',
          'https://github.com/uncrustify/uncrustify'
        ]
      })
    }

    // Suggest code review process if degrading patterns
    const degradingPatterns = patterns.filter(p => p.severity_trend === 'degrading')
    if (degradingPatterns.length > 0) {
      suggestions.push({
        action_id: uuidv4(),
        title: 'Strengthen Code Review Process',
        description: `${degradingPatterns.length} violation patterns are degrading. Enhanced code reviews can catch these issues earlier.`,
        priority: 2,
        estimated_impact: 'high',
        effort_level: 'medium',
        resources: [
          'https://google.github.io/eng-practices/review/',
          'https://www.perforce.com/blog/qac/9-best-practices-for-code-review'
        ]
      })
    }

    // Suggest training if consistent patterns
    const frequentPatterns = patterns.filter(p => p.frequency >= 10)
    if (frequentPatterns.length > 0) {
      suggestions.push({
        action_id: uuidv4(),
        title: 'Team Training on Common Violations',
        description: `${frequentPatterns.length} violation patterns occur frequently. Team training can address these systematically.`,
        priority: 3,
        estimated_impact: 'medium',
        effort_level: 'medium',
        resources: [
          'https://www.misra.org.uk/Training/tabid/171/Default.aspx'
        ]
      })
    }

    // Suggest refactoring if quality declining
    const qualityTrend = trends.find(t => t.metric === 'quality_score')
    if (qualityTrend && qualityTrend.direction === 'down' && qualityTrend.change_percentage < -15) {
      suggestions.push({
        action_id: uuidv4(),
        title: 'Consider Code Refactoring',
        description: 'Code quality has declined significantly. Refactoring problematic areas can improve maintainability.',
        priority: 2,
        estimated_impact: 'high',
        effort_level: 'high',
        resources: [
          'https://refactoring.guru/',
          'https://www.amazon.com/Refactoring-Improving-Design-Existing-Code/dp/0201485672'
        ]
      })
    }

    return suggestions
  }

  /**
   * Store user feedback for learning
   */
  async storeFeedback(feedback: UserFeedback): Promise<void> {
    // Store feedback in DynamoDB for future learning
    // This would be implemented with a feedback table
    console.log('Storing user feedback:', feedback)
    // TODO: Implement feedback storage when feedback table is created
  }

  /**
   * Apply user feedback to improve recommendations
   */
  private applyUserFeedback(
    recommendations: RecommendationAction[],
    userId: string
  ): RecommendationAction[] {
    // In a full implementation, this would:
    // 1. Fetch historical feedback for this user
    // 2. Adjust recommendation priorities based on what was helpful
    // 3. Filter out recommendation types that were consistently unhelpful
    // 4. Personalize recommendations based on user preferences
    
    // For now, return recommendations as-is
    // TODO: Implement feedback-based learning when feedback data is available
    return recommendations
  }

  /**
   * Generate baseline insights when insufficient data is available
   */
  private generateBaselineInsights(userId: string): Insight[] {
    return [
      {
        insight_id: uuidv4(),
        user_id: userId,
        type: InsightType.BASELINE,
        severity: InsightSeverity.INFO,
        category: InsightCategory.BEST_PRACTICES,
        title: 'Getting Started with MISRA Compliance',
        description: 'MISRA C/C++ standards help ensure code safety, security, and reliability. Start by addressing required violations first.',
        recommendation: 'Upload more code files to receive personalized insights based on your coding patterns.',
        confidence_score: this.BASELINE_CONFIDENCE,
        data_points: 0,
        created_at: Date.now()
      },
      {
        insight_id: uuidv4(),
        user_id: userId,
        type: InsightType.BASELINE,
        severity: InsightSeverity.INFO,
        category: InsightCategory.CODE_QUALITY,
        title: 'Industry Best Practices',
        description: 'Industry standards recommend maintaining fewer than 50 MISRA violations per 1000 lines of code.',
        recommendation: 'Focus on consistent code reviews and automated static analysis integration in your CI/CD pipeline.',
        confidence_score: this.BASELINE_CONFIDENCE,
        data_points: 0,
        created_at: Date.now()
      }
    ]
  }

  /**
   * Get baseline recommendations
   */
  private getBaselineRecommendations(): RecommendationAction[] {
    return [
      {
        action_id: uuidv4(),
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
        action_id: uuidv4(),
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
        action_id: uuidv4(),
        title: 'Regular Code Reviews',
        description: 'Implement peer code reviews focusing on MISRA compliance and code quality.',
        priority: 3,
        estimated_impact: 'medium',
        effort_level: 'low',
        resources: []
      }
    ]
  }

  /**
   * Calculate confidence level based on data availability
   */
  private calculateConfidenceLevel(dataPoints: number): 'low' | 'medium' | 'high' {
    if (dataPoints < this.MIN_DATA_POINTS) return 'low'
    if (dataPoints < 10) return 'medium'
    return 'high'
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(dataPoints: number): number {
    if (dataPoints < this.MIN_DATA_POINTS) return this.BASELINE_CONFIDENCE
    if (dataPoints >= 20) return 95
    if (dataPoints >= 10) return 85
    return 70
  }

  /**
   * Calculate severity trend for a specific rule
   */
  private calculateSeverityTrend(analyses: any[], ruleId: string): 'improving' | 'stable' | 'degrading' {
    const sortedAnalyses = [...analyses].sort((a, b) => a.timestamp - b.timestamp)
    const recentCount = sortedAnalyses.slice(-3).filter(a => 
      a.violations?.some((v: any) => v.rule_id === ruleId)
    ).length

    const olderCount = sortedAnalyses.slice(0, 3).filter(a => 
      a.violations?.some((v: any) => v.rule_id === ruleId)
    ).length

    if (recentCount < olderCount) return 'improving'
    if (recentCount > olderCount) return 'degrading'
    return 'stable'
  }
}

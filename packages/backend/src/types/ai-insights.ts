/**
 * Type definitions for AI-powered insights and recommendations
 */

export enum InsightType {
  QUALITY = 'quality',
  PATTERN = 'pattern',
  TREND = 'trend',
  RECOMMENDATION = 'recommendation',
  BASELINE = 'baseline'
}

export enum InsightSeverity {
  INFO = 'info',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum InsightCategory {
  CODE_QUALITY = 'code_quality',
  SECURITY = 'security',
  PERFORMANCE = 'performance',
  MAINTAINABILITY = 'maintainability',
  BEST_PRACTICES = 'best_practices'
}

export interface Insight {
  insight_id: string
  user_id: string
  type: InsightType
  severity: InsightSeverity
  category: InsightCategory
  title: string
  description: string
  recommendation: string
  confidence_score: number // 0-100
  data_points: number // Number of analyses used to generate this insight
  created_at: number
  expires_at?: number
  metadata?: Record<string, any>
}

export interface PatternDetection {
  pattern_id: string
  pattern_type: string
  frequency: number
  first_seen: number
  last_seen: number
  affected_files: string[]
  severity_trend: 'improving' | 'stable' | 'degrading'
}

export interface TrendAnalysis {
  trend_id: string
  metric: string
  direction: 'up' | 'down' | 'stable'
  change_percentage: number
  time_period_days: number
  data_points: DataPoint[]
}

export interface DataPoint {
  timestamp: number
  value: number
}

export interface RecommendationAction {
  action_id: string
  title: string
  description: string
  priority: number // 1-5, 1 being highest
  estimated_impact: 'low' | 'medium' | 'high'
  effort_level: 'low' | 'medium' | 'high'
  resources: string[] // Links to documentation, examples, etc.
}

export interface UserFeedback {
  feedback_id: string
  insight_id: string
  user_id: string
  rating: number // 1-5
  helpful: boolean
  comment?: string
  created_at: number
}

export interface InsightGenerationRequest {
  user_id: string
  analysis_ids?: string[]
  time_range_days?: number
  include_baseline?: boolean
}

export interface InsightGenerationResponse {
  insights: Insight[]
  patterns: PatternDetection[]
  trends: TrendAnalysis[]
  recommendations: RecommendationAction[]
  metadata: {
    total_analyses: number
    time_range_days: number
    confidence_level: 'low' | 'medium' | 'high'
    generated_at: number
  }
}

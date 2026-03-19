import { api } from '../api'

export interface Insight {
  insight_id: string
  user_id: string
  type: 'quality' | 'pattern' | 'trend' | 'recommendation' | 'baseline'
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical'
  category: 'code_quality' | 'security' | 'performance' | 'maintainability' | 'best_practices'
  title: string
  description: string
  recommendation: string
  confidence_score: number
  data_points: number
  created_at: number
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

export interface DataPoint {
  timestamp: number
  value: number
}

export interface TrendAnalysis {
  trend_id: string
  metric: string
  direction: 'up' | 'down' | 'stable'
  change_percentage: number
  time_period_days: number
  data_points: DataPoint[]
}

export interface RecommendationAction {
  action_id: string
  title: string
  description: string
  priority: number
  estimated_impact: 'low' | 'medium' | 'high'
  effort_level: 'low' | 'medium' | 'high'
  resources: string[]
}

export interface InsightsResponse {
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

export interface InsightsRequest {
  user_id: string
  time_range_days?: number
  include_baseline?: boolean
}

export interface FeedbackRequest {
  insight_id: string
  user_id: string
  rating: number
  helpful: boolean
  comment?: string
}

export const insightsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    generateInsights: builder.query<InsightsResponse, InsightsRequest>({
      queryFn: async () => {
        // Mock data for demo
        return {
          data: {
            insights: [
              {
                insight_id: 'insight-001',
                user_id: 'user-123',
                type: 'quality',
                severity: 'high',
                category: 'code_quality',
                title: 'Code Quality Declining',
                description: 'Code quality metrics have declined by 15% over the last week',
                recommendation: 'Review recent changes and refactor complex functions',
                confidence_score: 0.92,
                data_points: 45,
                created_at: Math.floor(Date.now() / 1000),
              },
              {
                insight_id: 'insight-002',
                user_id: 'user-123',
                type: 'pattern',
                severity: 'medium',
                category: 'best_practices',
                title: 'Repeated Pattern Detected',
                description: 'Similar code patterns found in 8 different files',
                recommendation: 'Extract common logic into reusable functions',
                confidence_score: 0.85,
                data_points: 32,
                created_at: Math.floor(Date.now() / 1000),
              },
            ],
            patterns: [
              {
                pattern_id: 'pattern-001',
                pattern_type: 'unused_variable',
                frequency: 12,
                first_seen: Math.floor(Date.now() / 1000) - 86400,
                last_seen: Math.floor(Date.now() / 1000),
                affected_files: ['app.js', 'utils.ts', 'helpers.js'],
                severity_trend: 'stable',
              },
            ],
            trends: [
              {
                trend_id: 'trend-001',
                metric: 'violations_per_file',
                direction: 'down',
                change_percentage: -12.5,
                time_period_days: 7,
                data_points: [
                  { timestamp: Math.floor(Date.now() / 1000) - 604800, value: 4.2 },
                  { timestamp: Math.floor(Date.now() / 1000) - 518400, value: 3.8 },
                  { timestamp: Math.floor(Date.now() / 1000), value: 3.7 },
                ],
              },
            ],
            recommendations: [
              {
                action_id: 'action-001',
                title: 'Refactor Complex Functions',
                description: 'Several functions exceed recommended complexity thresholds',
                priority: 1,
                estimated_impact: 'high',
                effort_level: 'medium',
                resources: ['refactoring-guide.md', 'complexity-analyzer.js'],
              },
            ],
            metadata: {
              total_analyses: 12,
              time_range_days: 7,
              confidence_level: 'high',
              generated_at: Math.floor(Date.now() / 1000),
            },
          },
        };
      },
      providesTags: ['Insight']
    }),
    submitFeedback: builder.mutation<void, FeedbackRequest>({
      query: (feedback) => ({
        url: '/ai/feedback',
        method: 'POST',
        body: feedback
      }),
      invalidatesTags: ['Insight']
    })
  })
})

export const {
  useGenerateInsightsQuery,
  useSubmitFeedbackMutation
} = insightsApi

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
      query: (params) => ({
        url: '/ai/insights',
        method: 'POST',
        body: params
      }),
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

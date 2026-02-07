import { api } from '../api'

interface Violation {
  ruleId: string
  ruleSet: string
  severity: 'required' | 'advisory' | 'mandatory'
  lineNumber: number
  columnNumber?: number
  message: string
  codeSnippet?: string
  recommendation?: string
}

interface AnalysisResult {
  analysisId: string
  fileId: string
  userId: string
  fileName: string
  ruleSet: string
  timestamp: number
  violationsCount: number
  rulesChecked: number
  violations: Violation[]
  success: boolean
  errorMessage?: string
}

interface AnalysisQueryParams {
  fileId?: string
  userId?: string
  ruleSet?: string
  startDate?: number
  endDate?: number
  limit?: number
}

interface UserStats {
  totalAnalyses: number
  successfulAnalyses: number
  failedAnalyses: number
  totalViolations: number
  averageViolationsPerFile: number
}

export const analysisApi = api.injectEndpoints({
  endpoints: (builder) => ({
    queryAnalysisResults: builder.query<AnalysisResult[], AnalysisQueryParams>({
      query: (params) => ({
        url: '/analysis/query',
        params
      }),
      providesTags: ['Analysis']
    }),
    getAnalysisById: builder.query<AnalysisResult, string>({
      query: (analysisId) => `/analysis/${analysisId}`,
      providesTags: ['Analysis']
    }),
    getUserStats: builder.query<UserStats, string>({
      query: (userId) => `/analysis/stats/${userId}`,
      providesTags: ['Analysis']
    }),
    getViolationReport: builder.query<any, { fileId: string; format?: string }>({
      query: ({ fileId, format = 'json' }) => ({
        url: `/reports/${fileId}`,
        params: { format }
      }),
      providesTags: ['Analysis']
    })
  })
})

export const {
  useQueryAnalysisResultsQuery,
  useGetAnalysisByIdQuery,
  useGetUserStatsQuery,
  useGetViolationReportQuery
} = analysisApi

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
      transformResponse: (response: any) => {
        // Backend returns { results: [] } or an array directly
        if (Array.isArray(response)) return response
        if (response?.results && Array.isArray(response.results)) return response.results
        return []
      },
      providesTags: ['Analysis']
    }),
    getAnalysisById: builder.query<AnalysisResult, string>({
      query: (analysisId) => `/analysis/${analysisId}`,
      providesTags: ['Analysis']
    }),
    getUserStats: builder.query<UserStats, string>({
      query: (userId) => `/analysis/stats/${userId}`,
      transformResponse: (response: any): UserStats => {
        // Normalize backend response to expected shape
        return {
          totalAnalyses: response?.totalAnalyses ?? 0,
          successfulAnalyses: response?.successfulAnalyses ?? response?.totalAnalyses ?? 0,
          failedAnalyses: response?.failedAnalyses ?? 0,
          totalViolations: response?.totalViolations ?? 0,
          averageViolationsPerFile: response?.averageViolationsPerFile ?? response?.averageScore ?? 0,
        }
      },
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

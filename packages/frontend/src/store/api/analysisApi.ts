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
      queryFn: async () => {
        // Mock data for demo
        return {
          data: [
            {
              analysisId: 'analysis-001',
              fileId: 'file-001',
              userId: 'user-123',
              fileName: 'app.js',
              ruleSet: 'MISRA-C',
              timestamp: Math.floor(Date.now() / 1000) - 3600,
              violationsCount: 3,
              rulesChecked: 42,
              violations: [
                {
                  ruleId: 'MISRA-2.1',
                  ruleSet: 'MISRA-C',
                  severity: 'mandatory',
                  lineNumber: 15,
                  message: 'Unused variable detected',
                  recommendation: 'Remove unused variable or use it',
                },
                {
                  ruleId: 'MISRA-5.1',
                  ruleSet: 'MISRA-C',
                  severity: 'required',
                  lineNumber: 28,
                  message: 'Identifier exceeds 31 characters',
                  recommendation: 'Shorten identifier name',
                },
                {
                  ruleId: 'MISRA-8.1',
                  ruleSet: 'MISRA-C',
                  severity: 'advisory',
                  lineNumber: 42,
                  message: 'Function should have explicit return type',
                  recommendation: 'Add explicit return type annotation',
                },
              ],
              success: true,
            },
            {
              analysisId: 'analysis-002',
              fileId: 'file-002',
              userId: 'user-123',
              fileName: 'utils.ts',
              ruleSet: 'MISRA-C',
              timestamp: Math.floor(Date.now() / 1000) - 7200,
              violationsCount: 1,
              rulesChecked: 42,
              violations: [
                {
                  ruleId: 'MISRA-10.1',
                  ruleSet: 'MISRA-C',
                  severity: 'required',
                  lineNumber: 8,
                  message: 'Implicit type conversion',
                  recommendation: 'Use explicit type casting',
                },
              ],
              success: true,
            },
          ],
        };
      },
      providesTags: ['Analysis']
    }),
    getAnalysisById: builder.query<AnalysisResult, string>({
      query: (analysisId) => `/analysis/${analysisId}`,
      providesTags: ['Analysis']
    }),
    getUserStats: builder.query<UserStats, string>({
      queryFn: async () => {
        // Mock data for demo
        return {
          data: {
            totalAnalyses: 12,
            successfulAnalyses: 11,
            failedAnalyses: 1,
            totalViolations: 28,
            averageViolationsPerFile: 2.3,
          },
        };
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

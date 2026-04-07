import { api } from '../api'

interface Violation {
  ruleId: string
  description: string
  severity: 'mandatory' | 'required' | 'advisory'
  lineNumber: number
  columnNumber: number
  message: string
  codeSnippet: string
  recommendation?: string
}

interface AnalysisSummary {
  totalViolations: number
  criticalCount: number
  majorCount: number
  minorCount: number
  compliancePercentage: number
}

interface MISRAAnalysisResult {
  analysisId: string
  fileId: string
  userId: string
  organizationId: string
  fileName: string
  language: 'C' | 'CPP'
  standard: 'MISRA-C:2012' | 'MISRA-C++:2008'
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED'
  violations: Violation[]
  summary: AnalysisSummary
  rulesChecked: number
  duration?: number
  completionTimestamp?: number
  errorMessage?: string
  created_at: number
}

interface MISRAAnalysisListItem {
  analysisId: string
  fileId: string
  fileName: string
  language: 'C' | 'CPP'
  standard: 'MISRA-C:2012' | 'MISRA-C++:2008'
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED'
  totalViolations: number
  compliancePercentage: number
  completionTimestamp?: number
  created_at: number
}

export const misraAnalysisApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getMISRAAnalysisResults: builder.query<MISRAAnalysisResult, string>({
      query: (fileId) => `/analysis/results/${fileId}`,
      providesTags: (_result, _error, fileId) => [{ type: 'MISRAAnalysis', id: fileId }]
    }),
    
    listMISRAAnalyses: builder.query<MISRAAnalysisListItem[], { userId: string; limit?: number }>({
      queryFn: async () => {
        // Returns empty until user uploads files and analyses complete
        return { data: [] }
      },
      providesTags: ['MISRAAnalysis']
    }),
    
    downloadMISRAReport: builder.query<{ downloadUrl: string }, string>({
      query: (fileId) => `/reports/${fileId}`,
      providesTags: (_result, _error, fileId) => [{ type: 'MISRAReport', id: fileId }]
    })
  })
})

export const {
  useGetMISRAAnalysisResultsQuery,
  useListMISRAAnalysesQuery,
  useDownloadMISRAReportQuery,
  useLazyDownloadMISRAReportQuery
} = misraAnalysisApi

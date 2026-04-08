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
      // Route /analysis/results/{fileId} doesn't exist — use /analysis/query?fileId=...
      query: (fileId) => ({ url: '/analysis/query', params: { fileId } }),
      transformResponse: (response: any, _meta, fileId): MISRAAnalysisResult => {
        const results = Array.isArray(response) ? response : (response?.results ?? [])
        const item = results[0]
        if (!item) {
          return {
            analysisId: '', fileId, userId: '', organizationId: '', fileName: '',
            language: 'C', standard: 'MISRA-C:2012', status: 'PENDING',
            violations: [], summary: { totalViolations: 0, criticalCount: 0, majorCount: 0, minorCount: 0, compliancePercentage: 100 },
            rulesChecked: 0, created_at: Date.now()
          }
        }
        return {
          analysisId: item.analysisId ?? '',
          fileId: item.fileId ?? fileId,
          userId: item.userId ?? '',
          organizationId: item.organizationId ?? '',
          fileName: item.fileName ?? '',
          language: item.language ?? 'C',
          standard: item.ruleSet ?? 'MISRA-C:2012',
          status: item.success === false ? 'FAILED' : 'COMPLETED',
          violations: item.violations ?? [],
          summary: {
            totalViolations: item.violationsCount ?? item.violations?.length ?? 0,
            criticalCount: 0, majorCount: 0, minorCount: 0,
            compliancePercentage: 100
          },
          rulesChecked: item.rulesChecked ?? 0,
          created_at: item.timestamp ?? Date.now()
        }
      },
      providesTags: (_result, _error, fileId) => [{ type: 'MISRAAnalysis', id: fileId }]
    }),
    
    listMISRAAnalyses: builder.query<MISRAAnalysisListItem[], { userId: string; limit?: number }>({
      query: ({ userId, limit = 50 }) => ({
        url: '/analysis/query',
        params: { userId, limit }
      }),
      transformResponse: (response: any): MISRAAnalysisListItem[] => {
        const results = Array.isArray(response) ? response : (response?.results ?? [])
        return results.map((item: any) => ({
          analysisId: item.analysisId ?? '',
          fileId: item.fileId ?? '',
          fileName: item.fileName ?? '',
          language: item.language ?? 'C',
          standard: item.ruleSet ?? item.standard ?? 'MISRA-C:2012',
          status: item.success === false ? 'FAILED' : 'COMPLETED',
          totalViolations: item.violationsCount ?? item.violations?.length ?? 0,
          compliancePercentage: item.compliancePercentage ?? 100,
          completionTimestamp: item.timestamp,
          created_at: item.timestamp ? Math.floor(item.timestamp / 1000) : Math.floor(Date.now() / 1000),
        }))
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

import { useState } from 'react'
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Button,
  TextField,
  MenuItem,
  LinearProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material'
import {
  Visibility as VisibilityIcon,
  Download as DownloadIcon,
  FilterList as FilterListIcon
} from '@mui/icons-material'
import { useSelector } from 'react-redux'
import { RootState } from '../store'
import FileUploadMISRA from '../components/FileUploadMISRA'
import { useListMISRAAnalysesQuery, useGetMISRAAnalysisResultsQuery, useLazyDownloadMISRAReportQuery } from '../store/api/misraAnalysisApi'

function MISRAAnalysisPage() {
  const [activeTab, setActiveTab] = useState(0)
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null)
  const [severityFilter, setSeverityFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const user = useSelector((state: RootState) => state.auth.user)

  const { data: analyses = [], isLoading: isLoadingList } = useListMISRAAnalysesQuery(
    { userId: user?.userId || '' },
    { skip: !user }
  )

  const { data: analysisDetails, isLoading: isLoadingDetails } = useGetMISRAAnalysisResultsQuery(
    selectedFileId || '',
    { skip: !selectedFileId }
  )

  const [downloadReport] = useLazyDownloadMISRAReportQuery()

  const handleViewDetails = (fileId: string) => {
    setSelectedFileId(fileId)
  }

  const handleCloseDetails = () => {
    setSelectedFileId(null)
  }

  const handleDownloadReport = async (fileId: string) => {
    try {
      const result = await downloadReport(fileId).unwrap()
      window.open(result.downloadUrl, '_blank')
    } catch (error) {
      console.error('Failed to download report:', error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'success'
      case 'IN_PROGRESS':
        return 'info'
      case 'PENDING':
        return 'warning'
      case 'FAILED':
        return 'error'
      default:
        return 'default'
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'mandatory':
        return 'error'
      case 'required':
        return 'warning'
      case 'advisory':
        return 'info'
      default:
        return 'default'
    }
  }

  const filteredAnalyses = analyses.filter((analysis) => {
    if (statusFilter !== 'all' && analysis.status !== statusFilter) return false
    return true
  })

  const filteredViolations = analysisDetails?.violations.filter((violation) => {
    if (severityFilter !== 'all' && violation.severity !== severityFilter) return false
    return true
  }) || []

  if (!user) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          MISRA C/C++ Analysis
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Please log in to access MISRA analysis.
        </Typography>
      </Box>
    )
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        MISRA C/C++ Analysis
      </Typography>
      <Typography variant="body1" color="text.secondary" mb={3}>
        Upload C/C++ source files for MISRA compliance analysis
      </Typography>

      <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)} sx={{ mb: 3 }}>
        <Tab label="Upload Files" />
        <Tab label="Analysis Results" />
      </Tabs>

      {activeTab === 0 && (
        <Box>
          <FileUploadMISRA />
        </Box>
      )}

      {activeTab === 1 && (
        <Box>
          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            <TextField
              select
              label="Status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              size="small"
              sx={{ minWidth: 150 }}
            >
              <MenuItem value="all">All Status</MenuItem>
              <MenuItem value="COMPLETED">Completed</MenuItem>
              <MenuItem value="IN_PROGRESS">In Progress</MenuItem>
              <MenuItem value="PENDING">Pending</MenuItem>
              <MenuItem value="FAILED">Failed</MenuItem>
            </TextField>
          </Box>

          {isLoadingList ? (
            <LinearProgress />
          ) : filteredAnalyses.length === 0 ? (
            <Alert severity="info">
              No analysis results found. Upload C/C++ files to get started.
            </Alert>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>File Name</TableCell>
                    <TableCell>Language</TableCell>
                    <TableCell>Standard</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Violations</TableCell>
                    <TableCell align="right">Compliance</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredAnalyses.map((analysis) => (
                    <TableRow key={analysis.analysisId}>
                      <TableCell>{analysis.fileName}</TableCell>
                      <TableCell>
                        <Chip label={analysis.language} size="small" />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">{analysis.standard}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={analysis.status}
                          color={getStatusColor(analysis.status) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right">
                        {analysis.status === 'COMPLETED' ? analysis.totalViolations : '-'}
                      </TableCell>
                      <TableCell align="right">
                        {analysis.status === 'COMPLETED' ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1 }}>
                            <Typography
                              variant="body2"
                              color={analysis.compliancePercentage >= 90 ? 'success.main' : analysis.compliancePercentage >= 70 ? 'warning.main' : 'error.main'}
                            >
                              {analysis.compliancePercentage.toFixed(1)}%
                            </Typography>
                          </Box>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        {new Date(analysis.created_at * 1000).toLocaleDateString()}
                      </TableCell>
                      <TableCell align="center">
                        <IconButton
                          size="small"
                          onClick={() => handleViewDetails(analysis.fileId)}
                          disabled={analysis.status !== 'COMPLETED'}
                        >
                          <VisibilityIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDownloadReport(analysis.fileId)}
                          disabled={analysis.status !== 'COMPLETED'}
                        >
                          <DownloadIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      )}

      {/* Violation Details Dialog */}
      <Dialog
        open={!!selectedFileId}
        onClose={handleCloseDetails}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              {analysisDetails?.fileName} - Analysis Details
            </Typography>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={() => selectedFileId && handleDownloadReport(selectedFileId)}
              size="small"
            >
              Download Report
            </Button>
          </Box>
        </DialogTitle>
        <DialogContent>
          {isLoadingDetails ? (
            <LinearProgress />
          ) : analysisDetails ? (
            <Box>
              {/* Summary Section */}
              <Paper sx={{ p: 2, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Summary
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Compliance
                    </Typography>
                    <Typography variant="h4" color={analysisDetails.summary.compliancePercentage >= 90 ? 'success.main' : analysisDetails.summary.compliancePercentage >= 70 ? 'warning.main' : 'error.main'}>
                      {analysisDetails.summary.compliancePercentage.toFixed(1)}%
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Total Violations
                    </Typography>
                    <Typography variant="h4">
                      {analysisDetails.summary.totalViolations}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Rules Checked
                    </Typography>
                    <Typography variant="h4">
                      {analysisDetails.rulesChecked}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Standard
                    </Typography>
                    <Typography variant="h6">
                      {analysisDetails.standard}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                  <Chip
                    label={`Mandatory: ${analysisDetails.summary.criticalCount}`}
                    color="error"
                    size="small"
                  />
                  <Chip
                    label={`Required: ${analysisDetails.summary.majorCount}`}
                    color="warning"
                    size="small"
                  />
                  <Chip
                    label={`Advisory: ${analysisDetails.summary.minorCount}`}
                    color="info"
                    size="small"
                  />
                </Box>
              </Paper>

              {/* Filter Section */}
              <Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
                <FilterListIcon />
                <TextField
                  select
                  label="Severity"
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value)}
                  size="small"
                  sx={{ minWidth: 150 }}
                >
                  <MenuItem value="all">All Severities</MenuItem>
                  <MenuItem value="mandatory">Mandatory</MenuItem>
                  <MenuItem value="required">Required</MenuItem>
                  <MenuItem value="advisory">Advisory</MenuItem>
                </TextField>
                <Typography variant="body2" color="text.secondary">
                  Showing {filteredViolations.length} of {analysisDetails.violations.length} violations
                </Typography>
              </Box>

              {/* Violations List */}
              {filteredViolations.length === 0 ? (
                <Alert severity="success">
                  No violations found with the selected filters.
                </Alert>
              ) : (
                <Box sx={{ maxHeight: '400px', overflow: 'auto' }}>
                  {filteredViolations.map((violation, index) => (
                    <Paper key={index} sx={{ p: 2, mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 1 }}>
                        <Box>
                          <Typography variant="subtitle1" fontWeight="bold">
                            {violation.ruleId}: {violation.description}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Line {violation.lineNumber}, Column {violation.columnNumber}
                          </Typography>
                        </Box>
                        <Chip
                          label={violation.severity}
                          color={getSeverityColor(violation.severity) as any}
                          size="small"
                        />
                      </Box>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        {violation.message}
                      </Typography>
                      {violation.codeSnippet && (
                        <Paper
                          sx={{
                            p: 1,
                            backgroundColor: 'grey.100',
                            fontFamily: 'monospace',
                            fontSize: '0.875rem',
                            overflow: 'auto'
                          }}
                        >
                          <pre style={{ margin: 0 }}>{violation.codeSnippet}</pre>
                        </Paper>
                      )}
                      {violation.recommendation && (
                        <Alert severity="info" sx={{ mt: 1 }}>
                          <Typography variant="caption">
                            <strong>Recommendation:</strong> {violation.recommendation}
                          </Typography>
                        </Alert>
                      )}
                    </Paper>
                  ))}
                </Box>
              )}
            </Box>
          ) : (
            <Alert severity="error">Failed to load analysis details</Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDetails}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default MISRAAnalysisPage

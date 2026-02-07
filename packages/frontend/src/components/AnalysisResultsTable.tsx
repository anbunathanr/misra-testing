import { useState } from 'react'
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  Chip,
  IconButton,
  TextField,
  MenuItem,
  Grid,
  CircularProgress,
  Alert
} from '@mui/material'
import { Visibility as ViewIcon } from '@mui/icons-material'
import { useQueryAnalysisResultsQuery } from '../store/api/analysisApi'

interface AnalysisResultsTableProps {
  userId?: string
  onViewDetails: (analysisId: string) => void
}

type SortField = 'timestamp' | 'fileName' | 'violationsCount'
type SortOrder = 'asc' | 'desc'

function AnalysisResultsTable({ userId, onViewDetails }: AnalysisResultsTableProps) {
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [sortField, setSortField] = useState<SortField>('timestamp')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [ruleSetFilter, setRuleSetFilter] = useState<string>('all')
  const [fileNameFilter, setFileNameFilter] = useState('')

  const { data: results = [], isLoading, error } = useQueryAnalysisResultsQuery({
    userId,
    limit: 100
  })

  const handleSort = (field: SortField) => {
    const isAsc = sortField === field && sortOrder === 'asc'
    setSortOrder(isAsc ? 'desc' : 'asc')
    setSortField(field)
  }

  const filteredResults = results
    .filter(result => {
      if (ruleSetFilter !== 'all' && result.ruleSet !== ruleSetFilter) return false
      if (fileNameFilter && !result.fileName.toLowerCase().includes(fileNameFilter.toLowerCase())) return false
      return true
    })
    .sort((a, b) => {
      const multiplier = sortOrder === 'asc' ? 1 : -1
      if (sortField === 'timestamp') return (a.timestamp - b.timestamp) * multiplier
      if (sortField === 'fileName') return a.fileName.localeCompare(b.fileName) * multiplier
      if (sortField === 'violationsCount') return (a.violationsCount - b.violationsCount) * multiplier
      return 0
    })

  const paginatedResults = filteredResults.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return <Alert severity="error">Failed to load analysis results</Alert>
  }

  return (
    <Box>
      <Grid container spacing={2} mb={2}>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            size="small"
            label="Filter by filename"
            value={fileNameFilter}
            onChange={(e) => setFileNameFilter(e.target.value)}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            select
            size="small"
            label="Rule Set"
            value={ruleSetFilter}
            onChange={(e) => setRuleSetFilter(e.target.value)}
          >
            <MenuItem value="all">All Rule Sets</MenuItem>
            <MenuItem value="MISRA_C_2004">MISRA C 2004</MenuItem>
            <MenuItem value="MISRA_C_2012">MISRA C 2012</MenuItem>
            <MenuItem value="MISRA_CPP_2008">MISRA C++ 2008</MenuItem>
          </TextField>
        </Grid>
      </Grid>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>
                <TableSortLabel
                  active={sortField === 'fileName'}
                  direction={sortField === 'fileName' ? sortOrder : 'asc'}
                  onClick={() => handleSort('fileName')}
                >
                  File Name
                </TableSortLabel>
              </TableCell>
              <TableCell>Rule Set</TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortField === 'violationsCount'}
                  direction={sortField === 'violationsCount' ? sortOrder : 'asc'}
                  onClick={() => handleSort('violationsCount')}
                >
                  Violations
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortField === 'timestamp'}
                  direction={sortField === 'timestamp' ? sortOrder : 'asc'}
                  onClick={() => handleSort('timestamp')}
                >
                  Date
                </TableSortLabel>
              </TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedResults.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  No analysis results found
                </TableCell>
              </TableRow>
            ) : (
              paginatedResults.map((result) => (
                <TableRow key={result.analysisId} hover>
                  <TableCell>{result.fileName}</TableCell>
                  <TableCell>
                    <Chip
                      label={result.ruleSet.replace(/_/g, ' ')}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={result.violationsCount}
                      size="small"
                      color={result.violationsCount === 0 ? 'success' : result.violationsCount > 10 ? 'error' : 'warning'}
                    />
                  </TableCell>
                  <TableCell>
                    {new Date(result.timestamp).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={result.success ? 'Success' : 'Failed'}
                      size="small"
                      color={result.success ? 'success' : 'error'}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <IconButton
                      size="small"
                      onClick={() => onViewDetails(result.analysisId)}
                      color="primary"
                    >
                      <ViewIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={filteredResults.length}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10))
            setPage(0)
          }}
        />
      </TableContainer>
    </Box>
  )
}

export default AnalysisResultsTable

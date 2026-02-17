import { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Collapse,
  IconButton,
  Chip,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  KeyboardArrowDown as ExpandMoreIcon,
  KeyboardArrowUp as ExpandLessIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { useGetSuiteExecutionResultsQuery } from '../store/api/executionsApi';
import { ExecutionStatusBadge } from './ExecutionStatusBadge';

interface TestSuiteExecutionViewProps {
  suiteExecutionId: string;
}

export function TestSuiteExecutionView({ suiteExecutionId }: TestSuiteExecutionViewProps) {
  const { data, isLoading, error } = useGetSuiteExecutionResultsQuery(suiteExecutionId);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (executionId: string) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(executionId)) {
        newSet.delete(executionId);
      } else {
        newSet.add(executionId);
      }
      return newSet;
    });
  };

  const formatDuration = (duration?: number) => {
    if (!duration) return '-';
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${seconds}s`;
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      return format(new Date(timestamp), 'MMM dd, yyyy HH:mm:ss');
    } catch {
      return timestamp;
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error">
        Failed to load suite execution results
      </Alert>
    );
  }

  if (!data) {
    return null;
  }

  const { stats, testCaseExecutions } = data;

  return (
    <Box>
      {/* Aggregate Statistics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Total Tests
              </Typography>
              <Typography variant="h4">{stats.total}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'success.light' }}>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Passed
              </Typography>
              <Typography variant="h4">{stats.passed}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'error.light' }}>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Failed
              </Typography>
              <Typography variant="h4">{stats.failed}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'warning.light' }}>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Errors
              </Typography>
              <Typography variant="h4">{stats.errors}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Suite Information */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Suite Execution Details
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">
                Suite Execution ID
              </Typography>
              <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                {suiteExecutionId}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">
                Status
              </Typography>
              <Chip label={data.status} color={data.status === 'completed' ? 'success' : 'default'} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">
                Started
              </Typography>
              <Typography variant="body2">
                {formatTimestamp(data.startTime)}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">
                Duration
              </Typography>
              <Typography variant="body2">
                {formatDuration(data.duration)}
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Individual Test Case Results */}
      <Typography variant="h6" gutterBottom>
        Test Case Results
      </Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell width={50} />
              <TableCell>Test Case ID</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Result</TableCell>
              <TableCell>Duration</TableCell>
              <TableCell>Steps</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {testCaseExecutions.map((execution) => (
              <>
                <TableRow key={execution.executionId} hover>
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={() => toggleRow(execution.executionId)}
                    >
                      {expandedRows.has(execution.executionId) ? (
                        <ExpandLessIcon />
                      ) : (
                        <ExpandMoreIcon />
                      )}
                    </IconButton>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                      {execution.testCaseId?.substring(0, 8)}...
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <ExecutionStatusBadge
                      executionId={execution.executionId}
                      showProgress={false}
                    />
                  </TableCell>
                  <TableCell>
                    {execution.result && (
                      <Chip
                        label={execution.result}
                        size="small"
                        color={
                          execution.result === 'pass'
                            ? 'success'
                            : execution.result === 'fail'
                            ? 'error'
                            : 'default'
                        }
                      />
                    )}
                  </TableCell>
                  <TableCell>{formatDuration(execution.duration)}</TableCell>
                  <TableCell>{execution.steps.length}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
                    <Collapse
                      in={expandedRows.has(execution.executionId)}
                      timeout="auto"
                      unmountOnExit
                    >
                      <Box sx={{ margin: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>
                          Step Details
                        </Typography>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Step</TableCell>
                              <TableCell>Action</TableCell>
                              <TableCell>Status</TableCell>
                              <TableCell>Duration</TableCell>
                              <TableCell>Error</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {execution.steps.map((step) => (
                              <TableRow key={step.stepIndex}>
                                <TableCell>{step.stepIndex + 1}</TableCell>
                                <TableCell>{step.action}</TableCell>
                                <TableCell>
                                  <Chip
                                    label={step.status}
                                    size="small"
                                    color={
                                      step.status === 'pass'
                                        ? 'success'
                                        : step.status === 'fail'
                                        ? 'error'
                                        : 'default'
                                    }
                                  />
                                </TableCell>
                                <TableCell>{formatDuration(step.duration)}</TableCell>
                                <TableCell>
                                  {step.errorMessage && (
                                    <Typography variant="caption" color="error">
                                      {step.errorMessage}
                                    </Typography>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </Box>
                    </Collapse>
                  </TableCell>
                </TableRow>
              </>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  TextField,
  Typography,
  IconButton,
  Tooltip,
  Chip,
} from '@mui/material';
import { Visibility as ViewIcon } from '@mui/icons-material';
import { format } from 'date-fns';
import { useGetExecutionHistoryQuery, TestExecution } from '../store/api/executionsApi';
import { ExecutionStatusBadge } from './ExecutionStatusBadge';

interface ExecutionResultsTableProps {
  projectId?: string;
  testCaseId?: string;
  testSuiteId?: string;
  onViewDetails?: (execution: TestExecution) => void;
}

export function ExecutionResultsTable({
  projectId,
  testCaseId,
  testSuiteId,
  onViewDetails,
}: ExecutionResultsTableProps) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data, isLoading, error } = useGetExecutionHistoryQuery({
    projectId,
    testCaseId,
    testSuiteId,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    limit: 50,
  });

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
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography>Loading execution history...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="error">Failed to load execution history</Typography>
      </Box>
    );
  }

  const executions = data?.executions || [];

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <TextField
          label="Start Date"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
          size="small"
        />
        <TextField
          label="End Date"
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
          size="small"
        />
      </Box>

      {executions.length === 0 ? (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="text.secondary">No execution history found</Typography>
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Execution ID</TableCell>
                <TableCell>Test Case</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Result</TableCell>
                <TableCell>Duration</TableCell>
                <TableCell>Started</TableCell>
                <TableCell>Environment</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {executions.map((execution) => (
                <TableRow key={execution.executionId} hover>
                  <TableCell>
                    <Tooltip title={execution.executionId}>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        {execution.executionId.substring(0, 8)}...
                      </Typography>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {execution.testCaseId ? `Test Case ${execution.testCaseId.substring(0, 8)}` : '-'}
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
                  <TableCell>
                    <Typography variant="body2">
                      {formatTimestamp(execution.startTime)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {execution.metadata.environment && (
                      <Chip
                        label={execution.metadata.environment}
                        size="small"
                        variant="outlined"
                      />
                    )}
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="View Details">
                      <IconButton
                        size="small"
                        onClick={() => onViewDetails?.(execution)}
                      >
                        <ViewIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}

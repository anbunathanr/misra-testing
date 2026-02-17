import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  CheckCircle as PassIcon,
  Error as FailIcon,
  Warning as ErrorIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { useGetExecutionResultsQuery } from '../store/api/executionsApi';
import { ScreenshotViewer } from './ScreenshotViewer';

interface ExecutionDetailsModalProps {
  executionId: string | null;
  open: boolean;
  onClose: () => void;
}

export function ExecutionDetailsModal({
  executionId,
  open,
  onClose,
}: ExecutionDetailsModalProps) {
  const { data, isLoading, error } = useGetExecutionResultsQuery(executionId || '', {
    skip: !executionId,
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

  const getStepIcon = (status: string) => {
    switch (status) {
      case 'pass':
        return <PassIcon color="success" />;
      case 'fail':
        return <FailIcon color="error" />;
      case 'error':
        return <ErrorIcon color="warning" />;
      default:
        return null;
    }
  };

  const getResultColor = (result?: string) => {
    switch (result) {
      case 'pass':
        return 'success';
      case 'fail':
        return 'error';
      case 'error':
        return 'warning';
      default:
        return 'default';
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Execution Details</Typography>
          {executionId && (
            <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
              {executionId.substring(0, 16)}...
            </Typography>
          )}
        </Box>
      </DialogTitle>
      
      <DialogContent>
        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Alert severity="error">
            Failed to load execution details
          </Alert>
        )}

        {data && (
          <Box>
            {/* Overall Status */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Overall Status
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <Chip
                  label={data.execution.status}
                  color={data.execution.status === 'completed' ? 'success' : 'default'}
                />
                {data.execution.result && (
                  <Chip
                    label={data.execution.result}
                    color={getResultColor(data.execution.result) as any}
                  />
                )}
                <Typography variant="body2" color="text.secondary">
                  Duration: {formatDuration(data.execution.duration)}
                </Typography>
              </Box>
            </Box>

            {/* Timing Information */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Timing
              </Typography>
              <Typography variant="body2">
                Started: {formatTimestamp(data.execution.startTime)}
              </Typography>
              {data.execution.endTime && (
                <Typography variant="body2">
                  Ended: {formatTimestamp(data.execution.endTime)}
                </Typography>
              )}
            </Box>

            {/* Error Message */}
            {data.execution.errorMessage && (
              <Alert severity="error" sx={{ mb: 3 }}>
                <Typography variant="body2" fontWeight="bold">
                  Error
                </Typography>
                <Typography variant="body2">
                  {data.execution.errorMessage}
                </Typography>
              </Alert>
            )}

            <Divider sx={{ my: 3 }} />

            {/* Step Results */}
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Test Steps ({data.execution.steps.length})
            </Typography>
            <List>
              {data.execution.steps.map((step, index) => (
                <Box key={step.stepIndex}>
                  <ListItem>
                    <ListItemIcon>
                      {getStepIcon(step.status)}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" fontWeight="bold">
                            Step {step.stepIndex + 1}: {step.action}
                          </Typography>
                          <Chip
                            label={step.status}
                            size="small"
                            color={getResultColor(step.status) as any}
                          />
                          <Typography variant="caption" color="text.secondary">
                            {formatDuration(step.duration)}
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <Box sx={{ mt: 1 }}>
                          {step.details?.url && (
                            <Typography variant="caption" display="block">
                              URL: {step.details.url}
                            </Typography>
                          )}
                          {step.details?.selector && (
                            <Typography variant="caption" display="block">
                              Selector: {step.details.selector}
                            </Typography>
                          )}
                          {step.details?.value && (
                            <Typography variant="caption" display="block">
                              Value: {step.details.value}
                            </Typography>
                          )}
                          {step.errorMessage && (
                            <Alert severity="error" sx={{ mt: 1 }}>
                              {step.errorMessage}
                            </Alert>
                          )}
                          {step.screenshot && (
                            <Box sx={{ mt: 1 }}>
                              <ScreenshotViewer
                                screenshotUrl={data.screenshotUrls[data.execution.screenshots.indexOf(step.screenshot)]}
                                stepIndex={step.stepIndex}
                                action={step.action}
                              />
                            </Box>
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                  {index < data.execution.steps.length - 1 && <Divider />}
                </Box>
              ))}
            </List>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

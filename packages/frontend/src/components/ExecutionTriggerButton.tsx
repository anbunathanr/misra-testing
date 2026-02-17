import { useState } from 'react';
import {
  Button,
  CircularProgress,
  Snackbar,
  Alert,
  Tooltip,
  Box,
  Typography,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { useTriggerExecutionMutation } from '../store/api/executionsApi';

interface ExecutionTriggerButtonProps {
  testCaseId?: string;
  testSuiteId?: string;
  environment?: string;
  variant?: 'text' | 'outlined' | 'contained';
  size?: 'small' | 'medium' | 'large';
  fullWidth?: boolean;
  disabled?: boolean;
  onSuccess?: (executionId: string, suiteExecutionId?: string) => void;
  onError?: (error: string) => void;
}

export function ExecutionTriggerButton({
  testCaseId,
  testSuiteId,
  environment,
  variant = 'contained',
  size = 'medium',
  fullWidth = false,
  disabled = false,
  onSuccess,
  onError,
}: ExecutionTriggerButtonProps) {
  const [triggerExecution, { isLoading }] = useTriggerExecutionMutation();
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [executionInfo, setExecutionInfo] = useState<{
    executionId?: string;
    suiteExecutionId?: string;
  }>({});

  const handleTrigger = async () => {
    try {
      const result = await triggerExecution({
        testCaseId,
        testSuiteId,
        environment,
      }).unwrap();

      setExecutionInfo({
        executionId: result.executionId,
        suiteExecutionId: result.suiteExecutionId,
      });
      setShowSuccess(true);

      if (onSuccess) {
        onSuccess(
          result.executionId || result.suiteExecutionId || '',
          result.suiteExecutionId
        );
      }
    } catch (error: any) {
      const message = error?.data?.error || error?.message || 'Failed to trigger execution';
      setErrorMessage(message);
      setShowError(true);

      if (onError) {
        onError(message);
      }
    }
  };

  const handleCloseSuccess = () => {
    setShowSuccess(false);
  };

  const handleCloseError = () => {
    setShowError(false);
  };

  const isDisabled = disabled || isLoading || (!testCaseId && !testSuiteId);

  const buttonText = testSuiteId ? 'Run Suite' : 'Run Test';
  const tooltipText = isDisabled
    ? !testCaseId && !testSuiteId
      ? 'No test case or suite selected'
      : 'Execution in progress'
    : `Trigger ${testSuiteId ? 'suite' : 'test case'} execution`;

  return (
    <>
      <Tooltip title={tooltipText}>
        <span>
          <Button
            variant={variant}
            size={size}
            fullWidth={fullWidth}
            disabled={isDisabled}
            onClick={handleTrigger}
            startIcon={
              isLoading ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                <PlayArrowIcon />
              )
            }
            color="primary"
          >
            {isLoading ? 'Starting...' : buttonText}
          </Button>
        </span>
      </Tooltip>

      {/* Success Snackbar */}
      <Snackbar
        open={showSuccess}
        autoHideDuration={6000}
        onClose={handleCloseSuccess}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseSuccess}
          severity="success"
          variant="filled"
          sx={{ width: '100%' }}
        >
          <Box>
            <Typography variant="body2" fontWeight="bold">
              Execution Started Successfully
            </Typography>
            {executionInfo.executionId && (
              <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                Execution ID: {executionInfo.executionId.substring(0, 8)}...
              </Typography>
            )}
            {executionInfo.suiteExecutionId && (
              <Typography variant="caption" display="block">
                Suite Execution ID: {executionInfo.suiteExecutionId.substring(0, 8)}...
              </Typography>
            )}
          </Box>
        </Alert>
      </Snackbar>

      {/* Error Snackbar */}
      <Snackbar
        open={showError}
        autoHideDuration={6000}
        onClose={handleCloseError}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseError}
          severity="error"
          variant="filled"
          sx={{ width: '100%' }}
        >
          <Box>
            <Typography variant="body2" fontWeight="bold">
              Execution Failed
            </Typography>
            <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
              {errorMessage}
            </Typography>
          </Box>
        </Alert>
      </Snackbar>
    </>
  );
}

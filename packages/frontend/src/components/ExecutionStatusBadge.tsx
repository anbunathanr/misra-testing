import { useEffect } from 'react';
import { Chip, CircularProgress, Box, Tooltip } from '@mui/material';
import {
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  HourglassEmpty as QueuedIcon,
  PlayArrow as RunningIcon,
} from '@mui/icons-material';
import { useGetExecutionStatusQuery } from '../store/api/executionsApi';

interface ExecutionStatusBadgeProps {
  executionId: string;
  showProgress?: boolean;
  size?: 'small' | 'medium';
  onStatusChange?: (status: string, result?: string) => void;
}

export function ExecutionStatusBadge({
  executionId,
  showProgress = true,
  size = 'small',
  onStatusChange,
}: ExecutionStatusBadgeProps) {
  const { data: statusData, isLoading } = useGetExecutionStatusQuery(executionId, {
    pollingInterval: statusData?.status === 'running' || statusData?.status === 'queued' ? 3000 : 0,
    skip: !executionId,
  });

  useEffect(() => {
    if (statusData && onStatusChange) {
      onStatusChange(statusData.status, statusData.result);
    }
  }, [statusData, onStatusChange]);

  if (isLoading || !statusData) {
    return (
      <Chip
        size={size}
        icon={<CircularProgress size={16} />}
        label="Loading..."
        variant="outlined"
      />
    );
  }

  const getStatusConfig = () => {
    const { status, result } = statusData;

    if (status === 'queued') {
      return {
        label: 'Queued',
        color: 'default' as const,
        icon: <QueuedIcon />,
        tooltip: 'Execution is queued and waiting to start',
      };
    }

    if (status === 'running') {
      const progress = showProgress && statusData.currentStep && statusData.totalSteps
        ? ` (${statusData.currentStep}/${statusData.totalSteps})`
        : '';
      return {
        label: `Running${progress}`,
        color: 'info' as const,
        icon: <RunningIcon />,
        tooltip: `Execution in progress${progress ? `: step ${statusData.currentStep} of ${statusData.totalSteps}` : ''}`,
      };
    }

    if (status === 'completed') {
      if (result === 'pass') {
        return {
          label: 'Passed',
          color: 'success' as const,
          icon: <SuccessIcon />,
          tooltip: 'All test steps passed successfully',
        };
      }
      if (result === 'fail') {
        return {
          label: 'Failed',
          color: 'error' as const,
          icon: <ErrorIcon />,
          tooltip: 'One or more test steps failed',
        };
      }
      if (result === 'error') {
        return {
          label: 'Error',
          color: 'error' as const,
          icon: <ErrorIcon />,
          tooltip: 'Execution encountered an unexpected error',
        };
      }
    }

    if (status === 'error') {
      return {
        label: 'Error',
        color: 'error' as const,
        icon: <ErrorIcon />,
        tooltip: statusData.errorMessage || 'Execution encountered an error',
      };
    }

    return {
      label: status,
      color: 'default' as const,
      icon: undefined,
      tooltip: `Status: ${status}`,
    };
  };

  const config = getStatusConfig();

  return (
    <Tooltip title={config.tooltip} arrow>
      <Chip
        size={size}
        icon={config.icon}
        label={config.label}
        color={config.color}
        variant={statusData.status === 'running' ? 'filled' : 'outlined'}
      />
    </Tooltip>
  );
}

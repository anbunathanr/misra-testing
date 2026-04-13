import React, { useEffect, useRef } from 'react';
import { Box, Typography, IconButton, Paper, Tooltip } from '@mui/material';
import { 
  Clear as ClearIcon, 
  Error as ErrorIcon,
  Warning as WarningIcon,
  CheckCircle as SuccessIcon,
  Info as InfoIcon,
  ContentCopy as CopyIcon
} from '@mui/icons-material';
import { LogEntry } from '../services/logging';

interface TerminalOutputProps {
  logs: LogEntry[];
  isRunning: boolean;
  onClear: () => void;
  visible?: boolean;
  maxHeight?: number;
  showCopyButton?: boolean;
  showLogIcons?: boolean;
}

const TerminalOutput: React.FC<TerminalOutputProps> = ({ 
  logs, 
  isRunning, 
  onClear, 
  visible = false,
  maxHeight = 300,
  showCopyButton = true,
  showLogIcons = true
}) => {
  const outputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [logs]);

  const getStatusBadge = () => {
    if (isRunning) {
      return (
        <Box
          component="span"
          sx={{
            display: 'inline-block',
            padding: '4px 10px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 600,
            textTransform: 'uppercase',
            backgroundColor: '#ffc107',
            color: '#000'
          }}
        >
          Running
        </Box>
      );
    }

    const hasErrors = logs.some(log => log.level === 'error');
    if (hasErrors) {
      return (
        <Box
          component="span"
          sx={{
            display: 'inline-block',
            padding: '4px 10px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 600,
            textTransform: 'uppercase',
            backgroundColor: '#dc3545',
            color: 'white'
          }}
        >
          Error
        </Box>
      );
    }

    return (
      <Box
        component="span"
        sx={{
          display: 'inline-block',
          padding: '4px 10px',
          borderRadius: '4px',
          fontSize: '11px',
          fontWeight: 600,
          textTransform: 'uppercase',
          backgroundColor: '#28a745',
          color: 'white'
        }}
      >
        Success
      </Box>
    );
  };

  const getLogColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'error':
        return '#ff6b6b';
      case 'warn':
        return '#ffd93d';
      case 'success':
        return '#6bcf7f';
      default:
        return '#00ff00';
    }
  };

  const getLogIcon = (level: LogEntry['level']) => {
    if (!showLogIcons) return null;
    
    const iconProps = { fontSize: 'small' as const, sx: { mr: 0.5, verticalAlign: 'middle' } };
    
    switch (level) {
      case 'error':
        return <ErrorIcon {...iconProps} sx={{ ...iconProps.sx, color: '#ff6b6b' }} />;
      case 'warn':
        return <WarningIcon {...iconProps} sx={{ ...iconProps.sx, color: '#ffd93d' }} />;
      case 'success':
        return <SuccessIcon {...iconProps} sx={{ ...iconProps.sx, color: '#6bcf7f' }} />;
      default:
        return <InfoIcon {...iconProps} sx={{ ...iconProps.sx, color: '#00ff00' }} />;
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleTimeString('en-US', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const copyLogsToClipboard = async () => {
    const logText = logs.map(log => {
      const timestamp = formatTimestamp(log.timestamp);
      const details = log.details ? 
        (typeof log.details === 'string' ? ` ${log.details}` : ` ${JSON.stringify(log.details)}`) : '';
      return `[${timestamp}] [${log.level.toUpperCase()}] ${log.message}${details}`;
    }).join('\n');
    
    try {
      await navigator.clipboard.writeText(logText);
      // Could add a toast notification here
    } catch (err) {
      console.error('Failed to copy logs to clipboard:', err);
    }
  };

  const getLogStats = () => {
    const stats = logs.reduce((acc, log) => {
      acc[log.level] = (acc[log.level] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return stats;
  };

  if (!visible) return null;

  return (
    <Paper
      sx={{
        backgroundColor: '#1e1e1e',
        borderRadius: 2,
        p: 2,
        mb: 2.5
      }}
    >
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 1.25
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography
            variant="h6"
            sx={{
              color: '#fff',
              fontSize: '13px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}
          >
            Test Output
          </Typography>
          {logs.length > 0 && (
            <Typography
              variant="caption"
              sx={{
                color: '#999',
                fontSize: '11px'
              }}
            >
              ({logs.length} entries)
            </Typography>
          )}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {getStatusBadge()}
          {showCopyButton && logs.length > 0 && (
            <Tooltip title="Copy logs to clipboard">
              <IconButton
                size="small"
                onClick={copyLogsToClipboard}
                sx={{ color: '#fff' }}
              >
                <CopyIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          <IconButton
            size="small"
            onClick={onClear}
            sx={{ color: '#fff' }}
          >
            <ClearIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      <Box
        ref={outputRef}
        sx={{
          backgroundColor: '#1e1e1e',
          color: '#00ff00',
          fontFamily: '"Monaco", "Menlo", "Ubuntu Mono", monospace',
          fontSize: '12px',
          lineHeight: 1.5,
          p: 1.5,
          borderRadius: 1,
          maxHeight: `${maxHeight}px`,
          overflowY: 'auto',
          whiteSpace: 'pre-wrap',
          wordWrap: 'break-word',
          '&::-webkit-scrollbar': {
            width: '8px'
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: '#2a2a2a'
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: '#555',
            borderRadius: '4px'
          }
        }}
      >
        {logs.length === 0 ? (
          <Typography sx={{ color: '#666', fontStyle: 'italic' }}>
            No output yet...
          </Typography>
        ) : (
          logs.map((log, index) => (
            <Box key={index} sx={{ mb: 0.5, display: 'flex', alignItems: 'flex-start' }}>
              {getLogIcon(log.level)}
              <Box sx={{ flex: 1 }}>
                <Typography
                  component="span"
                  sx={{
                    color: getLogColor(log.level),
                    fontFamily: 'inherit',
                    fontSize: 'inherit'
                  }}
                >
                  [{formatTimestamp(log.timestamp)}] {log.message}
                </Typography>
                {log.details && (
                  <Box 
                    component="div" 
                    sx={{ 
                      color: '#ccc', 
                      ml: showLogIcons ? 2.5 : 0,
                      mt: 0.25,
                      fontSize: '11px',
                      opacity: 0.8
                    }}
                  >
                    {typeof log.details === 'string' ? log.details : JSON.stringify(log.details, null, 2)}
                  </Box>
                )}
              </Box>
            </Box>
          ))
        )}
      </Box>
    </Paper>
  );
};

export default TerminalOutput;
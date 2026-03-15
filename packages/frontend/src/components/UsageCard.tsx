import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Box,
  Alert,
  Skeleton,
} from '@mui/material';
import { useGetUsageQuery } from '../store/api/aiApi';

export const UsageCard: React.FC = () => {
  const { data: usage, isLoading, error } = useGetUsageQuery();

  if (isLoading) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            AI Usage
          </Typography>
          <Skeleton variant="rectangular" height={60} />
          <Box sx={{ mt: 2 }}>
            <Skeleton variant="text" />
            <Skeleton variant="text" />
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (error || !usage) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            AI Usage
          </Typography>
          <Alert severity="error">Failed to load usage data</Alert>
        </CardContent>
      </Card>
    );
  }

  const todayPercentUsed = (usage.today.cost / usage.limits.dailyCost) * 100;
  const monthPercentUsed = (usage.thisMonth.cost / usage.limits.monthlyCost) * 100;

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          AI Usage
        </Typography>

        {/* Today's Usage */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Today
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2">Cost</Typography>
            <Typography variant="body2" fontWeight="medium">
              ${usage.today.cost.toFixed(2)} / ${usage.limits.dailyCost.toFixed(2)}
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={Math.min(todayPercentUsed, 100)}
            color={todayPercentUsed > 80 ? 'error' : todayPercentUsed > 60 ? 'warning' : 'primary'}
            sx={{ height: 8, borderRadius: 1 }}
          />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Requests: {usage.today.requests} / {usage.limits.dailyRequests}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Tokens: {usage.today.tokens.toLocaleString()}
            </Typography>
          </Box>
        </Box>

        {/* This Month's Usage */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            This Month
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2">Cost</Typography>
            <Typography variant="body2" fontWeight="medium">
              ${usage.thisMonth.cost.toFixed(2)} / ${usage.limits.monthlyCost.toFixed(2)}
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={Math.min(monthPercentUsed, 100)}
            color={monthPercentUsed > 80 ? 'error' : monthPercentUsed > 60 ? 'warning' : 'primary'}
            sx={{ height: 8, borderRadius: 1 }}
          />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Requests: {usage.thisMonth.requests}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Tokens: {usage.thisMonth.tokens.toLocaleString()}
            </Typography>
          </Box>
        </Box>

        {/* Warning Messages */}
        {todayPercentUsed > 90 && (
          <Alert severity="error" sx={{ mt: 2 }}>
            Daily limit almost reached! ({todayPercentUsed.toFixed(0)}%)
          </Alert>
        )}
        {todayPercentUsed > 80 && todayPercentUsed <= 90 && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            Approaching daily limit ({todayPercentUsed.toFixed(0)}%)
          </Alert>
        )}
        {monthPercentUsed > 80 && (
          <Alert severity="info" sx={{ mt: 2 }}>
            Monthly usage: {monthPercentUsed.toFixed(0)}%
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

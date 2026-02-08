import { Box, Paper, Typography, Chip } from '@mui/material'
import {
  TrendingUp as TrendUpIcon,
  TrendingDown as TrendDownIcon,
  TrendingFlat as TrendFlatIcon
} from '@mui/icons-material'
import { TrendAnalysis } from '../store/api/insightsApi'

interface TrendsChartProps {
  trends: TrendAnalysis[]
}

function TrendsChart({ trends }: TrendsChartProps) {
  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'up':
        return <TrendUpIcon />
      case 'down':
        return <TrendDownIcon />
      case 'stable':
        return <TrendFlatIcon />
      default:
        return <TrendFlatIcon />
    }
  }

  const getTrendColor = (metric: string, direction: string): 'error' | 'success' | 'info' => {
    // For violation counts, down is good
    if (metric === 'violation_count' || metric === 'critical_violations') {
      if (direction === 'down') return 'success'
      if (direction === 'up') return 'error'
    }
    // For quality score, up is good
    if (metric === 'quality_score') {
      if (direction === 'up') return 'success'
      if (direction === 'down') return 'error'
    }
    return 'info'
  }

  const getMetricLabel = (metric: string): string => {
    switch (metric) {
      case 'violation_count':
        return 'Total Violations'
      case 'critical_violations':
        return 'Critical Violations'
      case 'quality_score':
        return 'Quality Score'
      default:
        return metric.replace(/_/g, ' ')
    }
  }

  if (trends.length === 0) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography variant="body1" color="text.secondary">
          Not enough data to show trends. Upload more files to see trend analysis.
        </Typography>
      </Paper>
    )
  }

  return (
    <Box>
      {trends.map((trend) => (
        <Paper key={trend.trend_id} sx={{ p: 3, mb: 2 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Box display="flex" alignItems="center" gap={1}>
              {getTrendIcon(trend.direction)}
              <Typography variant="h6">{getMetricLabel(trend.metric)}</Typography>
            </Box>
            <Chip
              label={`${trend.direction.toUpperCase()}`}
              size="small"
              color={getTrendColor(trend.metric, trend.direction)}
            />
          </Box>

          <Box display="flex" alignItems="baseline" gap={1} mb={2}>
            <Typography variant="h3" fontWeight="bold">
              {trend.change_percentage > 0 ? '+' : ''}
              {trend.change_percentage.toFixed(1)}%
            </Typography>
            <Typography variant="body2" color="text.secondary">
              over {trend.time_period_days} days
            </Typography>
          </Box>

          <Box
            sx={{
              display: 'flex',
              alignItems: 'flex-end',
              gap: 0.5,
              height: 60,
              mt: 2
            }}
          >
            {trend.data_points.map((point, index) => {
              const maxValue = Math.max(...trend.data_points.map(p => p.value))
              const height = maxValue > 0 ? (point.value / maxValue) * 100 : 0

              return (
                <Box
                  key={index}
                  sx={{
                    flex: 1,
                    height: `${height}%`,
                    bgcolor: getTrendColor(trend.metric, trend.direction) + '.main',
                    borderRadius: 0.5,
                    minHeight: 4,
                    opacity: 0.7 + (index / trend.data_points.length) * 0.3
                  }}
                  title={`${new Date(point.timestamp).toLocaleDateString()}: ${point.value}`}
                />
              )
            })}
          </Box>

          <Typography variant="caption" color="text.secondary" display="block" mt={1}>
            Based on {trend.data_points.length} data points
          </Typography>
        </Paper>
      ))}
    </Box>
  )
}

export default TrendsChart

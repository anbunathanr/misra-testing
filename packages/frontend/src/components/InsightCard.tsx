import {
  Card,
  CardContent,
  Typography,
  Chip,
  Box,
  LinearProgress
} from '@mui/material'
import {
  Info as InfoIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  CheckCircle as CheckIcon,
  TrendingUp as TrendIcon
} from '@mui/icons-material'
import { Insight } from '../store/api/insightsApi'

interface InsightCardProps {
  insight: Insight
}

function InsightCard({ insight }: InsightCardProps) {
  const getSeverityColor = (severity: string): 'default' | 'info' | 'warning' | 'error' | 'success' => {
    switch (severity) {
      case 'critical':
        return 'error'
      case 'high':
        return 'error'
      case 'medium':
        return 'warning'
      case 'low':
        return 'info'
      case 'info':
        return 'success'
      default:
        return 'default'
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'high':
        return <ErrorIcon />
      case 'medium':
        return <WarningIcon />
      case 'low':
        return <InfoIcon />
      case 'info':
        return <CheckIcon />
      default:
        return <InfoIcon />
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'trend':
        return <TrendIcon />
      default:
        return null
    }
  }

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
          <Box display="flex" alignItems="center" gap={1}>
            {getSeverityIcon(insight.severity)}
            <Typography variant="h6" component="div">
              {insight.title}
            </Typography>
          </Box>
          <Box display="flex" gap={1}>
            {getTypeIcon(insight.type)}
            <Chip
              label={insight.severity.toUpperCase()}
              size="small"
              color={getSeverityColor(insight.severity)}
            />
          </Box>
        </Box>

        <Typography variant="body2" color="text.secondary" paragraph>
          {insight.description}
        </Typography>

        <Box
          sx={{
            p: 2,
            bgcolor: 'primary.50',
            borderRadius: 1,
            borderLeft: 3,
            borderColor: 'primary.main',
            mb: 2
          }}
        >
          <Typography variant="body2" fontWeight="bold" gutterBottom>
            Recommendation:
          </Typography>
          <Typography variant="body2">{insight.recommendation}</Typography>
        </Box>

        <Box>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
            <Typography variant="caption" color="text.secondary">
              Confidence Score
            </Typography>
            <Typography variant="caption" fontWeight="bold">
              {insight.confidence_score}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={insight.confidence_score}
            sx={{ height: 6, borderRadius: 3 }}
          />
        </Box>

        <Box display="flex" gap={1} mt={2}>
          <Chip
            label={insight.category.replace(/_/g, ' ')}
            size="small"
            variant="outlined"
          />
          <Chip
            label={`${insight.data_points} analyses`}
            size="small"
            variant="outlined"
          />
        </Box>
      </CardContent>
    </Card>
  )
}

export default InsightCard

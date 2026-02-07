import { Box, Paper, Typography, Grid, CircularProgress, Alert } from '@mui/material'
import {
  Assessment as AssessmentIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Warning as WarningIcon
} from '@mui/icons-material'
import { useGetUserStatsQuery } from '../store/api/analysisApi'

interface AnalysisStatsProps {
  userId: string
}

function AnalysisStats({ userId }: AnalysisStatsProps) {
  const { data: stats, isLoading, error } = useGetUserStatsQuery(userId)

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    )
  }

  if (error || !stats) {
    return <Alert severity="error">Failed to load statistics</Alert>
  }

  const successRate = stats.totalAnalyses > 0
    ? ((stats.successfulAnalyses / stats.totalAnalyses) * 100).toFixed(1)
    : '0'

  const statCards = [
    {
      title: 'Total Analyses',
      value: stats.totalAnalyses,
      icon: <AssessmentIcon sx={{ fontSize: 40 }} />,
      color: '#1976d2'
    },
    {
      title: 'Successful',
      value: stats.successfulAnalyses,
      icon: <SuccessIcon sx={{ fontSize: 40 }} />,
      color: '#2e7d32'
    },
    {
      title: 'Failed',
      value: stats.failedAnalyses,
      icon: <ErrorIcon sx={{ fontSize: 40 }} />,
      color: '#d32f2f'
    },
    {
      title: 'Total Violations',
      value: stats.totalViolations,
      icon: <WarningIcon sx={{ fontSize: 40 }} />,
      color: '#ed6c02'
    }
  ]

  return (
    <Box>
      <Grid container spacing={3}>
        {statCards.map((card, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Paper
              sx={{
                p: 3,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                height: '100%'
              }}
            >
              <Box sx={{ color: card.color, mb: 1 }}>
                {card.icon}
              </Box>
              <Typography variant="h4" fontWeight="bold" gutterBottom>
                {card.value}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {card.title}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3} mt={1}>
        <Grid item xs={12} sm={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Success Rate
            </Typography>
            <Typography variant="h3" fontWeight="bold" color="primary">
              {successRate}%
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Avg Violations per File
            </Typography>
            <Typography variant="h3" fontWeight="bold" color="warning.main">
              {stats.averageViolationsPerFile.toFixed(1)}
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}

export default AnalysisStats

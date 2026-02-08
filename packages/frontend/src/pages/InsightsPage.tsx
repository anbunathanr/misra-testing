import { useState } from 'react'
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Grid,
  Paper,
  CircularProgress,
  Alert,
  TextField,
  MenuItem,
  Button
} from '@mui/material'
import { Refresh as RefreshIcon } from '@mui/icons-material'
import { useSelector } from 'react-redux'
import { RootState } from '../store'
import { useGenerateInsightsQuery } from '../store/api/insightsApi'
import InsightCard from '../components/InsightCard'
import RecommendationsList from '../components/RecommendationsList'
import TrendsChart from '../components/TrendsChart'
import PatternsList from '../components/PatternsList'

function InsightsPage() {
  const [activeTab, setActiveTab] = useState(0)
  const [timeRange, setTimeRange] = useState(30)
  const user = useSelector((state: RootState) => state.auth.user)

  const { data: insights, isLoading, error, refetch } = useGenerateInsightsQuery(
    {
      user_id: user?.userId || '',
      time_range_days: timeRange,
      include_baseline: true
    },
    {
      skip: !user
    }
  )

  if (!user) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          AI Insights
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Please log in to view AI-powered insights.
        </Typography>
      </Box>
    )
  }

  if (isLoading) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight="400px">
        <CircularProgress size={60} />
        <Typography variant="body1" color="text.secondary" mt={2}>
          Generating insights...
        </Typography>
      </Box>
    )
  }

  if (error) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          AI Insights
        </Typography>
        <Alert severity="error">Failed to load insights. Please try again later.</Alert>
      </Box>
    )
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" gutterBottom>
            AI Insights
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Get intelligent recommendations and trend analysis powered by AI
          </Typography>
        </Box>
        <Box display="flex" gap={2} alignItems="center">
          <TextField
            select
            size="small"
            label="Time Range"
            value={timeRange}
            onChange={(e) => setTimeRange(Number(e.target.value))}
            sx={{ minWidth: 150 }}
          >
            <MenuItem value={7}>Last 7 days</MenuItem>
            <MenuItem value={30}>Last 30 days</MenuItem>
            <MenuItem value={90}>Last 90 days</MenuItem>
          </TextField>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => refetch()}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {insights && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <Typography variant="body2" color="text.secondary">
                Total Analyses
              </Typography>
              <Typography variant="h5" fontWeight="bold">
                {insights.metadata.total_analyses}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Typography variant="body2" color="text.secondary">
                Confidence Level
              </Typography>
              <Typography variant="h5" fontWeight="bold" textTransform="capitalize">
                {insights.metadata.confidence_level}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Typography variant="body2" color="text.secondary">
                Time Range
              </Typography>
              <Typography variant="h5" fontWeight="bold">
                {insights.metadata.time_range_days} days
              </Typography>
            </Grid>
          </Grid>
        </Paper>
      )}

      <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)} sx={{ mb: 3 }}>
        <Tab label={`Insights (${insights?.insights.length || 0})`} />
        <Tab label={`Recommendations (${insights?.recommendations.length || 0})`} />
        <Tab label={`Trends (${insights?.trends.length || 0})`} />
        <Tab label={`Patterns (${insights?.patterns.length || 0})`} />
      </Tabs>

      {activeTab === 0 && insights && (
        <Grid container spacing={3}>
          {insights.insights.length === 0 ? (
            <Grid item xs={12}>
              <Alert severity="info">
                No insights available yet. Upload and analyze more files to receive personalized insights.
              </Alert>
            </Grid>
          ) : (
            insights.insights.map((insight) => (
              <Grid item xs={12} md={6} key={insight.insight_id}>
                <InsightCard insight={insight} />
              </Grid>
            ))
          )}
        </Grid>
      )}

      {activeTab === 1 && insights && (
        <RecommendationsList recommendations={insights.recommendations} />
      )}

      {activeTab === 2 && insights && (
        <TrendsChart trends={insights.trends} />
      )}

      {activeTab === 3 && insights && (
        <PatternsList patterns={insights.patterns} />
      )}
    </Box>
  )
}

export default InsightsPage

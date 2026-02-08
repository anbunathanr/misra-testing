import {
  Box,
  Paper,
  Typography,
  Chip,
  List,
  ListItem,
  ListItemText,
  Divider
} from '@mui/material'
import {
  TrendingUp as ImprovingIcon,
  TrendingDown as DegradingIcon,
  TrendingFlat as StableIcon
} from '@mui/icons-material'
import { PatternDetection } from '../store/api/insightsApi'

interface PatternsListProps {
  patterns: PatternDetection[]
}

function PatternsList({ patterns }: PatternsListProps) {
  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return <ImprovingIcon color="success" />
      case 'degrading':
        return <DegradingIcon color="error" />
      case 'stable':
        return <StableIcon color="info" />
      default:
        return <StableIcon />
    }
  }

  const getTrendColor = (trend: string): 'success' | 'error' | 'info' => {
    switch (trend) {
      case 'improving':
        return 'success'
      case 'degrading':
        return 'error'
      case 'stable':
        return 'info'
      default:
        return 'info'
    }
  }

  if (patterns.length === 0) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography variant="body1" color="text.secondary">
          No recurring patterns detected yet. Continue analyzing files to identify patterns.
        </Typography>
      </Paper>
    )
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Detected Patterns
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Recurring violation patterns across your codebase
      </Typography>

      <List>
        {patterns.map((pattern, index) => (
          <Box key={pattern.pattern_id}>
            <ListItem alignItems="flex-start" sx={{ px: 0 }}>
              <ListItemText
                primary={
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    {getTrendIcon(pattern.severity_trend)}
                    <Typography variant="subtitle1" fontWeight="bold">
                      {pattern.pattern_type.replace(/_/g, ' ')}
                    </Typography>
                    <Chip
                      label={pattern.severity_trend}
                      size="small"
                      color={getTrendColor(pattern.severity_trend)}
                    />
                  </Box>
                }
                secondary={
                  <Box>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      Detected {pattern.frequency} times across {pattern.affected_files.length} files
                    </Typography>
                    <Box display="flex" gap={1}>
                      <Chip
                        label={`Frequency: ${pattern.frequency}`}
                        size="small"
                        variant="outlined"
                      />
                      <Chip
                        label={`${pattern.affected_files.length} files`}
                        size="small"
                        variant="outlined"
                      />
                      <Chip
                        label={`First seen: ${new Date(pattern.first_seen).toLocaleDateString()}`}
                        size="small"
                        variant="outlined"
                      />
                    </Box>
                  </Box>
                }
              />
            </ListItem>
            {index < patterns.length - 1 && <Divider />}
          </Box>
        ))}
      </List>
    </Paper>
  )
}

export default PatternsList

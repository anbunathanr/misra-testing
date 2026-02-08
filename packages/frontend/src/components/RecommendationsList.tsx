import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  Chip,
  Link,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material'
import {
  ExpandMore as ExpandIcon,
  PriorityHigh as PriorityIcon,
  TrendingUp as ImpactIcon,
  Build as EffortIcon
} from '@mui/icons-material'
import { RecommendationAction } from '../store/api/insightsApi'

interface RecommendationsListProps {
  recommendations: RecommendationAction[]
}

function RecommendationsList({ recommendations }: RecommendationsListProps) {
  const sortedRecommendations = [...recommendations].sort((a, b) => a.priority - b.priority)

  const getPriorityColor = (priority: number): 'error' | 'warning' | 'info' | 'success' => {
    if (priority === 1) return 'error'
    if (priority === 2) return 'warning'
    if (priority === 3) return 'info'
    return 'success'
  }

  const getPriorityLabel = (priority: number): string => {
    if (priority === 1) return 'Critical'
    if (priority === 2) return 'High'
    if (priority === 3) return 'Medium'
    if (priority === 4) return 'Low'
    return 'Optional'
  }

  const getImpactColor = (impact: string): 'error' | 'warning' | 'info' => {
    if (impact === 'high') return 'error'
    if (impact === 'medium') return 'warning'
    return 'info'
  }

  const getEffortColor = (effort: string): 'error' | 'warning' | 'success' => {
    if (effort === 'high') return 'error'
    if (effort === 'medium') return 'warning'
    return 'success'
  }

  if (recommendations.length === 0) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography variant="body1" color="text.secondary">
          No recommendations available at this time.
        </Typography>
      </Paper>
    )
  }

  return (
    <Box>
      {sortedRecommendations.map((recommendation, index) => (
        <Accordion key={recommendation.action_id} defaultExpanded={index === 0}>
          <AccordionSummary expandIcon={<ExpandIcon />}>
            <Box display="flex" alignItems="center" gap={2} width="100%">
              <Chip
                icon={<PriorityIcon />}
                label={getPriorityLabel(recommendation.priority)}
                size="small"
                color={getPriorityColor(recommendation.priority)}
              />
              <Typography variant="subtitle1" fontWeight="bold">
                {recommendation.title}
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Box>
              <Typography variant="body2" paragraph>
                {recommendation.description}
              </Typography>

              <Box display="flex" gap={1} mb={2}>
                <Chip
                  icon={<ImpactIcon />}
                  label={`${recommendation.estimated_impact} impact`}
                  size="small"
                  color={getImpactColor(recommendation.estimated_impact)}
                  variant="outlined"
                />
                <Chip
                  icon={<EffortIcon />}
                  label={`${recommendation.effort_level} effort`}
                  size="small"
                  color={getEffortColor(recommendation.effort_level)}
                  variant="outlined"
                />
              </Box>

              {recommendation.resources.length > 0 && (
                <Box>
                  <Typography variant="body2" fontWeight="bold" gutterBottom>
                    Resources:
                  </Typography>
                  <List dense>
                    {recommendation.resources.map((resource, idx) => (
                      <ListItem key={idx} sx={{ py: 0 }}>
                        <ListItemText
                          primary={
                            <Link
                              href={resource}
                              target="_blank"
                              rel="noopener noreferrer"
                              underline="hover"
                            >
                              {resource}
                            </Link>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}
            </Box>
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  )
}

export default RecommendationsList

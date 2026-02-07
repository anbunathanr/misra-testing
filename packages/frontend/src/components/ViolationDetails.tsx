import {
  Box,
  Paper,
  Typography,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Grid
} from '@mui/material'
import { Error as ErrorIcon, Warning as WarningIcon, Info as InfoIcon } from '@mui/icons-material'
import { useGetAnalysisByIdQuery } from '../store/api/analysisApi'

interface ViolationDetailsProps {
  analysisId: string
}

function ViolationDetails({ analysisId }: ViolationDetailsProps) {
  const { data: analysis, isLoading, error } = useGetAnalysisByIdQuery(analysisId)

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    )
  }

  if (error || !analysis) {
    return <Alert severity="error">Failed to load analysis details</Alert>
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'mandatory':
        return <ErrorIcon color="error" />
      case 'required':
        return <WarningIcon color="warning" />
      case 'advisory':
        return <InfoIcon color="info" />
      default:
        return null
    }
  }

  const getSeverityColor = (severity: string): 'error' | 'warning' | 'info' => {
    switch (severity) {
      case 'mandatory':
        return 'error'
      case 'required':
        return 'warning'
      case 'advisory':
        return 'info'
      default:
        return 'info'
    }
  }

  const violationsBySeverity = {
    mandatory: analysis.violations.filter(v => v.severity === 'mandatory'),
    required: analysis.violations.filter(v => v.severity === 'required'),
    advisory: analysis.violations.filter(v => v.severity === 'advisory')
  }

  return (
    <Box>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          Analysis Details
        </Typography>
        <Grid container spacing={2} mt={1}>
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="body2" color="text.secondary">
              File Name
            </Typography>
            <Typography variant="body1" fontWeight="bold">
              {analysis.fileName}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="body2" color="text.secondary">
              Rule Set
            </Typography>
            <Typography variant="body1" fontWeight="bold">
              {analysis.ruleSet.replace(/_/g, ' ')}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="body2" color="text.secondary">
              Total Violations
            </Typography>
            <Typography variant="body1" fontWeight="bold">
              {analysis.violationsCount}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="body2" color="text.secondary">
              Analysis Date
            </Typography>
            <Typography variant="body1" fontWeight="bold">
              {new Date(analysis.timestamp).toLocaleString()}
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1}>
                <ErrorIcon color="error" />
                <Typography variant="h6">Mandatory</Typography>
              </Box>
              <Typography variant="h4" mt={1}>
                {violationsBySeverity.mandatory.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1}>
                <WarningIcon color="warning" />
                <Typography variant="h6">Required</Typography>
              </Box>
              <Typography variant="h4" mt={1}>
                {violationsBySeverity.required.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1}>
                <InfoIcon color="info" />
                <Typography variant="h6">Advisory</Typography>
              </Box>
              <Typography variant="h4" mt={1}>
                {violationsBySeverity.advisory.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {analysis.violationsCount === 0 ? (
        <Alert severity="success">
          No violations found! This file is compliant with {analysis.ruleSet.replace(/_/g, ' ')}.
        </Alert>
      ) : (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Violations
          </Typography>
          <List>
            {analysis.violations.map((violation, index) => (
              <Box key={index}>
                <ListItem alignItems="flex-start" sx={{ flexDirection: 'column', gap: 1 }}>
                  <Box display="flex" alignItems="center" gap={1} width="100%">
                    {getSeverityIcon(violation.severity)}
                    <Chip
                      label={violation.ruleId}
                      size="small"
                      color={getSeverityColor(violation.severity)}
                    />
                    <Chip
                      label={`Line ${violation.lineNumber}`}
                      size="small"
                      variant="outlined"
                    />
                    <Chip
                      label={violation.severity}
                      size="small"
                      variant="outlined"
                    />
                  </Box>
                  <ListItemText
                    primary={violation.message}
                    secondary={
                      <>
                        {violation.codeSnippet && (
                          <Box
                            component="pre"
                            sx={{
                              mt: 1,
                              p: 1,
                              bgcolor: 'grey.100',
                              borderRadius: 1,
                              overflow: 'auto',
                              fontSize: '0.875rem',
                              fontFamily: 'monospace'
                            }}
                          >
                            {violation.codeSnippet}
                          </Box>
                        )}
                        {violation.recommendation && (
                          <Alert severity="info" sx={{ mt: 1 }}>
                            <Typography variant="body2" fontWeight="bold">
                              Recommendation:
                            </Typography>
                            <Typography variant="body2">
                              {violation.recommendation}
                            </Typography>
                          </Alert>
                        )}
                      </>
                    }
                  />
                </ListItem>
                {index < analysis.violations.length - 1 && <Divider />}
              </Box>
            ))}
          </List>
        </Paper>
      )}
    </Box>
  )
}

export default ViolationDetails

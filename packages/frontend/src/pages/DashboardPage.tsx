import { 
  Box, 
  Typography, 
  Grid, 
  Card, 
  CardContent, 
  Button,
  Paper,
  LinearProgress,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Divider
} from '@mui/material'
import FolderIcon from '@mui/icons-material/Folder'
import AssessmentIcon from '@mui/icons-material/Assessment'
import WarningIcon from '@mui/icons-material/Warning'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import SpeedIcon from '@mui/icons-material/Speed'
import SecurityIcon from '@mui/icons-material/Security'
import { useNavigate } from 'react-router-dom'

function DashboardPage() {
  const navigate = useNavigate();

  const stats = [
    {
      title: 'Files Analyzed',
      value: '0',
      icon: <FolderIcon />,
      color: 'primary',
      change: '+0%'
    },
    {
      title: 'Analyses Complete',
      value: '0',
      icon: <AssessmentIcon />,
      color: 'info',
      change: '+0%'
    },
    {
      title: 'Violations Found',
      value: '0',
      icon: <WarningIcon />,
      color: 'warning',
      change: '0%'
    },
    {
      title: 'Compliance Score',
      value: '--',
      icon: <CheckCircleIcon />,
      color: 'success',
      change: '--'
    }
  ];

  const recentActivity = [
    {
      title: 'Welcome to MISRA Platform',
      subtitle: 'Get started with automated analysis',
      time: 'Just now',
      type: 'info'
    }
  ];

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
          Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Welcome to the MISRA Compliance Platform. Monitor your code quality and compliance in real-time.
        </Typography>
      </Box>

      {/* Quick Actions */}
      <Paper sx={{ p: 3, mb: 4, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              🚀 Ready to analyze your code?
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              Start with our Fire & Forget workflow for instant MISRA compliance analysis
            </Typography>
          </Box>
          <Button
            variant="contained"
            size="large"
            startIcon={<RocketLaunchIcon />}
            onClick={() => navigate('/fire-and-forget')}
            sx={{
              backgroundColor: 'rgba(255,255,255,0.2)',
              color: 'white',
              '&:hover': {
                backgroundColor: 'rgba(255,255,255,0.3)',
                transform: 'translateY(-2px)'
              }
            }}
          >
            Start Fire & Forget
          </Button>
        </Box>
      </Paper>

      {/* Stats Grid */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {stats.map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Avatar sx={{ bgcolor: `${stat.color}.main`, width: 48, height: 48 }}>
                    {stat.icon}
                  </Avatar>
                  <Chip 
                    label={stat.change} 
                    size="small" 
                    color={stat.change.includes('+') ? 'success' : 'default'}
                  />
                </Box>
                <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
                  {stat.value}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {stat.title}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        {/* Features Overview */}
        <Grid item xs={12} md={8}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Platform Features
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', p: 2, borderRadius: 1, backgroundColor: 'grey.50' }}>
                    <SpeedIcon color="primary" sx={{ mr: 2 }} />
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        60-Second Analysis
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Lightning-fast MISRA compliance checking
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', p: 2, borderRadius: 1, backgroundColor: 'grey.50' }}>
                    <SecurityIcon color="success" sx={{ mr: 2 }} />
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        Production AWS
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Real CloudWatch logs and metrics
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', p: 2, borderRadius: 1, backgroundColor: 'grey.50' }}>
                    <RocketLaunchIcon color="warning" sx={{ mr: 2 }} />
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        Fully Automated
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Zero manual intervention required
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', p: 2, borderRadius: 1, backgroundColor: 'grey.50' }}>
                    <TrendingUpIcon color="info" sx={{ mr: 2 }} />
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        Professional Reports
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Detailed compliance analysis
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Activity */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Recent Activity
              </Typography>
              <List>
                {recentActivity.map((activity, index) => (
                  <Box key={index}>
                    <ListItem sx={{ px: 0 }}>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
                          <AssessmentIcon fontSize="small" />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={activity.title}
                        secondary={
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              {activity.subtitle}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {activity.time}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                    {index < recentActivity.length - 1 && <Divider />}
                  </Box>
                ))}
              </List>
              
              {/* Getting Started */}
              <Box sx={{ mt: 3, p: 2, backgroundColor: 'primary.main', color: 'white', borderRadius: 1 }}>
                <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                  Getting Started
                </Typography>
                <Typography variant="body2" sx={{ mb: 2, opacity: 0.9 }}>
                  Try the Fire & Forget workflow to see the platform in action
                </Typography>
                <Button
                  variant="contained"
                  size="small"
                  onClick={() => navigate('/fire-and-forget')}
                  sx={{
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    color: 'white',
                    '&:hover': {
                      backgroundColor: 'rgba(255,255,255,0.3)'
                    }
                  }}
                >
                  Start Now
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}

export default DashboardPage

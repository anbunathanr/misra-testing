import { Box, Typography, Paper, Grid, Chip, Divider, Avatar } from '@mui/material'
import { useSelector } from 'react-redux'
import { RootState } from '../store'
import {
  Person as PersonIcon,
  Email as EmailIcon,
  Business as BusinessIcon,
  Badge as BadgeIcon
} from '@mui/icons-material'

function ProfilePage() {
  const user = useSelector((state: RootState) => state.auth.user)

  if (!user) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          User Profile
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Please log in to view your profile.
        </Typography>
      </Box>
    )
  }

  const getRoleColor = (role: string): 'error' | 'warning' | 'success' => {
    switch (role.toLowerCase()) {
      case 'admin':
        return 'error'
      case 'developer':
        return 'warning'
      case 'viewer':
        return 'success'
      default:
        return 'success'
    }
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        User Profile
      </Typography>
      <Typography variant="body1" color="text.secondary" mb={3}>
        Manage your account settings and preferences
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Avatar
              sx={{
                width: 120,
                height: 120,
                margin: '0 auto',
                bgcolor: 'primary.main',
                fontSize: '3rem'
              }}
            >
              {user.name.charAt(0).toUpperCase()}
            </Avatar>
            <Typography variant="h5" mt={2} fontWeight="bold">
              {user.name}
            </Typography>
            <Chip
              label={user.role.toUpperCase()}
              color={getRoleColor(user.role)}
              size="small"
              sx={{ mt: 1 }}
            />
          </Paper>
        </Grid>

        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Account Information
            </Typography>
            <Divider sx={{ mb: 3 }} />

            <Box mb={3}>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <PersonIcon color="action" />
                <Typography variant="body2" color="text.secondary">
                  User ID
                </Typography>
              </Box>
              <Typography variant="body1" fontWeight="bold">
                {user.userId}
              </Typography>
            </Box>

            <Box mb={3}>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <EmailIcon color="action" />
                <Typography variant="body2" color="text.secondary">
                  Email Address
                </Typography>
              </Box>
              <Typography variant="body1" fontWeight="bold">
                {user.email}
              </Typography>
            </Box>

            <Box mb={3}>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <BadgeIcon color="action" />
                <Typography variant="body2" color="text.secondary">
                  Role
                </Typography>
              </Box>
              <Typography variant="body1" fontWeight="bold" textTransform="capitalize">
                {user.role}
              </Typography>
            </Box>

            {user.organizationId && (
              <Box mb={3}>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <BusinessIcon color="action" />
                  <Typography variant="body2" color="text.secondary">
                    Organization ID
                  </Typography>
                </Box>
                <Typography variant="body1" fontWeight="bold">
                  {user.organizationId}
                </Typography>
              </Box>
            )}
          </Paper>

          <Paper sx={{ p: 3, mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              Role Permissions
            </Typography>
            <Divider sx={{ mb: 2 }} />

            {user.role === 'admin' && (
              <Box>
                <Typography variant="body2" paragraph>
                  As an <strong>Admin</strong>, you have full access to:
                </Typography>
                <ul>
                  <li>
                    <Typography variant="body2">Upload and analyze files</Typography>
                  </li>
                  <li>
                    <Typography variant="body2">View all analysis results</Typography>
                  </li>
                  <li>
                    <Typography variant="body2">Access AI insights and recommendations</Typography>
                  </li>
                  <li>
                    <Typography variant="body2">Manage users and organization settings</Typography>
                  </li>
                  <li>
                    <Typography variant="body2">Export reports and data</Typography>
                  </li>
                </ul>
              </Box>
            )}

            {user.role === 'developer' && (
              <Box>
                <Typography variant="body2" paragraph>
                  As a <strong>Developer</strong>, you can:
                </Typography>
                <ul>
                  <li>
                    <Typography variant="body2">Upload and analyze files</Typography>
                  </li>
                  <li>
                    <Typography variant="body2">View your analysis results</Typography>
                  </li>
                  <li>
                    <Typography variant="body2">Access AI insights and recommendations</Typography>
                  </li>
                  <li>
                    <Typography variant="body2">Export your reports</Typography>
                  </li>
                </ul>
              </Box>
            )}

            {user.role === 'viewer' && (
              <Box>
                <Typography variant="body2" paragraph>
                  As a <strong>Viewer</strong>, you can:
                </Typography>
                <ul>
                  <li>
                    <Typography variant="body2">View analysis results</Typography>
                  </li>
                  <li>
                    <Typography variant="body2">Access AI insights</Typography>
                  </li>
                  <li>
                    <Typography variant="body2">View reports (read-only)</Typography>
                  </li>
                </ul>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}

export default ProfilePage

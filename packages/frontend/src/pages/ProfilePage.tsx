import { Box, Typography, Card, CardContent } from '@mui/material'
import { useSelector } from 'react-redux'
import type { RootState } from '../store/index.ts'

function ProfilePage() {
  const user = useSelector((state: RootState) => state.auth.user)

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Profile
      </Typography>
      <Card sx={{ maxWidth: 600, mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            User Information
          </Typography>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Name
            </Typography>
            <Typography variant="body1" gutterBottom>
              {user?.name || 'N/A'}
            </Typography>

            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Email
            </Typography>
            <Typography variant="body1" gutterBottom>
              {user?.email || 'N/A'}
            </Typography>

            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Role
            </Typography>
            <Typography variant="body1" gutterBottom>
              {user?.role || 'N/A'}
            </Typography>

            {user?.organizationId && (
              <>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  Organization ID
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {user.organizationId}
                </Typography>
              </>
            )}
          </Box>
        </CardContent>
      </Card>
    </Box>
  )
}

export default ProfilePage

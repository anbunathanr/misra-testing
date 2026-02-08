import { Navigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Alert, Box } from '@mui/material'
import type { RootState } from '../store'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: string[]
}

function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth)

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // Check role-based access if required
  if (requiredRole && user) {
    const hasRequiredRole = requiredRole.includes(user.role)
    
    if (!hasRequiredRole) {
      return (
        <Box p={3}>
          <Alert severity="error">
            Access Denied: You don't have permission to access this page.
            Required role: {requiredRole.join(' or ')}
          </Alert>
        </Box>
      )
    }
  }

  return <>{children}</>
}

export default ProtectedRoute

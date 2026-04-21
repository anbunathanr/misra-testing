import {
  Drawer,
  Box,
  Toolbar,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Typography,
  Switch,
  FormControlLabel,
  Chip,
  Avatar
} from '@mui/material'
import DashboardIcon from '@mui/icons-material/Dashboard'
import FolderIcon from '@mui/icons-material/Folder'
import AssessmentIcon from '@mui/icons-material/Assessment'
import LightbulbIcon from '@mui/icons-material/Lightbulb'
import WorkIcon from '@mui/icons-material/Work'
import LogoutIcon from '@mui/icons-material/Logout'
import CodeIcon from '@mui/icons-material/Code'
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch'
import TerminalIcon from '@mui/icons-material/Terminal'
import VisibilityIcon from '@mui/icons-material/Visibility'
import { useNavigate, useLocation } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { logoutUser } from '../store/slices/authSlice.ts'
import type { AppDispatch } from '../store/index'

interface SidebarProps {
  drawerWidth: number
  mobileOpen: boolean
  onDrawerToggle: () => void
  demoMode?: boolean
  onDemoModeToggle?: (enabled: boolean) => void
}

const menuItems = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
  { text: 'Fire & Forget', icon: <RocketLaunchIcon />, path: '/fire-and-forget', highlight: true },
  { text: 'Projects', icon: <WorkIcon />, path: '/projects' },
  { text: 'Files', icon: <FolderIcon />, path: '/files' },
  { text: 'Analysis', icon: <AssessmentIcon />, path: '/analysis' },
  { text: 'MISRA Analysis', icon: <CodeIcon />, path: '/misra-analysis' },
  { text: 'Insights', icon: <LightbulbIcon />, path: '/insights' },
  { text: 'Terminal', icon: <TerminalIcon />, path: '/terminal' },
  { text: 'Results Viewer', icon: <VisibilityIcon />, path: '/results' }
]

function Sidebar({ drawerWidth, mobileOpen, onDrawerToggle, demoMode = false, onDemoModeToggle }: SidebarProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const dispatch = useDispatch<AppDispatch>()

  const handleLogout = () => {
    dispatch(logoutUser())
    navigate('/login')
  }

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Toolbar>
        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
          <Avatar
            sx={{ 
              mr: 2, 
              bgcolor: 'primary.main',
              width: 40,
              height: 40
            }}
          >
            <CodeIcon />
          </Avatar>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.1rem', lineHeight: 1.2 }}>
              MISRA Platform
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
              Professional SaaS
            </Typography>
          </Box>
        </Box>
      </Toolbar>
      
      <Divider />

      {/* Demo Mode Toggle */}
      {onDemoModeToggle && (
        <Box sx={{ p: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={demoMode}
                onChange={(e) => onDemoModeToggle(e.target.checked)}
                size="small"
              />
            }
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2">Demo Mode</Typography>
                {demoMode && <Chip label="ON" color="warning" size="small" />}
              </Box>
            }
          />
        </Box>
      )}

      <Divider />

      {/* Navigation Menu */}
      <List sx={{ flexGrow: 1, py: 1 }}>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => {
                navigate(item.path)
                if (mobileOpen) onDrawerToggle()
              }}
              sx={{
                mx: 1,
                borderRadius: 1,
                mb: 0.5,
                ...(item.highlight && {
                  backgroundColor: 'primary.main',
                  color: 'primary.contrastText',
                  '&:hover': {
                    backgroundColor: 'primary.dark',
                  },
                  '&.Mui-selected': {
                    backgroundColor: 'primary.dark',
                    '&:hover': {
                      backgroundColor: 'primary.dark',
                    }
                  }
                })
              }}
            >
              <ListItemIcon sx={{ 
                color: item.highlight ? 'inherit' : 'inherit',
                minWidth: 40
              }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText 
                primary={item.text}
                primaryTypographyProps={{
                  fontSize: '0.875rem',
                  fontWeight: item.highlight ? 600 : 500
                }}
              />
              {item.highlight && (
                <Chip 
                  label="NEW" 
                  size="small" 
                  sx={{ 
                    height: 20, 
                    fontSize: '0.6rem',
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    color: 'inherit'
                  }} 
                />
              )}
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      {/* User Section */}
      <Divider />
      <List>
        <ListItem disablePadding>
          <ListItemButton 
            onClick={handleLogout}
            sx={{ mx: 1, borderRadius: 1, mb: 1 }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>
              <LogoutIcon />
            </ListItemIcon>
            <ListItemText 
              primary="Logout"
              primaryTypographyProps={{
                fontSize: '0.875rem',
                fontWeight: 500
              }}
            />
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  )

  return (
    <Box
      component="nav"
      sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
    >
      {/* Mobile drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onDrawerToggle}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', sm: 'none' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth }
        }}
      >
        {drawer}
      </Drawer>
      {/* Desktop drawer */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', sm: 'block' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth }
        }}
        open
      >
        {drawer}
      </Drawer>
    </Box>
  )
}

export default Sidebar

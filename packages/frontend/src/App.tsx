import { Routes, Route, Navigate } from 'react-router-dom'
import { Box } from '@mui/material'
import Layout from './components/Layout.tsx'
import ProtectedRoute from './components/ProtectedRoute.tsx'
import LoginPage from './pages/LoginPage.tsx'
import DashboardPage from './pages/DashboardPage.tsx'
import FilesPage from './pages/FilesPage.tsx'
import AnalysisPage from './pages/AnalysisPage.tsx'
import InsightsPage from './pages/InsightsPage.tsx'
import ProfilePage from './pages/ProfilePage.tsx'
import { ProjectsPage } from './pages/ProjectsPage.tsx'
import { TestSuitesPage } from './pages/TestSuitesPage.tsx'
import { TestCasesPage } from './pages/TestCasesPage.tsx'
import { TestExecutionsPage } from './pages/TestExecutionsPage.tsx'

function App() {
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="files" element={<FilesPage />} />
          <Route path="analysis" element={<AnalysisPage />} />
          <Route path="insights" element={<InsightsPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="projects/:projectId" element={<TestSuitesPage />} />
          <Route path="projects/:projectId/suites/:suiteId" element={<TestCasesPage />} />
          <Route path="projects/:projectId/executions" element={<TestExecutionsPage />} />
        </Route>

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Box>
  )
}

export default App

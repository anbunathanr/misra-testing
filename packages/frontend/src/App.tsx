import { Routes, Route, Navigate } from 'react-router-dom';
import { Box } from '@mui/material';
import ErrorBoundary from './components/ErrorBoundary';
import AutomatedAnalysisPage from './pages/AutomatedAnalysisPage';
import DashboardLayout from './components/DashboardLayout';
import DashboardPage from './pages/DashboardPage';
import ProductionMISRAApp from './components/ProductionMISRAApp.tsx';

function App() {
  return (
    <ErrorBoundary
      showDetails={import.meta.env.DEV}
      onError={(error, errorInfo) => {
        console.error('App Error:', error, errorInfo);
        // In production, send to error reporting service
      }}
    >
      <Routes>
        {/* Main Automated Analysis Page - Single Page, No Sidebar */}
        <Route path="/" element={<AutomatedAnalysisPage />} />
        <Route path="/analysis" element={<AutomatedAnalysisPage />} />
        
        {/* Legacy routes with sidebar (for backward compatibility) */}
        <Route 
          path="/dashboard" 
          element={
            <DashboardLayout>
              <DashboardPage />
            </DashboardLayout>
          } 
        />
        <Route 
          path="/legacy" 
          element={
            <DashboardLayout>
              <ProductionMISRAApp />
            </DashboardLayout>
          } 
        />
        <Route 
          path="/projects" 
          element={
            <DashboardLayout>
              <Box sx={{ p: 3 }}>Projects page coming soon</Box>
            </DashboardLayout>
          } 
        />
        <Route 
          path="/files" 
          element={
            <DashboardLayout>
              <Box sx={{ p: 3 }}>Files page coming soon</Box>
            </DashboardLayout>
          } 
        />
        <Route 
          path="/insights" 
          element={
            <DashboardLayout>
              <Box sx={{ p: 3 }}>Insights page coming soon</Box>
            </DashboardLayout>
          } 
        />
        
        {/* Catch all - redirect to main page */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ErrorBoundary>
  );
}

export default App;

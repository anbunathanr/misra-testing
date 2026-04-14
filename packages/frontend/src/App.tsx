import { Routes, Route, Navigate } from 'react-router-dom';
import { Box } from '@mui/material';
import ProductionMISRAApp from './components/ProductionMISRAApp.tsx';
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary
      showDetails={import.meta.env.DEV}
      onError={(error, errorInfo) => {
        console.error('App Error:', error, errorInfo);
        // In production, send to error reporting service
      }}
    >
      <Box sx={{ display: 'flex', minHeight: '100vh' }}>
        <Routes>
          {/* Main production route - MISRA Compliance Platform */}
          <Route path="/" element={<ProductionMISRAApp />} />
          <Route path="/misra-compliance" element={<ProductionMISRAApp />} />
          
          {/* Catch all - redirect to main app */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Box>
    </ErrorBoundary>
  );
}

export default App;

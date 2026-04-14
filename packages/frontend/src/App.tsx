import { Routes, Route, Navigate } from 'react-router-dom';
import { Box } from '@mui/material';
import ProductionMISRAApp from './components/ProductionMISRAApp.tsx';

function App() {
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Routes>
        {/* Main production route - MISRA Compliance Platform */}
        <Route path="/" element={<ProductionMISRAApp />} />
        <Route path="/misra-compliance" element={<ProductionMISRAApp />} />
        
        {/* Catch all - redirect to main app */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Box>
  );
}

export default App;

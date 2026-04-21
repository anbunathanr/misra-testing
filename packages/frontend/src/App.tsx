import { Routes, Route, Navigate } from 'react-router-dom';
import { Box } from '@mui/material';
import { useState, useCallback } from 'react';
import DashboardLayout from './components/DashboardLayout';
import DashboardPage from './pages/DashboardPage';
import FireAndForgetInterface from './components/FireAndForgetInterface';
import RealTimeProgressDisplay from './components/RealTimeProgressDisplay';
import MultiPaneDashboard from './components/MultiPaneDashboard';
import ProductionMISRAApp from './components/ProductionMISRAApp.tsx';
import ErrorBoundary from './components/ErrorBoundary';
import { workflowAutomationService, WorkflowProgress, WorkflowResult } from './services/workflow-automation';

function App() {
  // Auto-detect demo mode based on mock backend setting
  const [demoMode, setDemoMode] = useState(import.meta.env.VITE_USE_MOCK_BACKEND === 'true');
  const [workflowRunning, setWorkflowRunning] = useState(false);
  const [workflowProgress, setWorkflowProgress] = useState<WorkflowProgress | null>(null);
  const [workflowError, setWorkflowError] = useState<string | null>(null);
  const [workflowResults, setWorkflowResults] = useState<WorkflowResult | null>(null);

  const handleStartWorkflow = useCallback(async (email: string, name?: string) => {
    console.log('Starting Fire & Forget workflow for:', email, name);
    
    setWorkflowRunning(true);
    setWorkflowError(null);
    setWorkflowResults(null);
    
    try {
      const result = await workflowAutomationService.startAutomatedWorkflow(
        {
          email,
          name,
          demoMode,
          fileSelectionCriteria: {
            targetCompliance: 'varied',
            demonstrationMode: 'comprehensive'
          }
        },
        (progress: WorkflowProgress) => {
          setWorkflowProgress(progress);
        }
      );

      if (result.success) {
        setWorkflowResults(result);
        console.log('Workflow completed successfully:', result);
      } else {
        setWorkflowError(result.error || 'Workflow failed');
        console.error('Workflow failed:', result.error);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setWorkflowError(errorMessage);
      console.error('Workflow error:', error);
    } finally {
      setWorkflowRunning(false);
    }
  }, [demoMode]);

  const handleRetryWorkflow = useCallback(() => {
    setWorkflowError(null);
    setWorkflowResults(null);
    setWorkflowProgress(null);
  }, []);

  return (
    <ErrorBoundary
      showDetails={import.meta.env.DEV}
      onError={(error, errorInfo) => {
        console.error('App Error:', error, errorInfo);
        // In production, send to error reporting service
      }}
    >
      <DashboardLayout 
        demoMode={demoMode} 
        onDemoModeToggle={setDemoMode}
      >
        <Routes>
          {/* Dashboard - Default route */}
          <Route path="/" element={<DashboardPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          
          {/* Fire & Forget Workflow */}
          <Route 
            path="/fire-and-forget" 
            element={
              <Box>
                <FireAndForgetInterface
                  onStartWorkflow={handleStartWorkflow}
                  isRunning={workflowRunning}
                  error={workflowError}
                  onRetry={handleRetryWorkflow}
                  demoMode={demoMode}
                />
                
                {/* Real-time Progress Display */}
                {workflowProgress && (
                  <RealTimeProgressDisplay
                    currentStep={workflowProgress.currentStep}
                    completedSteps={workflowProgress.completedSteps}
                    analysisProgress={workflowProgress.analysisProgress || 0}
                    isRunning={workflowProgress.isRunning}
                    visible={workflowRunning || workflowProgress.completedSteps.length > 0}
                    estimatedTimeRemaining={workflowProgress.estimatedTimeRemaining}
                    rulesProcessed={workflowProgress.rulesProcessed}
                    totalRules={workflowProgress.totalRules}
                  />
                )}

                {/* Results Display */}
                {workflowResults && workflowResults.success && (
                  <Box sx={{ mt: 3 }}>
                    <MultiPaneDashboard
                      resultsContent={
                        <Box sx={{ p: 2 }}>
                          <h3>Analysis Results</h3>
                          <p><strong>File:</strong> {workflowResults.selectedFile?.name}</p>
                          <p><strong>Compliance:</strong> {workflowResults.analysisResults?.compliancePercentage}%</p>
                          <p><strong>Violations:</strong> {workflowResults.analysisResults?.violations?.length || 0}</p>
                          <p><strong>Execution Time:</strong> {workflowResults.executionTime}ms</p>
                        </Box>
                      }
                      codeViewerContent={
                        <Box sx={{ p: 2 }}>
                          <h4>Sample Code</h4>
                          <pre style={{ fontSize: '12px', overflow: 'auto' }}>
                            {workflowResults.selectedFile?.content || 'No code available'}
                          </pre>
                        </Box>
                      }
                      terminalContent={
                        <Box sx={{ p: 2 }}>
                          <h4>Workflow Logs</h4>
                          {workflowResults.logs.map((log, index) => (
                            <div key={index} style={{ fontSize: '12px', marginBottom: '4px' }}>
                              {log}
                            </div>
                          ))}
                        </Box>
                      }
                    />
                  </Box>
                )}
              </Box>
            } 
          />
          
          {/* Multi-pane Results View */}
          <Route 
            path="/results" 
            element={
              <MultiPaneDashboard
                resultsContent={<Box>Analysis results will appear here</Box>}
                codeViewerContent={<Box>Code viewer will appear here</Box>}
                terminalContent={<Box>Terminal output will appear here</Box>}
              />
            } 
          />
          
          {/* Legacy MISRA App (for comparison/fallback) */}
          <Route path="/legacy" element={<ProductionMISRAApp />} />
          
          {/* Placeholder routes for other pages */}
          <Route path="/projects" element={<Box sx={{ p: 3 }}>Projects page coming soon</Box>} />
          <Route path="/files" element={<Box sx={{ p: 3 }}>Files page coming soon</Box>} />
          <Route path="/analysis" element={<Box sx={{ p: 3 }}>Analysis page coming soon</Box>} />
          <Route path="/misra-analysis" element={<Box sx={{ p: 3 }}>MISRA Analysis page coming soon</Box>} />
          <Route path="/insights" element={<Box sx={{ p: 3 }}>Insights page coming soon</Box>} />
          <Route path="/terminal" element={<Box sx={{ p: 3 }}>Terminal page coming soon</Box>} />
          
          {/* Catch all - redirect to dashboard */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </DashboardLayout>
    </ErrorBoundary>
  );
}

export default App;

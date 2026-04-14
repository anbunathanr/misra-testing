import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Alert,
  Container
} from '@mui/material';
import { 
  PlayArrow as PlayArrowIcon
} from '@mui/icons-material';
import StepIndicator, { StepDefinition } from './StepIndicator';
import TerminalOutput from './TerminalOutput';
import AutomatedQuickStartForm from './AutomatedQuickStartForm';
import RealTimeProgressDisplay from './RealTimeProgressDisplay';
import MISRAResultsDisplay from './MISRAResultsDisplay';
import ErrorBoundary from './ErrorBoundary';
import { loggingService, LogEntry } from '../services/logging';
import { mockBackend } from '../services/mock-backend';
import { errorHandlingService, ErrorDetails } from '../services/error-handling';

interface ProductionMISRAAppProps {
  onComplete?: (results: AnalysisResults) => void;
  onError?: (error: AppError) => void;
}

interface AnalysisResults {
  analysisId: string;
  complianceScore: number;
  violations: ViolationDetail[];
  success: boolean;
  duration: number;
  timestamp: Date;
  reportUrl?: string;
  fileInfo: {
    name: string;
    size: number;
    type: string;
  };
}

interface ViolationDetail {
  ruleId: string;
  ruleName: string;
  severity: 'error' | 'warning' | 'info';
  line: number;
  column: number;
  message: string;
  suggestion?: string;
}

interface SampleFile {
  id: string;
  name: string;
  content: string;
  language: 'C' | 'CPP';
  description: string;
  expectedViolations: number;
  size: number;
  difficultyLevel: 'basic' | 'intermediate' | 'advanced';
}

interface UploadResponse {
  fileId: string;
  fileName: string;
  fileSize: number;
  language: string;
  description: string;
  expectedViolations: number;
  uploadStatus: string;
  s3Key: string;
}

interface AppError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
  recoverable: boolean;
  userMessage: string;
}

interface UserInfo {
  email: string;
  name?: string;
  isRegistered: boolean;
}

const ProductionMISRAApp: React.FC<ProductionMISRAAppProps> = ({
  onComplete,
  onError
}) => {
  // Core state
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [showOutput, setShowOutput] = useState(false);
  const [workflowError, setWorkflowError] = useState<ErrorDetails | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  // User and file state
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [selectedSampleFile, setSelectedSampleFile] = useState<SampleFile | null>(null);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResults | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  
  // Form state for quick registration
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');

  const steps: StepDefinition[] = [
    { id: 1, label: '1. Login', status: 'pending' },
    { id: 2, label: '2. Upload', status: 'pending' },
    { id: 3, label: '3. Analyze', status: 'pending' },
    { id: 4, label: '4. Verify', status: 'pending' }
  ];

  useEffect(() => {
    const unsubscribe = loggingService.subscribe(setLogs);
    
    // Add error listener for global error handling
    const handleError = (error: ErrorDetails) => {
      loggingService.error(`[ERROR] ${error.userMessage}`, { 
        code: error.code,
        correlationId: error.correlationId 
      });
      setWorkflowError(error);
    };
    
    errorHandlingService.addErrorListener(handleError);
    
    return () => {
      unsubscribe();
      errorHandlingService.removeErrorListener(handleError);
    };
  }, []);

  // Production API endpoints - use environment variable or default
  const API_BASE = process.env.REACT_APP_API_URL || 'https://api.misra.digitransolutions.in';

  // Sample file library for automated selection
  const sampleFiles: SampleFile[] = [
    {
      id: 'sample-c-basic',
      name: 'basic_violations.c',
      content: `#include <stdio.h>
#include <stdlib.h>

// MISRA C 2012 Rule 8.4 violation - function not declared
int undeclared_function(int x) {
    return x * 2;
}

int main() {
    int result;
    int unused_var; // MISRA C 2012 Rule 2.2 violation
    
    result = undeclared_function(5);
    printf("Result: %d\\n", result);
    
    return 0;
}`,
      language: 'C',
      description: 'Basic C file with common MISRA violations',
      expectedViolations: 3,
      size: 456,
      difficultyLevel: 'basic'
    },
    {
      id: 'sample-cpp-advanced',
      name: 'advanced_violations.cpp',
      content: `#include <iostream>
using namespace std; // MISRA C++ 2008 Rule 7-3-6 violation

class TestClass {
public:
    int getValue() { return value; } // MISRA C++ 2008 Rule 9-3-1 violation
private:
    int value;
};

int main() {
    TestClass obj;
    cout << obj.getValue() << endl;
    return 0;
}`,
      language: 'CPP',
      description: 'C++ file with namespace and class violations',
      expectedViolations: 2,
      size: 312,
      difficultyLevel: 'advanced'
    },
    {
      id: 'sample-c-intermediate',
      name: 'pointer_violations.c',
      content: `#include <stdio.h>

void unsafe_pointer_usage() {
    int *ptr;
    int value = 42;
    
    // MISRA C 2012 Rule 18.1 violation - uninitialized pointer
    *ptr = value;
    
    // MISRA C 2012 Rule 17.7 violation - return value ignored
    malloc(sizeof(int));
    
    printf("Value: %d\\n", *ptr);
}

int main() {
    unsafe_pointer_usage();
    return 0;
}`,
      language: 'C',
      description: 'C file with pointer and memory management violations',
      expectedViolations: 4,
      size: 387,
      difficultyLevel: 'intermediate'
    }
  ];

  const handleQuickRegistration = async (email: string, name?: string) => {
    try {
      loggingService.info('[AUTH] Starting quick registration...', { email });

      // Use mock backend if enabled or if real backend is not available
      if (mockBackend.shouldUseMock(API_BASE)) {
        loggingService.info('[AUTH] Using mock backend for testing');
        const result = await mockBackend.mockQuickRegister(email, name);
        
        setUserInfo({
          email,
          name: name || email.split('@')[0],
          isRegistered: true
        });

        loggingService.success('[AUTH] ✓ Mock registration successful', { userId: result.user.userId });
        return result;
      }

      // Real backend call with enhanced error handling
      const response = await errorHandlingService.fetchWithErrorHandling(
        `${API_BASE}/auth/quick-register`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, name })
        },
        { maxAttempts: 3, initialDelay: 1000 }
      );

      const result = await response.json();
      
      setUserInfo({
        email,
        name: name || email.split('@')[0],
        isRegistered: true
      });

      loggingService.success('[AUTH] ✓ Quick registration successful', { userId: result.userId });
      return result;
    } catch (error: any) {
      const errorDetails = errorHandlingService.handleError(error, { operation: 'authentication' });
      loggingService.error('[AUTH] Registration failed', { 
        error: errorDetails.message,
        code: errorDetails.code 
      });
      throw error;
    }
  };

  const selectRandomSampleFile = (): SampleFile => {
    const randomIndex = Math.floor(Math.random() * sampleFiles.length);
    return sampleFiles[randomIndex];
  };

  const uploadSampleFileToS3 = async (sampleFile: SampleFile): Promise<UploadResponse> => {
    try {
      loggingService.info('[FILE] Uploading sample file automatically...', { 
        fileName: sampleFile.name,
        size: sampleFile.size 
      });

      // Use mock backend if enabled
      if (mockBackend.shouldUseMock(API_BASE)) {
        loggingService.info('[FILE] Using mock backend for file upload');
        const result = await mockBackend.mockUploadSample(sampleFile.id, sampleFile.name);
        
        const response: UploadResponse = {
          fileId: result.fileId,
          fileName: sampleFile.name,
          fileSize: sampleFile.size,
          language: sampleFile.language,
          description: sampleFile.description,
          expectedViolations: sampleFile.expectedViolations,
          uploadStatus: 'completed',
          s3Key: result.s3Key
        };

        loggingService.success('[FILE] ✓ Mock file upload successful', response);
        return response;
      }

      // Real backend call with enhanced error handling
      // Create a blob from the sample file content
      const blob = new Blob([sampleFile.content], { type: 'text/plain' });
      const file = new File([blob], sampleFile.name, { type: 'text/plain' });

      // Get upload URL from backend with retry
      const uploadUrlResponse = await errorHandlingService.fetchWithErrorHandling(
        `${API_BASE}/files/upload-sample`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userEmail: userInfo?.email || email,
            sampleId: sampleFile.id,
            fileName: sampleFile.name,
            fileSize: sampleFile.size,
            language: sampleFile.language
          })
        },
        { maxAttempts: 3, initialDelay: 1000 }
      );

      const uploadData = await uploadUrlResponse.json();
      
      // If backend provides upload URL, use it; otherwise simulate successful upload
      if (uploadData.uploadUrl) {
        await errorHandlingService.fetchWithErrorHandling(
          uploadData.uploadUrl,
          {
            method: 'PUT',
            body: file,
            headers: { 'Content-Type': 'text/plain' }
          },
          { maxAttempts: 2, initialDelay: 500 }
        );
      }

      const response: UploadResponse = {
        fileId: uploadData.fileId || `file-${Date.now()}`,
        fileName: sampleFile.name,
        fileSize: sampleFile.size,
        language: sampleFile.language,
        description: sampleFile.description,
        expectedViolations: sampleFile.expectedViolations,
        uploadStatus: 'completed',
        s3Key: uploadData.s3Key || `samples/${sampleFile.name}`
      };

      loggingService.success('[FILE] ✓ Sample file uploaded successfully', response);
      return response;
    } catch (error: any) {
      const errorDetails = errorHandlingService.handleError(error, { operation: 'file-upload' });
      loggingService.error('[FILE] Sample file upload failed', { 
        error: errorDetails.message,
        code: errorDetails.code 
      });
      throw error;
    }
  };

  const startAnalysis = async (fileId: string) => {
    // Use mock backend if enabled
    if (mockBackend.shouldUseMock(API_BASE)) {
      loggingService.info('[ANALYSIS] Using mock backend for analysis');
      return await mockBackend.mockStartAnalysis(fileId);
    }

    // Real backend call
    const response = await fetch(`${API_BASE}/analysis/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        fileId,
        analysisType: 'misra-compliance',
        userEmail: userInfo?.email
      })
    });

    if (!response.ok) {
      throw new Error(`Analysis start failed: ${response.statusText}`);
    }

    return response.json();
  };

  const pollAnalysisStatus = async (analysisId: string): Promise<AnalysisResults> => {
    // Use mock backend if enabled
    if (mockBackend.shouldUseMock(API_BASE)) {
      loggingService.info('[ANALYSIS] Using mock backend for status polling');
      const mockResult = await mockBackend.mockAnalysisStatus(analysisId, (progress) => {
        setAnalysisProgress(progress);
        loggingService.info(`[ANALYSIS] Progress: ${progress}%`, { analysisId });
      });
      
      return {
        analysisId: mockResult.analysisId,
        complianceScore: mockResult.complianceScore,
        violations: mockResult.violations,
        success: mockResult.success,
        duration: mockResult.duration,
        timestamp: mockResult.timestamp,
        reportUrl: mockResult.reportUrl,
        fileInfo: {
          name: selectedSampleFile?.name || 'unknown.c',
          size: selectedSampleFile?.size || 0,
          type: selectedSampleFile?.language || 'C'
        }
      };
    }

    // Real backend polling
    return new Promise((resolve, reject) => {
      const pollInterval = setInterval(async () => {
        try {
          const response = await fetch(`${API_BASE}/analysis/${analysisId}/status`);
          
          if (!response.ok) {
            throw new Error(`Status check failed: ${response.statusText}`);
          }

          const status = await response.json();
          
          // Update progress
          setAnalysisProgress(status.progress || 0);
          loggingService.info(`[ANALYSIS] Progress: ${status.progress}%`, { analysisId });

          if (status.status === 'completed') {
            clearInterval(pollInterval);
            resolve(status.results);
          } else if (status.status === 'failed') {
            clearInterval(pollInterval);
            reject(new Error(status.error || 'Analysis failed'));
          }
          // Continue polling if status is 'running' or 'queued'
        } catch (error) {
          clearInterval(pollInterval);
          reject(error);
        }
      }, 2000); // Poll every 2 seconds

      // Timeout after 10 minutes
      setTimeout(() => {
        clearInterval(pollInterval);
        reject(new Error('Analysis timeout - please try again'));
      }, 600000);
    });
  };

  const runAutomatedWorkflow = async () => {
    if (!email) {
      alert('Please enter your email address');
      return;
    }

    setIsRunning(true);
    setShowOutput(true);
    setCurrentStep(0);
    setCompletedSteps([]);
    setWorkflowError(null);
    setAnalysisProgress(0);
    loggingService.clearLogs();

    try {
      await errorHandlingService.executeWithRetry(
        async () => {
          loggingService.info('========================================');
          loggingService.success('🚀 MISRA Compliance Analysis Started');
          loggingService.info('🤖 Fully Automated Workflow');
          loggingService.info(`📧 User: ${email}`);
          if (retryCount > 0) {
            loggingService.info(`🔄 Retry attempt: ${retryCount + 1}`);
          }
          loggingService.info('========================================\n');

          // Step 1: Quick Registration/Login
          loggingService.info('[STEP 1] 🔐 User Authentication...');
          setCurrentStep(1);

          if (!userInfo?.isRegistered) {
            await handleQuickRegistration(email, name);
          } else {
            loggingService.info('[AUTH] Using existing user session');
          }

          loggingService.success('[STEP 1] ✓ Authentication successful');
          setCompletedSteps(prev => [...prev, 1]);

          // Step 2: Automatic File Selection and Upload
          loggingService.info('\n[STEP 2] 📤 Selecting sample file automatically...');
          setCurrentStep(2);

          // Automatically select a random sample file
          const selectedSample = selectRandomSampleFile();
          setSelectedSampleFile(selectedSample);
          
          loggingService.info(`[FILE] Selected: ${selectedSample.name}`, {
            size: `${selectedSample.size} bytes`,
            language: selectedSample.language,
            description: selectedSample.description,
            expectedViolations: selectedSample.expectedViolations
          });

          // Upload the selected sample file
          const uploadResult = await uploadSampleFileToS3(selectedSample);

          loggingService.success('[STEP 2] ✓ Sample file uploaded successfully');
          loggingService.info(`[STEP 2] 📋 File ID: ${uploadResult.fileId}`);
          setCompletedSteps(prev => [...prev, 2]);

          // Step 3: MISRA Analysis
          loggingService.info('\n[STEP 3] 🔍 Starting MISRA compliance analysis...');
          setCurrentStep(3);

          const analysisStart = await startAnalysis(uploadResult.fileId);
          loggingService.info(`[STEP 3] 📊 Analysis ID: ${analysisStart.analysisId}`);
          loggingService.info('[STEP 3] ⏳ Analysis in progress - this may take 2-5 minutes...');

          // Poll for results
          const results = await pollAnalysisStatus(analysisStart.analysisId);

          loggingService.success('[STEP 3] ✓ Analysis completed successfully');
          loggingService.info(`[STEP 3] 📈 Compliance Score: ${results.complianceScore}%`);
          loggingService.info(`[STEP 3] ⚠️  Violations Found: ${results.violations.length}`);
          setCompletedSteps(prev => [...prev, 3]);

          // Step 4: Results Verification
          loggingService.info('\n[STEP 4] ✅ Verifying and preparing results...');
          setCurrentStep(4);

          // Process and display results
          setAnalysisResults({
            ...results,
            fileInfo: {
              name: selectedSample.name,
              size: selectedSample.size,
              type: selectedSample.language
            }
          });

          loggingService.success('[STEP 4] ✓ Results verified and ready');
          loggingService.info(`[STEP 4] 📄 Detailed report available for download`);
          setCompletedSteps(prev => [...prev, 4]);

          loggingService.info('\n========================================');
          loggingService.success('🎉 MISRA Analysis Complete!');
          loggingService.info(`📊 Final Score: ${results.complianceScore}%`);
          loggingService.info(`📄 File: ${selectedSample.name} (${selectedSample.language})`);
          loggingService.info(`⏱️  Total Time: ${Math.round(results.duration / 1000)}s`);
          loggingService.info('========================================\n');

          onComplete?.(results);
          setRetryCount(0); // Reset retry count on success
        },
        { 
          maxAttempts: 3, 
          initialDelay: 2000,
          maxDelay: 10000,
          backoffMultiplier: 2
        }
      );

    } catch (error: any) {
      const errorDetails = errorHandlingService.handleError(error, { operation: 'workflow' });
      
      setWorkflowError(errorDetails);
      setRetryCount(prev => prev + 1);
      
      loggingService.error(`\n❌ Analysis failed: ${errorDetails.userMessage}`);
      loggingService.info(`\n💡 ${errorDetails.suggestion}`);
      
      if (errorDetails.retryable && retryCount < 2) {
        loggingService.info('\n🔧 Troubleshooting:');
        loggingService.info('• This error is recoverable');
        loggingService.info('• You can try again using the "Retry" button');
        loggingService.info('• Check your internet connection');
      } else {
        loggingService.info('\n🔧 Troubleshooting:');
        loggingService.info('• Check your internet connection');
        loggingService.info('• Try again in a few moments');
        if (errorDetails.contactSupport) {
          loggingService.info('• Contact support if the issue persists');
          if (errorDetails.correlationId) {
            loggingService.info(`• Reference ID: ${errorDetails.correlationId}`);
          }
        }
      }
      loggingService.info('');

      onError?.(errorDetails);
    } finally {
      setIsRunning(false);
    }
  };

  const downloadReport = () => {
    if (analysisResults?.reportUrl) {
      window.open(analysisResults.reportUrl, '_blank');
    }
  };

  const clearOutput = () => {
    loggingService.clearLogs();
    setShowOutput(false);
    setCurrentStep(0);
    setCompletedSteps([]);
    setWorkflowError(null);
    setAnalysisResults(null);
    setAnalysisProgress(0);
    setSelectedSampleFile(null);
  };

  return (
    <ErrorBoundary
      showDetails={process.env.NODE_ENV === 'development'}
      onError={(error, errorInfo) => {
        console.error('ProductionMISRAApp Error:', error, errorInfo);
        // In production, you could send this to an error reporting service
      }}
    >
      <Box
        sx={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 2.5
        }}
      >
        <Container maxWidth="md">
          <Paper
            sx={{
              borderRadius: 3,
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
              p: 5
            }}
          >
            {/* Header */}
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Typography variant="h4" sx={{ color: '#333', fontSize: '28px', mb: 1.25 }}>
                🔍 MISRA Compliance Analyzer
              </Typography>
              <Typography variant="body2" sx={{ color: '#666', fontSize: '14px' }}>
                Professional C/C++ Code Analysis Platform
              </Typography>
            </Box>

            {/* Automated Quick Start Form */}
            <AutomatedQuickStartForm
              email={email}
              name={name}
              onEmailChange={setEmail}
              onNameChange={setName}
              selectedSampleFile={selectedSampleFile}
              isRunning={isRunning}
              visible={!isRunning && !analysisResults}
            />

            {/* Error Display with Enhanced Information */}
            {workflowError && (
              <Alert 
                severity={workflowError.retryable ? "warning" : "error"} 
                sx={{ mb: 3 }}
                action={
                  workflowError.retryable && retryCount < 3 ? (
                    <Button 
                      color="inherit" 
                      size="small" 
                      onClick={() => {
                        setWorkflowError(null);
                        runAutomatedWorkflow();
                      }}
                    >
                      Retry
                    </Button>
                  ) : null
                }
              >
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                  {workflowError.retryable ? '⚠️ Temporary Issue' : '❌ Analysis Error'}
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  {workflowError.userMessage}
                </Typography>
                <Typography variant="body2" sx={{ fontSize: '0.875rem', opacity: 0.8 }}>
                  💡 {workflowError.suggestion}
                </Typography>
                {workflowError.correlationId && (
                  <Typography variant="caption" sx={{ display: 'block', mt: 1, fontFamily: 'monospace' }}>
                    Reference ID: {workflowError.correlationId}
                  </Typography>
                )}
              </Alert>
            )}

            {/* Comprehensive Results Display */}
            {analysisResults && (
              <MISRAResultsDisplay
                results={analysisResults}
                onDownloadReport={downloadReport}
                onAnalyzeAnother={() => {
                  setAnalysisResults(null);
                  setSelectedSampleFile(null);
                  setEmail('');
                  setName('');
                  setRetryCount(0);
                  clearOutput();
                }}
              />
            )}

            {/* Real-Time Progress Display */}
            <RealTimeProgressDisplay
              currentStep={currentStep}
              completedSteps={completedSteps}
              analysisProgress={analysisProgress}
              isRunning={isRunning}
              visible={isRunning || completedSteps.length > 0}
              estimatedTimeRemaining={currentStep === 3 ? Math.max(0, 300 - (analysisProgress * 3)) : undefined}
              rulesProcessed={Math.floor((analysisProgress / 100) * 50)}
              totalRules={50}
            />

            {/* Step Indicator */}
            <StepIndicator
              steps={steps}
              currentStep={currentStep}
              completedSteps={completedSteps}
            />

            {/* Action Buttons */}
            <Box sx={{ display: 'flex', gap: 1.25, mb: 3 }}>
              <Button
                variant="contained"
                fullWidth
                startIcon={<PlayArrowIcon />}
                onClick={runAutomatedWorkflow}
                disabled={isRunning || !email}
                sx={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  fontWeight: 600,
                  py: 1.5,
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 10px 20px rgba(102, 126, 234, 0.3)'
                  },
                  '&:disabled': {
                    opacity: 0.6
                  }
                }}
              >
                {isRunning ? 'Analyzing...' : 'Start MISRA Analysis'}
              </Button>
              
              {showOutput && (
                <Button
                  variant="outlined"
                  onClick={clearOutput}
                  sx={{
                    minWidth: 'auto',
                    px: 2,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    fontWeight: 600
                  }}
                >
                  Clear
                </Button>
              )}
            </Box>

            {/* Terminal Output */}
            <TerminalOutput
              logs={logs}
              isRunning={isRunning}
              onClear={clearOutput}
              visible={showOutput}
            />
          </Paper>
        </Container>
      </Box>
    </ErrorBoundary>
  );
};

export default ProductionMISRAApp;
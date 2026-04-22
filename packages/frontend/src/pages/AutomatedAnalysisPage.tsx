import { useState, useCallback } from 'react';
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Paper,
  LinearProgress,
  Alert,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Divider,
  CircularProgress
} from '@mui/material';
import {
  RocketLaunch as RocketIcon,
  CheckCircle as CheckIcon,
  RadioButtonUnchecked as PendingIcon,
  PlayArrow as ActiveIcon,
  Email as EmailIcon,
  Person as PersonIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  Lock as LockIcon
} from '@mui/icons-material';
import { workflowAutomationService, WorkflowProgress, WorkflowResult } from '../services/workflow-automation';
import { productionWorkflowService } from '../services/production-workflow-service';
import { autoAuthService, AutoAuthProgress } from '../services/auto-auth-service';

function AutomatedAnalysisPage() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [emailError, setEmailError] = useState('');
  const [workflowRunning, setWorkflowRunning] = useState(false);
  const [workflowProgress, setWorkflowProgress] = useState<WorkflowProgress | null>(null);
  const [workflowError, setWorkflowError] = useState<string | null>(null);
  const [workflowResults, setWorkflowResults] = useState<WorkflowResult | null>(null);
  const [authProgress, setAuthProgress] = useState<AutoAuthProgress | null>(null);
  const [authLogs, setAuthLogs] = useState<string[]>([]);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (value && !validateEmail(value)) {
      setEmailError('Please enter a valid email address');
    } else {
      setEmailError('');
    }
  };

  const handleStartWorkflow = useCallback(async () => {
    if (!email) {
      setEmailError('Email is required');
      return;
    }
    if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    console.log('🚀 Starting automated workflow for:', email, name);
    console.log('📋 Demo mode:', import.meta.env.VITE_USE_MOCK_BACKEND === 'true');
    
    setWorkflowRunning(true);
    setWorkflowError(null);
    setWorkflowResults(null);
    setWorkflowProgress(null);
    setAuthProgress(null);
    setAuthLogs([]);
    
    try {
      // Step 1: Auto-authenticate user
      console.log('🔐 Starting automatic authentication...');
      
      const authResult = await autoAuthService.autoAuthenticate(
        email,
        name || 'User',
        (progress: AutoAuthProgress) => {
          console.log('🔐 Auth progress:', progress);
          setAuthProgress(progress);
          setAuthLogs(prev => [...prev, `${progress.step}: ${progress.message}`]);
        }
      );

      if (!authResult.success) {
        const errorMsg = authResult.error || 'Authentication failed';
        setWorkflowError(errorMsg);
        console.error('❌ Authentication failed:', errorMsg);
        setWorkflowRunning(false);
        return;
      }

      console.log('✅ Authentication successful');
      setAuthProgress({ step: 'complete', message: 'Authentication complete', progress: 100 });

      // Step 2: Start MISRA analysis workflow
      console.log('📞 Calling productionWorkflowService.startAutomatedWorkflow...');
      
      const result = await productionWorkflowService.startAutomatedWorkflow(
        {
          email,
          name
        },
        (progress: WorkflowProgress) => {
          console.log('📊 Progress update:', progress);
          setWorkflowProgress(progress);
        }
      );

      console.log('✅ Workflow service returned:', result);

      if (result.success) {
        setWorkflowResults(result);
        console.log('✅ Workflow completed successfully:', result);
      } else {
        const errorMsg = result.error || 'Workflow failed';
        setWorkflowError(errorMsg);
        console.error('❌ Workflow failed:', errorMsg);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setWorkflowError(errorMessage);
      console.error('❌ Workflow error:', error);
      console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    } finally {
      console.log('🏁 Workflow finished, setting running to false');
      setWorkflowRunning(false);
    }
  }, [email, name]);

  const handleRetry = useCallback(() => {
    setWorkflowError(null);
    setWorkflowResults(null);
    setWorkflowProgress(null);
  }, []);

  const handleAnalyzeAnother = useCallback(() => {
    setWorkflowError(null);
    setWorkflowResults(null);
    setWorkflowProgress(null);
    setWorkflowRunning(false);
    // Keep email and name for convenience
  }, []);

  const handleDownloadReport = useCallback(() => {
    if (!workflowResults || !workflowResults.success) return;

    const report = {
      title: 'MISRA Compliance Analysis Report',
      generatedAt: new Date().toISOString(),
      user: {
        email,
        name: name || 'N/A'
      },
      file: {
        name: workflowResults.selectedFile?.name,
        language: workflowResults.selectedFile?.language,
        size: workflowResults.selectedFile?.size
      },
      summary: {
        complianceScore: workflowResults.analysisResults?.compliancePercentage,
        totalViolations: workflowResults.analysisResults?.violations?.length || 0,
        rulesChecked: workflowResults.analysisResults?.rulesChecked || 50,
        executionTime: `${(workflowResults.executionTime / 1000).toFixed(2)}s`
      },
      violations: workflowResults.analysisResults?.violations || [],
      logs: workflowResults.logs || []
    };

    // Create formatted text report
    const textReport = `
╔════════════════════════════════════════════════════════════════╗
║           MISRA COMPLIANCE ANALYSIS REPORT                     ║
╚════════════════════════════════════════════════════════════════╝

Generated: ${new Date().toLocaleString()}
User: ${email}${name ? ` (${name})` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FILE INFORMATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
File Name:     ${report.file.name}
Language:      ${report.file.language?.toUpperCase()}
File Size:     ${report.file.size} bytes
Analysis Time: ${report.summary.executionTime}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
COMPLIANCE SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Compliance Score:  ${report.summary.complianceScore}%
Total Violations:  ${report.summary.totalViolations}
Rules Checked:     ${report.summary.rulesChecked}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VIOLATIONS DETECTED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${report.violations.map((v: any, i: number) => `
${i + 1}. ${v.ruleId} [${v.severity.toUpperCase()}]
   Location: Line ${v.line}, Column ${v.column}
   Message:  ${v.message}
   ${v.description ? `Details:  ${v.description}` : ''}
`).join('\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WORKFLOW EXECUTION LOG
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${report.logs.join('\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
END OF REPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Generated by MISRA Compliance Platform
© ${new Date().getFullYear()} - Automated Code Analysis System
`;

    // Create and download the file
    const blob = new Blob([textReport], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `MISRA_Report_${report.file.name}_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    // Also create JSON version
    const jsonBlob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const jsonUrl = URL.createObjectURL(jsonBlob);
    const jsonLink = document.createElement('a');
    jsonLink.href = jsonUrl;
    jsonLink.download = `MISRA_Report_${report.file.name}_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(jsonLink);
    jsonLink.click();
    document.body.removeChild(jsonLink);
    URL.revokeObjectURL(jsonUrl);

    console.log('📥 Report downloaded successfully');
  }, [workflowResults, email, name]);

  const getStepIcon = (stepId: number) => {
    if (!workflowProgress) return <PendingIcon sx={{ color: '#64748b' }} />;
    
    if (workflowProgress.completedSteps.includes(stepId)) {
      return <CheckIcon sx={{ color: '#00e676' }} />;
    }
    if (workflowProgress.currentStep === stepId) {
      return <ActiveIcon sx={{ color: '#7b61ff' }} />;
    }
    return <PendingIcon sx={{ color: '#64748b' }} />;
  };

  const getStepStatus = (stepId: number): string => {
    if (!workflowProgress) return 'Pending';
    
    if (workflowProgress.completedSteps.includes(stepId)) {
      return 'Complete';
    }
    if (workflowProgress.currentStep === stepId) {
      return 'In Progress';
    }
    return 'Pending';
  };

  const steps = [
    { id: 1, label: 'Authentication', description: 'Quick registration and login' },
    { id: 2, label: 'File Selection', description: 'Automatic sample file selection' },
    { id: 3, label: 'MISRA Analysis', description: 'Comprehensive code analysis' },
    { id: 4, label: 'Results', description: 'Processing and formatting' }
  ];

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'radial-gradient(circle at top right, #2d1b69 0%, #0f172a 100%)',
        py: 6
      }}
    >
      <Container maxWidth="lg">
        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Typography
            variant="h3"
            sx={{
              color: '#f8fafc',
              fontWeight: 700,
              mb: 2,
              textShadow: '0 0 20px rgba(123, 97, 255, 0.5)'
            }}
          >
            MISRA Compliance Platform
          </Typography>
          <Typography variant="h6" sx={{ color: '#94a3b8' }}>
            Automated Code Analysis & Compliance Verification
          </Typography>
        </Box>

        {/* Quick Start Section */}
        <Paper
          sx={{
            p: 4,
            mb: 4,
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
          }}
        >
          <Typography
            variant="h5"
            sx={{ color: '#f8fafc', mb: 3, fontWeight: 600 }}
          >
            Quick Start
          </Typography>

          {/* Error Display */}
          {workflowError && (
            <Alert severity="error" sx={{ mb: 3 }} onClose={handleRetry}>
              {workflowError}
            </Alert>
          )}

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Email Address"
                type="email"
                value={email}
                onChange={(e) => handleEmailChange(e.target.value)}
                error={!!emailError}
                helperText={emailError || 'Required for authentication'}
                disabled={workflowRunning}
                InputProps={{
                  startAdornment: <EmailIcon sx={{ mr: 1, color: '#94a3b8' }} />
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    color: '#f8fafc',
                    '& fieldset': {
                      borderColor: 'rgba(255, 255, 255, 0.2)'
                    },
                    '&:hover fieldset': {
                      borderColor: 'rgba(255, 255, 255, 0.3)'
                    }
                  },
                  '& .MuiInputLabel-root': {
                    color: '#94a3b8'
                  }
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Name (Optional)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={workflowRunning}
                helperText="Optional - for personalized reports"
                InputProps={{
                  startAdornment: <PersonIcon sx={{ mr: 1, color: '#94a3b8' }} />
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    color: '#f8fafc',
                    '& fieldset': {
                      borderColor: 'rgba(255, 255, 255, 0.2)'
                    },
                    '&:hover fieldset': {
                      borderColor: 'rgba(255, 255, 255, 0.3)'
                    }
                  },
                  '& .MuiInputLabel-root': {
                    color: '#94a3b8'
                  }
                }}
              />
            </Grid>
          </Grid>

          <Button
            variant="contained"
            size="large"
            fullWidth
            startIcon={<RocketIcon />}
            onClick={handleStartWorkflow}
            disabled={workflowRunning || !email || !!emailError}
            sx={{
              mt: 3,
              py: 1.5,
              fontSize: '1.1rem',
              fontWeight: 600,
              background: 'linear-gradient(45deg, #7b61ff 30%, #00e676 90%)',
              boxShadow: '0 0 15px rgba(123, 97, 255, 0.4)',
              borderRadius: '30px',
              '&:hover': {
                background: 'linear-gradient(45deg, #6a50e8 30%, #00d66a 90%)',
                boxShadow: '0 0 25px rgba(123, 97, 255, 0.6)'
              },
              '&:disabled': {
                opacity: 0.5
              }
            }}
          >
            {workflowRunning ? 'Analysis Running...' : 'Start MISRA Analysis'}
          </Button>
        </Paper>

        {/* Progress Tracker */}
        {(authProgress || workflowProgress || workflowResults) && (
          <Paper
            sx={{
              p: 4,
              mb: 4,
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
            }}
          >
            {/* Authentication Progress */}
            {authProgress && (
              <Box sx={{ mb: 4 }}>
                <Typography
                  variant="h6"
                  sx={{ color: '#f8fafc', mb: 2, fontWeight: 600, display: 'flex', alignItems: 'center' }}
                >
                  <LockIcon sx={{ mr: 1, color: '#7b61ff' }} />
                  Authentication Progress
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <CircularProgress
                    variant="determinate"
                    value={authProgress.progress}
                    sx={{
                      color: '#7b61ff',
                      '& .MuiCircularProgress-circle': {
                        strokeLinecap: 'round'
                      }
                    }}
                  />
                  <Box>
                    <Typography variant="body2" sx={{ color: '#f8fafc', fontWeight: 600 }}>
                      {authProgress.message}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                      {authProgress.progress}% complete
                    </Typography>
                  </Box>
                </Box>
                {authLogs.length > 0 && (
                  <Box
                    sx={{
                      backgroundColor: 'rgba(0, 0, 0, 0.3)',
                      p: 2,
                      borderRadius: 1,
                      maxHeight: 150,
                      overflowY: 'auto',
                      fontFamily: 'monospace',
                      fontSize: '0.75rem'
                    }}
                  >
                    {authLogs.map((log, idx) => (
                      <Typography key={idx} variant="caption" sx={{ color: '#94a3b8', display: 'block' }}>
                        {log}
                      </Typography>
                    ))}
                  </Box>
                )}
                <Divider sx={{ my: 3, borderColor: 'rgba(255, 255, 255, 0.1)' }} />
              </Box>
            )}

            <Typography
              variant="h5"
              sx={{ color: '#f8fafc', mb: 3, fontWeight: 600 }}
            >
              Workflow Progress
            </Typography>

            <Grid container spacing={2}>
              {steps.map((step) => (
                <Grid item xs={12} sm={6} md={3} key={step.id}>
                  <Card
                    sx={{
                      backgroundColor: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      height: '100%'
                    }}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        {getStepIcon(step.id)}
                        <Typography
                          variant="subtitle2"
                          sx={{ ml: 1, color: '#f8fafc', fontWeight: 600 }}
                        >
                          {step.label}
                        </Typography>
                      </Box>
                      <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                        {step.description}
                      </Typography>
                      <Box sx={{ mt: 1 }}>
                        <Chip
                          label={getStepStatus(step.id)}
                          size="small"
                          sx={{
                            backgroundColor:
                              getStepStatus(step.id) === 'Complete'
                                ? 'rgba(0, 230, 118, 0.2)'
                                : getStepStatus(step.id) === 'In Progress'
                                ? 'rgba(123, 97, 255, 0.2)'
                                : 'rgba(100, 116, 139, 0.2)',
                            color:
                              getStepStatus(step.id) === 'Complete'
                                ? '#00e676'
                                : getStepStatus(step.id) === 'In Progress'
                                ? '#7b61ff'
                                : '#64748b',
                            fontSize: '0.7rem'
                          }}
                        />
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            {/* Analysis Progress Bar */}
            {workflowProgress && workflowProgress.currentStep === 3 && workflowRunning && (
              <Box sx={{ mt: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" sx={{ color: '#f8fafc' }}>
                    Analyzing Code...
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#7b61ff' }}>
                    {workflowProgress.analysisProgress}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={workflowProgress.analysisProgress || 0}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    '& .MuiLinearProgress-bar': {
                      background: 'linear-gradient(90deg, #7b61ff 0%, #00e676 100%)',
                      borderRadius: 4
                    }
                  }}
                />
                <Typography variant="caption" sx={{ color: '#94a3b8', mt: 1, display: 'block' }}>
                  Rules Processed: {workflowProgress.rulesProcessed}/{workflowProgress.totalRules}
                </Typography>
              </Box>
            )}
          </Paper>
        )}

        {/* Results Section */}
        {workflowResults && workflowResults.success && (
          <Paper
            sx={{
              p: 4,
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
            }}
          >
            <Typography
              variant="h5"
              sx={{ color: '#f8fafc', mb: 3, fontWeight: 600 }}
            >
              Analysis Results
            </Typography>

            {/* Summary Cards */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} sm={6} md={3}>
                <Card
                  sx={{
                    backgroundColor: 'rgba(0, 230, 118, 0.1)',
                    border: '1px solid rgba(0, 230, 118, 0.3)'
                  }}
                >
                  <CardContent>
                    <Typography variant="h4" sx={{ color: '#00e676', fontWeight: 700 }}>
                      {workflowResults.analysisResults?.compliancePercentage}%
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                      Compliance Score
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card
                  sx={{
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                  }}
                >
                  <CardContent>
                    <Typography variant="h4" sx={{ color: '#f8fafc', fontWeight: 700 }}>
                      {workflowResults.analysisResults?.violations?.length || 0}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                      Violations Found
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card
                  sx={{
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                  }}
                >
                  <CardContent>
                    <Typography variant="h4" sx={{ color: '#f8fafc', fontWeight: 700 }}>
                      {workflowResults.selectedFile?.name.split('.').pop()?.toUpperCase()}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                      File Type
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card
                  sx={{
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                  }}
                >
                  <CardContent>
                    <Typography variant="h4" sx={{ color: '#f8fafc', fontWeight: 700 }}>
                      {(workflowResults.executionTime / 1000).toFixed(1)}s
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                      Execution Time
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <Divider sx={{ my: 3, borderColor: 'rgba(255, 255, 255, 0.1)' }} />

            {/* Action Buttons */}
            <Box sx={{ display: 'flex', gap: 2, mb: 4, justifyContent: 'center' }}>
              <Button
                variant="contained"
                size="large"
                startIcon={<DownloadIcon />}
                onClick={handleDownloadReport}
                sx={{
                  px: 4,
                  py: 1.5,
                  background: 'linear-gradient(45deg, #7b61ff 30%, #00e676 90%)',
                  boxShadow: '0 0 15px rgba(123, 97, 255, 0.4)',
                  borderRadius: '30px',
                  '&:hover': {
                    background: 'linear-gradient(45deg, #6a50e8 30%, #00d66a 90%)',
                    boxShadow: '0 0 25px rgba(123, 97, 255, 0.6)'
                  }
                }}
              >
                Download Report
              </Button>
              <Button
                variant="outlined"
                size="large"
                startIcon={<RefreshIcon />}
                onClick={handleAnalyzeAnother}
                sx={{
                  px: 4,
                  py: 1.5,
                  borderColor: 'rgba(123, 97, 255, 0.5)',
                  color: '#7b61ff',
                  borderRadius: '30px',
                  '&:hover': {
                    borderColor: '#7b61ff',
                    backgroundColor: 'rgba(123, 97, 255, 0.1)'
                  }
                }}
              >
                Analyze Another File
              </Button>
            </Box>

            <Divider sx={{ my: 3, borderColor: 'rgba(255, 255, 255, 0.1)' }} />

            {/* Violations Table */}
            <Typography variant="h6" sx={{ color: '#f8fafc', mb: 2, fontWeight: 600 }}>
              Detected Violations
            </Typography>
            <TableContainer
              sx={{
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 2
              }}
            >
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ color: '#94a3b8', fontWeight: 600 }}>Rule ID</TableCell>
                    <TableCell sx={{ color: '#94a3b8', fontWeight: 600 }}>Severity</TableCell>
                    <TableCell sx={{ color: '#94a3b8', fontWeight: 600 }}>Line</TableCell>
                    <TableCell sx={{ color: '#94a3b8', fontWeight: 600 }}>Message</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {workflowResults.analysisResults?.violations?.slice(0, 10).map((violation: any, index: number) => (
                    <TableRow key={index}>
                      <TableCell sx={{ color: '#f8fafc' }}>{violation.ruleId}</TableCell>
                      <TableCell>
                        <Chip
                          label={violation.severity}
                          size="small"
                          sx={{
                            backgroundColor:
                              violation.severity === 'error'
                                ? 'rgba(244, 67, 54, 0.2)'
                                : 'rgba(255, 193, 7, 0.2)',
                            color: violation.severity === 'error' ? '#f44336' : '#ffc107',
                            fontSize: '0.7rem'
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ color: '#f8fafc' }}>{violation.line}</TableCell>
                      <TableCell sx={{ color: '#94a3b8' }}>{violation.message}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {workflowResults.analysisResults?.violations?.length > 10 && (
              <Typography variant="caption" sx={{ color: '#94a3b8', mt: 2, display: 'block' }}>
                Showing 10 of {workflowResults.analysisResults.violations.length} violations
              </Typography>
            )}
          </Paper>
        )}
      </Container>
    </Box>
  );
}

export default AutomatedAnalysisPage;

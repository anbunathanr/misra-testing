/**
 * MISRA Results Display Component
 * Comprehensive results interface with compliance scores, violation categorization, and PDF download
 * 
 * Requirements: 4.3, 4.4, 7.2, 7.3
 * Task: 6.2 - Implement comprehensive results interface
 */

import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Collapse,
  IconButton,
  Alert
} from '@mui/material';
import {
  Download as DownloadIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';

export interface ViolationDetail {
  ruleId: string;
  ruleName: string;
  severity: 'mandatory' | 'required' | 'advisory' | 'error' | 'warning' | 'info';
  line: number;
  column: number;
  message: string;
  suggestion?: string;
  category?: string;
  codeSnippet?: string;
}

export interface AnalysisResults {
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
  summary?: {
    totalViolations: number;
    mandatory?: number;
    required?: number;
    advisory?: number;
  };
}

interface MISRAResultsDisplayProps {
  results: AnalysisResults;
  onDownloadReport?: () => void;
  onAnalyzeAnother?: () => void;
}

const MISRAResultsDisplay: React.FC<MISRAResultsDisplayProps> = ({
  results,
  onDownloadReport,
  onAnalyzeAnother
}) => {
  const [expandedViolations, setExpandedViolations] = useState<Set<number>>(new Set());

  // Normalize severity to standard format
  const normalizeSeverity = (severity: string): 'mandatory' | 'required' | 'advisory' => {
    const severityMap: Record<string, 'mandatory' | 'required' | 'advisory'> = {
      'error': 'mandatory',
      'mandatory': 'mandatory',
      'warning': 'required',
      'required': 'required',
      'info': 'advisory',
      'advisory': 'advisory'
    };
    return severityMap[severity.toLowerCase()] || 'advisory';
  };

  // Categorize violations by severity
  const categorizeViolations = () => {
    const categorized = {
      mandatory: [] as ViolationDetail[],
      required: [] as ViolationDetail[],
      advisory: [] as ViolationDetail[]
    };

    results.violations.forEach(violation => {
      const normalizedSeverity = normalizeSeverity(violation.severity);
      categorized[normalizedSeverity].push(violation);
    });

    return categorized;
  };

  const categorizedViolations = categorizeViolations();

  // Get severity configuration (color, icon, label)
  const getSeverityConfig = (severity: 'mandatory' | 'required' | 'advisory') => {
    const configs = {
      mandatory: {
        color: '#f44336',
        bgColor: '#ffebee',
        icon: <ErrorIcon sx={{ fontSize: 16 }} />,
        label: 'Mandatory',
        chipColor: 'error' as const
      },
      required: {
        color: '#ff9800',
        bgColor: '#fff3e0',
        icon: <WarningIcon sx={{ fontSize: 16 }} />,
        label: 'Required',
        chipColor: 'warning' as const
      },
      advisory: {
        color: '#2196f3',
        bgColor: '#e3f2fd',
        icon: <InfoIcon sx={{ fontSize: 16 }} />,
        label: 'Advisory',
        chipColor: 'info' as const
      }
    };
    return configs[severity];
  };

  // Toggle violation expansion
  const toggleViolation = (index: number) => {
    const newExpanded = new Set(expandedViolations);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedViolations(newExpanded);
  };

  // Get compliance grade and status
  const getComplianceGrade = (score: number) => {
    if (score >= 95) return { grade: 'A', status: 'Excellent', color: '#4caf50' };
    if (score >= 85) return { grade: 'B', status: 'Good', color: '#8bc34a' };
    if (score >= 70) return { grade: 'C', status: 'Moderate', color: '#ff9800' };
    if (score >= 50) return { grade: 'D', status: 'Poor', color: '#ff5722' };
    return { grade: 'F', status: 'Critical', color: '#f44336' };
  };

  const complianceInfo = getComplianceGrade(results.complianceScore);

  return (
    <Box sx={{ mb: 3 }}>
      {/* Success Alert */}
      <Alert 
        severity="success" 
        icon={<CheckCircleIcon />}
        sx={{ mb: 3 }}
      >
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          ✅ Analysis Complete
        </Typography>
        <Typography variant="body2">
          Your code has been analyzed successfully. Review the compliance score and violations below.
        </Typography>
      </Alert>

      {/* Compliance Score Card */}
      <Card sx={{ mb: 3, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <CardContent>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={4}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h2" sx={{ color: 'white', fontWeight: 'bold', mb: 1 }}>
                  {results.complianceScore.toFixed(1)}%
                </Typography>
                <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                  Compliance Score
                </Typography>
                <Chip 
                  label={`Grade ${complianceInfo.grade} - ${complianceInfo.status}`}
                  sx={{ 
                    mt: 1, 
                    backgroundColor: 'white',
                    color: complianceInfo.color,
                    fontWeight: 600
                  }}
                />
              </Box>
            </Grid>
            
            <Grid item xs={12} md={8}>
              <Grid container spacing={2}>
                <Grid item xs={6} sm={3}>
                  <Box sx={{ textAlign: 'center', color: 'white' }}>
                    <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                      {results.violations.length}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      Total Violations
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={6} sm={3}>
                  <Box sx={{ textAlign: 'center', color: 'white' }}>
                    <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#ffcdd2' }}>
                      {categorizedViolations.mandatory.length}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      Mandatory
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={6} sm={3}>
                  <Box sx={{ textAlign: 'center', color: 'white' }}>
                    <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#ffe0b2' }}>
                      {categorizedViolations.required.length}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      Required
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={6} sm={3}>
                  <Box sx={{ textAlign: 'center', color: 'white' }}>
                    <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#bbdefb' }}>
                      {categorizedViolations.advisory.length}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      Advisory
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* File Information */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2, color: '#333' }}>
            📄 File Information
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <Typography variant="body2" color="textSecondary">
                File Name
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                {results.fileInfo.name}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Typography variant="body2" color="textSecondary">
                Language
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                {results.fileInfo.type === 'C' ? 'MISRA C 2012' : 'MISRA C++ 2008'}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Typography variant="body2" color="textSecondary">
                Analysis Time
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                {Math.round(results.duration / 1000)}s
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Violations by Severity */}
      {['mandatory', 'required', 'advisory'].map((severityKey) => {
        const severity = severityKey as 'mandatory' | 'required' | 'advisory';
        const violations = categorizedViolations[severity];
        const config = getSeverityConfig(severity);

        if (violations.length === 0) return null;

        return (
          <Card key={severity} sx={{ mb: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Box sx={{ color: config.color, mr: 1 }}>
                  {config.icon}
                </Box>
                <Typography variant="h6" sx={{ color: '#333', flex: 1 }}>
                  {config.label} Violations ({violations.length})
                </Typography>
                <Chip 
                  label={violations.length}
                  color={config.chipColor}
                  size="small"
                />
              </Box>

              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ backgroundColor: config.bgColor }}>
                      <TableCell sx={{ fontWeight: 600, width: '15%' }}>Rule ID</TableCell>
                      <TableCell sx={{ fontWeight: 600, width: '10%' }}>Location</TableCell>
                      <TableCell sx={{ fontWeight: 600, width: '60%' }}>Message</TableCell>
                      <TableCell sx={{ fontWeight: 600, width: '15%', textAlign: 'center' }}>
                        Details
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {violations.map((violation, violationIndex) => {
                      const globalIndex = results.violations.indexOf(violation);
                      const isExpanded = expandedViolations.has(globalIndex);
                      const uniqueKey = `${severity}-${violationIndex}-${violation.ruleId}-${violation.line}`;

                      return (
                        <React.Fragment key={uniqueKey}>
                          <TableRow hover>
                            <TableCell>
                              <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                                {violation.ruleId}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                                {violation.line}:{violation.column}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {violation.message}
                              </Typography>
                            </TableCell>
                            <TableCell sx={{ textAlign: 'center' }}>
                              <IconButton
                                size="small"
                                onClick={() => toggleViolation(globalIndex)}
                              >
                                {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                              </IconButton>
                            </TableCell>
                          </TableRow>
                          
                          {/* Expanded Details */}
                          <TableRow>
                            <TableCell colSpan={4} sx={{ p: 0, border: 0 }}>
                              <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                                <Box sx={{ p: 2, backgroundColor: '#f5f5f5' }}>
                                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                                    Rule: {violation.ruleName}
                                  </Typography>
                                  
                                  {violation.category && (
                                    <Typography variant="body2" sx={{ mb: 1 }}>
                                      <strong>Category:</strong> {violation.category}
                                    </Typography>
                                  )}
                                  
                                  {violation.suggestion && (
                                    <Alert severity="info" sx={{ mt: 1 }}>
                                      <Typography variant="body2">
                                        <strong>Suggestion:</strong> {violation.suggestion}
                                      </Typography>
                                    </Alert>
                                  )}
                                  
                                  {violation.codeSnippet && (
                                    <Box sx={{ mt: 1 }}>
                                      <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                                        Code Snippet:
                                      </Typography>
                                      <Paper 
                                        variant="outlined" 
                                        sx={{ 
                                          p: 1, 
                                          backgroundColor: '#1e1e1e',
                                          color: '#d4d4d4',
                                          fontFamily: 'monospace',
                                          fontSize: '12px',
                                          overflowX: 'auto'
                                        }}
                                      >
                                        <pre style={{ margin: 0 }}>{violation.codeSnippet}</pre>
                                      </Paper>
                                    </Box>
                                  )}
                                </Box>
                              </Collapse>
                            </TableCell>
                          </TableRow>
                        </React.Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        );
      })}

      {/* No Violations Message */}
      {results.violations.length === 0 && (
        <Card sx={{ mb: 3, backgroundColor: '#e8f5e9' }}>
          <CardContent>
            <Box sx={{ textAlign: 'center', py: 3 }}>
              <CheckCircleIcon sx={{ fontSize: 64, color: '#4caf50', mb: 2 }} />
              <Typography variant="h5" sx={{ color: '#2e7d32', mb: 1 }}>
                Perfect Compliance!
              </Typography>
              <Typography variant="body1" color="textSecondary">
                No MISRA violations detected in your code. Excellent work!
              </Typography>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
        {results.reportUrl && onDownloadReport && (
          <Button
            variant="contained"
            size="large"
            startIcon={<DownloadIcon />}
            onClick={onDownloadReport}
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              px: 4,
              py: 1.5,
              fontWeight: 600,
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 10px 20px rgba(102, 126, 234, 0.3)'
              }
            }}
          >
            Download PDF Report
          </Button>
        )}
        
        {onAnalyzeAnother && (
          <Button
            variant="outlined"
            size="large"
            startIcon={<RefreshIcon />}
            onClick={onAnalyzeAnother}
            sx={{
              px: 4,
              py: 1.5,
              fontWeight: 600,
              borderWidth: 2,
              '&:hover': {
                borderWidth: 2
              }
            }}
          >
            Analyze Another File
          </Button>
        )}
      </Box>
    </Box>
  );
};

export default MISRAResultsDisplay;

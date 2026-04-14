/**
 * Unit tests for MISRAResultsDisplay component
 * Tests comprehensive results interface with violation categorization and PDF download
 */

import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import MISRAResultsDisplay, { AnalysisResults, ViolationDetail } from '../MISRAResultsDisplay';

describe('MISRAResultsDisplay', () => {
  const mockViolations: ViolationDetail[] = [
    {
      ruleId: 'MISRA-C-2012-1.1',
      ruleName: 'All code shall conform to ISO 9899:1990',
      severity: 'mandatory',
      line: 15,
      column: 8,
      message: 'Non-standard language extension used',
      suggestion: 'Use standard C syntax',
      category: 'Language Extensions'
    },
    {
      ruleId: 'MISRA-C-2012-8.4',
      ruleName: 'A compatible declaration shall be visible',
      severity: 'required',
      line: 23,
      column: 5,
      message: 'Function not declared before use',
      suggestion: 'Add function declaration in header',
      category: 'Declarations'
    },
    {
      ruleId: 'MISRA-C-2012-2.2',
      ruleName: 'There shall be no dead code',
      severity: 'advisory',
      line: 45,
      column: 12,
      message: 'Unused variable detected',
      suggestion: 'Remove unused variable or mark as intentionally unused',
      category: 'Dead Code'
    }
  ];

  const mockResults: AnalysisResults = {
    analysisId: 'test-analysis-123',
    complianceScore: 92.5,
    violations: mockViolations,
    success: true,
    duration: 2340,
    timestamp: new Date('2024-01-01T00:00:00Z'),
    reportUrl: 'https://example.com/report.pdf',
    fileInfo: {
      name: 'test_file.c',
      size: 1024,
      type: 'C'
    },
    summary: {
      totalViolations: 3,
      mandatory: 1,
      required: 1,
      advisory: 1
    }
  };

  const mockOnDownloadReport = jest.fn();
  const mockOnAnalyzeAnother = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Compliance Score Display', () => {
    it('should display compliance score correctly', () => {
      render(
        <MISRAResultsDisplay
          results={mockResults}
          onDownloadReport={mockOnDownloadReport}
          onAnalyzeAnother={mockOnAnalyzeAnother}
        />
      );

      expect(screen.getByText('92.5%')).toBeInTheDocument();
      expect(screen.getByText('Compliance Score')).toBeInTheDocument();
    });

    it('should display correct grade for high compliance score', () => {
      const highScoreResults = { ...mockResults, complianceScore: 96 };
      render(
        <MISRAResultsDisplay
          results={highScoreResults}
          onDownloadReport={mockOnDownloadReport}
          onAnalyzeAnother={mockOnAnalyzeAnother}
        />
      );

      expect(screen.getByText(/Grade A - Excellent/i)).toBeInTheDocument();
    });

    it('should display correct grade for moderate compliance score', () => {
      const moderateScoreResults = { ...mockResults, complianceScore: 75 };
      render(
        <MISRAResultsDisplay
          results={moderateScoreResults}
          onDownloadReport={mockOnDownloadReport}
          onAnalyzeAnother={mockOnAnalyzeAnother}
        />
      );

      expect(screen.getByText(/Grade C - Moderate/i)).toBeInTheDocument();
    });

    it('should display correct grade for low compliance score', () => {
      const lowScoreResults = { ...mockResults, complianceScore: 45 };
      render(
        <MISRAResultsDisplay
          results={lowScoreResults}
          onDownloadReport={mockOnDownloadReport}
          onAnalyzeAnother={mockOnAnalyzeAnother}
        />
      );

      expect(screen.getByText(/Grade F - Critical/i)).toBeInTheDocument();
    });
  });

  describe('Violation Categorization', () => {
    it('should display total violations count', () => {
      render(
        <MISRAResultsDisplay
          results={mockResults}
          onDownloadReport={mockOnDownloadReport}
          onAnalyzeAnother={mockOnAnalyzeAnother}
        />
      );

      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('Total Violations')).toBeInTheDocument();
    });

    it('should categorize violations by severity', () => {
      render(
        <MISRAResultsDisplay
          results={mockResults}
          onDownloadReport={mockOnDownloadReport}
          onAnalyzeAnother={mockOnAnalyzeAnother}
        />
      );

      // Check severity counts in the summary
      const mandatoryCount = screen.getAllByText('1').filter(el => 
        el.closest('[class*="MuiBox"]')?.textContent?.includes('Mandatory')
      );
      expect(mandatoryCount.length).toBeGreaterThan(0);

      // Check section headers
      expect(screen.getByText(/Mandatory Violations \(1\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Required Violations \(1\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Advisory Violations \(1\)/i)).toBeInTheDocument();
    });

    it('should display violations in separate tables by severity', () => {
      render(
        <MISRAResultsDisplay
          results={mockResults}
          onDownloadReport={mockOnDownloadReport}
          onAnalyzeAnother={mockOnAnalyzeAnother}
        />
      );

      // Check that each violation appears in the correct table
      expect(screen.getByText('MISRA-C-2012-1.1')).toBeInTheDocument();
      expect(screen.getByText('MISRA-C-2012-8.4')).toBeInTheDocument();
      expect(screen.getByText('MISRA-C-2012-2.2')).toBeInTheDocument();
    });
  });

  describe('Violation Details', () => {
    it('should display violation location (line:column)', () => {
      render(
        <MISRAResultsDisplay
          results={mockResults}
          onDownloadReport={mockOnDownloadReport}
          onAnalyzeAnother={mockOnAnalyzeAnother}
        />
      );

      expect(screen.getByText('15:8')).toBeInTheDocument();
      expect(screen.getByText('23:5')).toBeInTheDocument();
      expect(screen.getByText('45:12')).toBeInTheDocument();
    });

    it('should display violation messages', () => {
      render(
        <MISRAResultsDisplay
          results={mockResults}
          onDownloadReport={mockOnDownloadReport}
          onAnalyzeAnother={mockOnAnalyzeAnother}
        />
      );

      expect(screen.getByText('Non-standard language extension used')).toBeInTheDocument();
      expect(screen.getByText('Function not declared before use')).toBeInTheDocument();
      expect(screen.getByText('Unused variable detected')).toBeInTheDocument();
    });

    it('should have expandable violation details', () => {
      render(
        <MISRAResultsDisplay
          results={mockResults}
          onDownloadReport={mockOnDownloadReport}
          onAnalyzeAnother={mockOnAnalyzeAnother}
        />
      );

      // Verify violation is displayed
      expect(screen.getByText('MISRA-C-2012-1.1')).toBeInTheDocument();
      expect(screen.getByText('Non-standard language extension used')).toBeInTheDocument();
      
      // Verify expand buttons exist
      const expandButtons = screen.getAllByRole('button');
      expect(expandButtons.length).toBeGreaterThan(0);
    });
  });

  describe('File Information', () => {
    it('should display file name', () => {
      render(
        <MISRAResultsDisplay
          results={mockResults}
          onDownloadReport={mockOnDownloadReport}
          onAnalyzeAnother={mockOnAnalyzeAnother}
        />
      );

      expect(screen.getByText('test_file.c')).toBeInTheDocument();
    });

    it('should display language type for C files', () => {
      render(
        <MISRAResultsDisplay
          results={mockResults}
          onDownloadReport={mockOnDownloadReport}
          onAnalyzeAnother={mockOnAnalyzeAnother}
        />
      );

      expect(screen.getByText('MISRA C 2012')).toBeInTheDocument();
    });

    it('should display language type for C++ files', () => {
      const cppResults = {
        ...mockResults,
        fileInfo: { ...mockResults.fileInfo, type: 'CPP' }
      };
      
      render(
        <MISRAResultsDisplay
          results={cppResults}
          onDownloadReport={mockOnDownloadReport}
          onAnalyzeAnother={mockOnAnalyzeAnother}
        />
      );

      expect(screen.getByText('MISRA C++ 2008')).toBeInTheDocument();
    });

    it('should display analysis time', () => {
      render(
        <MISRAResultsDisplay
          results={mockResults}
          onDownloadReport={mockOnDownloadReport}
          onAnalyzeAnother={mockOnAnalyzeAnother}
        />
      );

      expect(screen.getByText('2s')).toBeInTheDocument();
    });
  });

  describe('Action Buttons', () => {
    it('should render download report button when reportUrl is provided', () => {
      render(
        <MISRAResultsDisplay
          results={mockResults}
          onDownloadReport={mockOnDownloadReport}
          onAnalyzeAnother={mockOnAnalyzeAnother}
        />
      );

      const downloadButton = screen.getByRole('button', { name: /Download PDF Report/i });
      expect(downloadButton).toBeInTheDocument();
    });

    it('should call onDownloadReport when download button is clicked', () => {
      render(
        <MISRAResultsDisplay
          results={mockResults}
          onDownloadReport={mockOnDownloadReport}
          onAnalyzeAnother={mockOnAnalyzeAnother}
        />
      );

      const downloadButton = screen.getByRole('button', { name: /Download PDF Report/i });
      fireEvent.click(downloadButton);

      expect(mockOnDownloadReport).toHaveBeenCalledTimes(1);
    });

    it('should not render download button when reportUrl is not provided', () => {
      const resultsWithoutReport = { ...mockResults, reportUrl: undefined };
      
      render(
        <MISRAResultsDisplay
          results={resultsWithoutReport}
          onDownloadReport={mockOnDownloadReport}
          onAnalyzeAnother={mockOnAnalyzeAnother}
        />
      );

      expect(screen.queryByRole('button', { name: /Download PDF Report/i })).not.toBeInTheDocument();
    });

    it('should render analyze another button', () => {
      render(
        <MISRAResultsDisplay
          results={mockResults}
          onDownloadReport={mockOnDownloadReport}
          onAnalyzeAnother={mockOnAnalyzeAnother}
        />
      );

      const analyzeButton = screen.getByRole('button', { name: /Analyze Another File/i });
      expect(analyzeButton).toBeInTheDocument();
    });

    it('should call onAnalyzeAnother when analyze another button is clicked', () => {
      render(
        <MISRAResultsDisplay
          results={mockResults}
          onDownloadReport={mockOnDownloadReport}
          onAnalyzeAnother={mockOnAnalyzeAnother}
        />
      );

      const analyzeButton = screen.getByRole('button', { name: /Analyze Another File/i });
      fireEvent.click(analyzeButton);

      expect(mockOnAnalyzeAnother).toHaveBeenCalledTimes(1);
    });
  });

  describe('Perfect Compliance', () => {
    it('should display perfect compliance message when no violations', () => {
      const perfectResults: AnalysisResults = {
        ...mockResults,
        complianceScore: 100,
        violations: [],
        summary: {
          totalViolations: 0,
          mandatory: 0,
          required: 0,
          advisory: 0
        }
      };

      render(
        <MISRAResultsDisplay
          results={perfectResults}
          onDownloadReport={mockOnDownloadReport}
          onAnalyzeAnother={mockOnAnalyzeAnother}
        />
      );

      expect(screen.getByText('Perfect Compliance!')).toBeInTheDocument();
      expect(screen.getByText(/No MISRA violations detected/i)).toBeInTheDocument();
    });

    it('should not display violation tables when no violations', () => {
      const perfectResults: AnalysisResults = {
        ...mockResults,
        complianceScore: 100,
        violations: []
      };

      render(
        <MISRAResultsDisplay
          results={perfectResults}
          onDownloadReport={mockOnDownloadReport}
          onAnalyzeAnother={mockOnAnalyzeAnother}
        />
      );

      expect(screen.queryByText(/Mandatory Violations/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Required Violations/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Advisory Violations/i)).not.toBeInTheDocument();
    });
  });

  describe('Severity Normalization', () => {
    it('should normalize "error" severity to "mandatory"', () => {
      const errorViolation: ViolationDetail = {
        ...mockViolations[0],
        severity: 'error' as any
      };
      
      const resultsWithError = {
        ...mockResults,
        violations: [errorViolation]
      };

      render(
        <MISRAResultsDisplay
          results={resultsWithError}
          onDownloadReport={mockOnDownloadReport}
          onAnalyzeAnother={mockOnAnalyzeAnother}
        />
      );

      expect(screen.getByText(/Mandatory Violations \(1\)/i)).toBeInTheDocument();
    });

    it('should normalize "warning" severity to "required"', () => {
      const warningViolation: ViolationDetail = {
        ...mockViolations[1],
        severity: 'warning' as any
      };
      
      const resultsWithWarning = {
        ...mockResults,
        violations: [warningViolation]
      };

      render(
        <MISRAResultsDisplay
          results={resultsWithWarning}
          onDownloadReport={mockOnDownloadReport}
          onAnalyzeAnother={mockOnAnalyzeAnother}
        />
      );

      expect(screen.getByText(/Required Violations \(1\)/i)).toBeInTheDocument();
    });

    it('should normalize "info" severity to "advisory"', () => {
      const infoViolation: ViolationDetail = {
        ...mockViolations[2],
        severity: 'info' as any
      };
      
      const resultsWithInfo = {
        ...mockResults,
        violations: [infoViolation]
      };

      render(
        <MISRAResultsDisplay
          results={resultsWithInfo}
          onDownloadReport={mockOnDownloadReport}
          onAnalyzeAnother={mockOnAnalyzeAnother}
        />
      );

      expect(screen.getByText(/Advisory Violations \(1\)/i)).toBeInTheDocument();
    });
  });
});

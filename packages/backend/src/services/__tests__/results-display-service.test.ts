/**
 * Unit tests for Results Display Service
 * Tests compliance score calculation, violation categorization, and report generation
 * 
 * Requirements: 4.1, 4.2, 4.5, 7.1
 */

import { ResultsDisplayService, AnalysisResultInput, ViolationDetail } from '../results-display-service';

// Mock AWS SDK S3 client
const mockS3Send = jest.fn();
jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({
    send: mockS3Send,
  })),
  PutObjectCommand: jest.fn(),
  GetObjectCommand: jest.fn(),
}));

// Mock getSignedUrl
jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('https://mock-presigned-url.com/report.pdf'),
}));

// Mock ReportGenerator
jest.mock('../misra-analysis/report-generator', () => {
  return {
    ReportGenerator: jest.fn().mockImplementation(() => ({
      generatePDF: jest.fn().mockResolvedValue(Buffer.from('Mock PDF content')),
    })),
  };
});

describe('ResultsDisplayService', () => {
  let service: ResultsDisplayService;

  const mockViolations: ViolationDetail[] = [
    {
      ruleId: 'MISRA-C-2012-1.1',
      ruleName: 'All code shall conform to ISO 9899:1990',
      severity: 'mandatory',
      line: 10,
      column: 5,
      message: 'Non-standard language extension used',
      codeSnippet: 'int x = 5;',
      category: 'language',
    },
    {
      ruleId: 'MISRA-C-2012-8.4',
      ruleName: 'A compatible declaration shall be visible',
      severity: 'required',
      line: 15,
      column: 8,
      message: 'Function not declared before use',
      codeSnippet: 'undeclared_function();',
      category: 'declarations',
    },
    {
      ruleId: 'MISRA-C-2012-2.2',
      ruleName: 'There shall be no dead code',
      severity: 'advisory',
      line: 20,
      column: 3,
      message: 'Unused variable detected',
      codeSnippet: 'int unused_var;',
      category: 'optimization',
    },
  ];

  const mockAnalysisResult: AnalysisResultInput = {
    analysisId: 'analysis-123',
    fileId: 'file-456',
    fileName: 'test.c',
    language: 'C',
    violations: mockViolations,
    rulesChecked: 50,
    timestamp: Date.now(),
    userId: 'user-789',
    organizationId: 'org-101',
  };

  beforeEach(() => {
    service = new ResultsDisplayService('test-bucket');
    mockS3Send.mockReset();
  });

  describe('formatResults', () => {
    it('should format analysis results with compliance score and categorization', () => {
      const result = service.formatResults(mockAnalysisResult);

      expect(result.analysisId).toBe('analysis-123');
      expect(result.fileId).toBe('file-456');
      expect(result.fileName).toBe('test.c');
      expect(result.language).toBe('C');
      expect(result.complianceScore).toBeDefined();
      expect(result.violations).toBeDefined();
      expect(result.summary).toBeDefined();
    });

    it('should include compliance score with percentage, grade, and status', () => {
      const result = service.formatResults(mockAnalysisResult);

      expect(result.complianceScore.percentage).toBeGreaterThanOrEqual(0);
      expect(result.complianceScore.percentage).toBeLessThanOrEqual(100);
      expect(result.complianceScore.grade).toMatch(/^[A-F]$/);
      expect(result.complianceScore.status).toMatch(
        /^(excellent|good|moderate|poor|critical)$/
      );
    });

    it('should categorize violations by severity', () => {
      const result = service.formatResults(mockAnalysisResult);

      expect(result.violations.bySeverity.mandatory).toHaveLength(1);
      expect(result.violations.bySeverity.required).toHaveLength(1);
      expect(result.violations.bySeverity.advisory).toHaveLength(1);
      expect(result.violations.counts.total).toBe(3);
    });

    it('should calculate summary statistics correctly', () => {
      const result = service.formatResults(mockAnalysisResult);

      expect(result.summary.totalViolations).toBe(3);
      expect(result.summary.rulesChecked).toBe(50);
      expect(result.summary.rulesViolated).toBe(3); // 3 unique rules
      expect(result.summary.compliancePercentage).toBe(result.complianceScore.percentage);
    });
  });

  describe('calculateComplianceScore', () => {
    it('should calculate 100% compliance for no violations', () => {
      const score = service.calculateComplianceScore([], 50);

      expect(score.percentage).toBe(100);
      expect(score.grade).toBe('A');
      expect(score.status).toBe('excellent');
    });

    it('should calculate compliance score with weighted violations', () => {
      const score = service.calculateComplianceScore(mockViolations, 50);

      // Weighted violations: 1*3 + 1*2 + 1*1 = 6
      // Max weighted score: 50*3 = 150
      // Violation percentage: (6/150)*100 = 4%
      // Compliance: 100 - 4 = 96%
      expect(score.percentage).toBeCloseTo(96, 0);
      expect(score.grade).toBe('A');
      expect(score.status).toBe('excellent');
    });

    it('should assign grade A for compliance >= 95%', () => {
      const score = service.calculateComplianceScore([], 50);

      expect(score.grade).toBe('A');
      expect(score.status).toBe('excellent');
    });

    it('should assign grade B for compliance >= 85% and < 95%', () => {
      // Create violations to get ~90% compliance
      const violations: ViolationDetail[] = Array(8).fill(null).map((_, i) => ({
        ruleId: `RULE-${i}`,
        ruleName: 'Test rule',
        severity: 'advisory' as const,
        line: i,
        column: 0,
        message: 'Test',
        codeSnippet: 'test',
      }));

      const score = service.calculateComplianceScore(violations, 50);

      expect(score.percentage).toBeGreaterThanOrEqual(85);
      expect(score.percentage).toBeLessThan(95);
      expect(score.grade).toBe('B');
      expect(score.status).toBe('good');
    });

    it('should assign grade C for compliance >= 70% and < 85%', () => {
      // Create violations to get ~75% compliance
      // With 50 rules and advisory violations (weight 1):
      // Need (50*3 - target_compliance*50*3/100) violations
      // For 75%: (150 - 112.5) = 37.5 weighted violations = 38 advisory violations
      const violations: ViolationDetail[] = Array(38).fill(null).map((_, i) => ({
        ruleId: `RULE-${i}`,
        ruleName: 'Test rule',
        severity: 'advisory' as const,
        line: i,
        column: 0,
        message: 'Test',
        codeSnippet: 'test',
      }));

      const score = service.calculateComplianceScore(violations, 50);

      expect(score.percentage).toBeGreaterThanOrEqual(70);
      expect(score.percentage).toBeLessThan(85);
      expect(score.grade).toBe('C');
      expect(score.status).toBe('moderate');
    });

    it('should assign grade D for compliance >= 50% and < 70%', () => {
      // Create violations to get ~60% compliance
      // For 60%: (150 - 90) = 60 weighted violations = 60 advisory violations
      const violations: ViolationDetail[] = Array(60).fill(null).map((_, i) => ({
        ruleId: `RULE-${i}`,
        ruleName: 'Test rule',
        severity: 'advisory' as const,
        line: i,
        column: 0,
        message: 'Test',
        codeSnippet: 'test',
      }));

      const score = service.calculateComplianceScore(violations, 50);

      expect(score.percentage).toBeGreaterThanOrEqual(50);
      expect(score.percentage).toBeLessThan(70);
      expect(score.grade).toBe('D');
      expect(score.status).toBe('poor');
    });

    it('should assign grade F for compliance < 50%', () => {
      // Create many mandatory violations to get low compliance
      const violations: ViolationDetail[] = Array(30).fill(null).map((_, i) => ({
        ruleId: `RULE-${i}`,
        ruleName: 'Test rule',
        severity: 'mandatory' as const,
        line: i,
        column: 0,
        message: 'Test',
        codeSnippet: 'test',
      }));

      const score = service.calculateComplianceScore(violations, 50);

      expect(score.percentage).toBeLessThan(50);
      expect(score.grade).toBe('F');
      expect(score.status).toBe('critical');
    });

    it('should weight mandatory violations more heavily than required', () => {
      const mandatoryViolations: ViolationDetail[] = [{
        ruleId: 'RULE-1',
        ruleName: 'Test',
        severity: 'mandatory',
        line: 1,
        column: 0,
        message: 'Test',
        codeSnippet: 'test',
      }];

      const requiredViolations: ViolationDetail[] = [{
        ruleId: 'RULE-2',
        ruleName: 'Test',
        severity: 'required',
        line: 1,
        column: 0,
        message: 'Test',
        codeSnippet: 'test',
      }];

      const mandatoryScore = service.calculateComplianceScore(mandatoryViolations, 50);
      const requiredScore = service.calculateComplianceScore(requiredViolations, 50);

      expect(mandatoryScore.percentage).toBeLessThan(requiredScore.percentage);
    });
  });

  describe('categorizeViolations', () => {
    it('should categorize violations by severity', () => {
      const categorization = service.categorizeViolations(mockViolations);

      expect(categorization.bySeverity.mandatory).toHaveLength(1);
      expect(categorization.bySeverity.required).toHaveLength(1);
      expect(categorization.bySeverity.advisory).toHaveLength(1);
    });

    it('should count violations correctly', () => {
      const categorization = service.categorizeViolations(mockViolations);

      expect(categorization.counts.mandatory).toBe(1);
      expect(categorization.counts.required).toBe(1);
      expect(categorization.counts.advisory).toBe(1);
      expect(categorization.counts.total).toBe(3);
    });

    it('should handle empty violations array', () => {
      const categorization = service.categorizeViolations([]);

      expect(categorization.bySeverity.mandatory).toHaveLength(0);
      expect(categorization.bySeverity.required).toHaveLength(0);
      expect(categorization.bySeverity.advisory).toHaveLength(0);
      expect(categorization.counts.total).toBe(0);
    });

    it('should handle violations with only one severity', () => {
      const violations: ViolationDetail[] = [
        {
          ruleId: 'RULE-1',
          ruleName: 'Test',
          severity: 'mandatory',
          line: 1,
          column: 0,
          message: 'Test',
          codeSnippet: 'test',
        },
        {
          ruleId: 'RULE-2',
          ruleName: 'Test',
          severity: 'mandatory',
          line: 2,
          column: 0,
          message: 'Test',
          codeSnippet: 'test',
        },
      ];

      const categorization = service.categorizeViolations(violations);

      expect(categorization.bySeverity.mandatory).toHaveLength(2);
      expect(categorization.bySeverity.required).toHaveLength(0);
      expect(categorization.bySeverity.advisory).toHaveLength(0);
      expect(categorization.counts.total).toBe(2);
    });
  });

  describe('generateDownloadableReport', () => {
    it('should generate PDF report and return presigned URL', async () => {
      // Mock S3 - report doesn't exist (throws NoSuchKey error)
      mockS3Send.mockRejectedValueOnce({ name: 'NoSuchKey' });
      // Mock S3 - successful put
      mockS3Send.mockResolvedValueOnce({});

      const url = await service.generateDownloadableReport(mockAnalysisResult);

      expect(url).toBeDefined();
      expect(typeof url).toBe('string');
      expect(url).toContain('https://');
    });

    it('should store PDF in S3 with correct metadata', async () => {
      mockS3Send.mockRejectedValueOnce({ name: 'NoSuchKey' });
      mockS3Send.mockResolvedValueOnce({});

      await service.generateDownloadableReport(mockAnalysisResult);

      // Check that S3 send was called (once for get, once for put)
      expect(mockS3Send).toHaveBeenCalledTimes(2);
    });

    it('should reuse existing PDF report if available', async () => {
      // Mock S3 - report exists
      mockS3Send.mockResolvedValueOnce({
        Body: Buffer.from('Existing PDF') as any,
      });

      const url = await service.generateDownloadableReport(mockAnalysisResult);

      expect(url).toBeDefined();

      // Should only call GetObjectCommand, not PutObjectCommand
      expect(mockS3Send).toHaveBeenCalledTimes(1);
    });

    it('should throw error if PDF generation is disabled', async () => {
      await expect(
        service.generateDownloadableReport(mockAnalysisResult, { generatePDF: false })
      ).rejects.toThrow('PDF generation is required');
    });

    it('should use custom expiration hours if provided', async () => {
      mockS3Send.mockResolvedValueOnce({
        Body: Buffer.from('Existing PDF') as any,
      });

      const url = await service.generateDownloadableReport(mockAnalysisResult, {
        generatePDF: true,
        expirationHours: 24,
      });

      expect(url).toBeDefined();
      // URL should be generated with 24-hour expiration
    });
  });

  describe('formatForTestSystem', () => {
    it('should format results matching test system output', () => {
      const result = service.formatForTestSystem(mockAnalysisResult);

      expect(result.success).toBe(true);
      expect(result.complianceScore).toBeGreaterThanOrEqual(0);
      expect(result.complianceScore).toBeLessThanOrEqual(100);
      expect(result.violations).toEqual(mockViolations);
      expect(result.summary).toBeDefined();
      expect(result.timestamp).toBeDefined();
    });

    it('should include violation summary with counts by severity', () => {
      const result = service.formatForTestSystem(mockAnalysisResult);

      expect(result.summary.total).toBe(3);
      expect(result.summary.mandatory).toBe(1);
      expect(result.summary.required).toBe(1);
      expect(result.summary.advisory).toBe(1);
    });

    it('should format timestamp as ISO string', () => {
      const result = service.formatForTestSystem(mockAnalysisResult);

      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should handle zero violations', () => {
      const noViolationsResult: AnalysisResultInput = {
        ...mockAnalysisResult,
        violations: [],
      };

      const result = service.formatForTestSystem(noViolationsResult);

      expect(result.success).toBe(true);
      expect(result.complianceScore).toBe(100);
      expect(result.violations).toHaveLength(0);
      expect(result.summary.total).toBe(0);
    });
  });

  describe('Edge cases', () => {
    it('should handle analysis with zero rules checked', () => {
      const zeroRulesResult: AnalysisResultInput = {
        ...mockAnalysisResult,
        rulesChecked: 0,
      };

      const result = service.formatResults(zeroRulesResult);

      expect(result.complianceScore.percentage).toBe(100);
      expect(result.summary.rulesChecked).toBe(0);
    });

    it('should handle very large number of violations', () => {
      const manyViolations: ViolationDetail[] = Array(1000).fill(null).map((_, i) => ({
        ruleId: `RULE-${i}`,
        ruleName: 'Test rule',
        severity: 'advisory' as const,
        line: i,
        column: 0,
        message: 'Test violation',
        codeSnippet: 'test code',
      }));

      const largeResult: AnalysisResultInput = {
        ...mockAnalysisResult,
        violations: manyViolations,
        rulesChecked: 1000,
      };

      const result = service.formatResults(largeResult);

      expect(result.summary.totalViolations).toBe(1000);
      expect(result.violations.counts.total).toBe(1000);
    });

    it('should handle C++ language', () => {
      const cppResult: AnalysisResultInput = {
        ...mockAnalysisResult,
        language: 'CPP',
        fileName: 'test.cpp',
      };

      const result = service.formatResults(cppResult);

      expect(result.language).toBe('CPP');
      expect(result.fileName).toBe('test.cpp');
    });
  });
});

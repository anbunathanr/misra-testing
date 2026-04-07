/**
 * Unit tests for ReportGenerator
 * Requirements: 16.2
 */

import { ReportGenerator } from '../report-generator';
import { AnalysisResult, AnalysisStatus, Language, Violation } from '../../../types/misra-analysis';

// Mock pdfkit
jest.mock('pdfkit', () => {
  return jest.fn().mockImplementation(() => {
    const EventEmitter = require('events');
    const mockDoc = new EventEmitter();
    
    mockDoc.fontSize = jest.fn().mockReturnThis();
    mockDoc.font = jest.fn().mockReturnThis();
    mockDoc.text = jest.fn().mockReturnThis();
    mockDoc.moveDown = jest.fn().mockReturnThis();
    mockDoc.addPage = jest.fn().mockReturnThis();
    mockDoc.fillColor = jest.fn().mockReturnThis();
    mockDoc.rect = jest.fn().mockReturnThis();
    mockDoc.fillAndStroke = jest.fn().mockReturnThis();
    mockDoc.strokeColor = jest.fn().mockReturnThis();
    mockDoc.lineWidth = jest.fn().mockReturnThis();
    mockDoc.moveTo = jest.fn().mockReturnThis();
    mockDoc.lineTo = jest.fn().mockReturnThis();
    mockDoc.stroke = jest.fn().mockReturnThis();
    mockDoc.end = jest.fn(() => {
      // Simulate PDF generation
      const pdfBuffer = Buffer.from('%PDF-1.4\nMocked PDF content');
      setTimeout(() => {
        mockDoc.emit('data', pdfBuffer);
        mockDoc.emit('end');
      }, 0);
    });
    mockDoc.y = 100;
    mockDoc.x = 50;
    
    return mockDoc;
  });
});

describe('ReportGenerator', () => {
  let reportGenerator: ReportGenerator;

  beforeEach(() => {
    reportGenerator = new ReportGenerator();
  });

  describe('generatePDF', () => {
    it('should generate a PDF buffer', async () => {
      // Arrange
      const analysisResult: AnalysisResult = {
        analysisId: 'test-analysis-1',
        fileId: 'test-file-1',
        userId: 'test-user-1',
        language: Language.C,
        violations: [],
        summary: {
          totalViolations: 0,
          criticalCount: 0,
          majorCount: 0,
          minorCount: 0,
          compliancePercentage: 100,
        },
        createdAt: new Date().toISOString(),
        status: AnalysisStatus.COMPLETED,
      };

      // Act
      const pdfBuffer = await reportGenerator.generatePDF(analysisResult, 'test.c');

      // Assert
      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(0);
      
      // Verify PDF header (mocked)
      const pdfHeader = pdfBuffer.toString('utf-8', 0, 4);
      expect(pdfHeader).toBe('%PDF');
    });

    it('should generate PDF with violations', async () => {
      // Arrange
      const violations: Violation[] = [
        {
          ruleId: 'MISRA-C-1.1',
          ruleName: 'All code shall conform to ISO 9899:2011',
          severity: 'mandatory',
          line: 10,
          column: 5,
          message: 'Non-standard language extension detected',
          codeSnippet: 'typeof(int) x = 5;',
        },
        {
          ruleId: 'MISRA-C-8.1',
          ruleName: 'Types shall be explicitly specified',
          severity: 'required',
          line: 15,
          column: 1,
          message: 'Implicit int type',
          codeSnippet: 'static value = 10;',
        },
        {
          ruleId: 'MISRA-C-2.1',
          ruleName: 'A project shall not contain unreachable code',
          severity: 'advisory',
          line: 20,
          column: 3,
          message: 'Unreachable code detected',
          codeSnippet: 'return 0;\nint x = 5;',
        },
      ];

      const analysisResult: AnalysisResult = {
        analysisId: 'test-analysis-2',
        fileId: 'test-file-2',
        userId: 'test-user-1',
        language: Language.C,
        violations,
        summary: {
          totalViolations: 3,
          criticalCount: 1,
          majorCount: 1,
          minorCount: 1,
          compliancePercentage: 85.5,
        },
        createdAt: new Date().toISOString(),
        status: AnalysisStatus.COMPLETED,
      };

      // Act
      const pdfBuffer = await reportGenerator.generatePDF(analysisResult, 'violations.c');

      // Assert
      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(0);
    });

    it('should include executive summary with compliance percentage', async () => {
      // Arrange
      const analysisResult: AnalysisResult = {
        analysisId: 'test-analysis-3',
        fileId: 'test-file-3',
        userId: 'test-user-1',
        language: Language.CPP,
        violations: [],
        summary: {
          totalViolations: 0,
          criticalCount: 0,
          majorCount: 0,
          minorCount: 0,
          compliancePercentage: 100,
        },
        createdAt: new Date().toISOString(),
        status: AnalysisStatus.COMPLETED,
      };

      // Act
      const pdfBuffer = await reportGenerator.generatePDF(analysisResult, 'perfect.cpp');

      // Assert
      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(0);
    });

    it('should include severity breakdown', async () => {
      // Arrange
      const violations: Violation[] = [
        {
          ruleId: 'MISRA-C-1.1',
          ruleName: 'Rule 1',
          severity: 'mandatory',
          line: 1,
          column: 1,
          message: 'Test',
          codeSnippet: 'code',
        },
        {
          ruleId: 'MISRA-C-1.2',
          ruleName: 'Rule 2',
          severity: 'mandatory',
          line: 2,
          column: 1,
          message: 'Test',
          codeSnippet: 'code',
        },
        {
          ruleId: 'MISRA-C-2.1',
          ruleName: 'Rule 3',
          severity: 'required',
          line: 3,
          column: 1,
          message: 'Test',
          codeSnippet: 'code',
        },
        {
          ruleId: 'MISRA-C-3.1',
          ruleName: 'Rule 4',
          severity: 'advisory',
          line: 4,
          column: 1,
          message: 'Test',
          codeSnippet: 'code',
        },
      ];

      const analysisResult: AnalysisResult = {
        analysisId: 'test-analysis-4',
        fileId: 'test-file-4',
        userId: 'test-user-1',
        language: Language.C,
        violations,
        summary: {
          totalViolations: 4,
          criticalCount: 2,
          majorCount: 1,
          minorCount: 1,
          compliancePercentage: 75,
        },
        createdAt: new Date().toISOString(),
        status: AnalysisStatus.COMPLETED,
      };

      // Act
      const pdfBuffer = await reportGenerator.generatePDF(analysisResult, 'mixed.c');

      // Assert
      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(0);
    });

    it('should include detailed violations section', async () => {
      // Arrange
      const violations: Violation[] = [
        {
          ruleId: 'MISRA-C-8.4',
          ruleName: 'A compatible declaration shall be visible',
          severity: 'required',
          line: 42,
          column: 10,
          message: 'Function declared without prior declaration',
          codeSnippet: 'void myFunction() {\n  // implementation\n}',
        },
      ];

      const analysisResult: AnalysisResult = {
        analysisId: 'test-analysis-5',
        fileId: 'test-file-5',
        userId: 'test-user-1',
        language: Language.C,
        violations,
        summary: {
          totalViolations: 1,
          criticalCount: 0,
          majorCount: 1,
          minorCount: 0,
          compliancePercentage: 95,
        },
        createdAt: new Date().toISOString(),
        status: AnalysisStatus.COMPLETED,
      };

      // Act
      const pdfBuffer = await reportGenerator.generatePDF(analysisResult, 'detailed.c');

      // Assert
      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(0);
    });

    it('should include code snippets for violations', async () => {
      // Arrange
      const codeSnippet = `int main() {
  int x;
  printf("%d", x);  // Uninitialized variable
  return 0;
}`;

      const violations: Violation[] = [
        {
          ruleId: 'MISRA-C-9.1',
          ruleName: 'The value of an object shall not be read before being set',
          severity: 'mandatory',
          line: 3,
          column: 15,
          message: 'Variable "x" used before initialization',
          codeSnippet,
        },
      ];

      const analysisResult: AnalysisResult = {
        analysisId: 'test-analysis-6',
        fileId: 'test-file-6',
        userId: 'test-user-1',
        language: Language.C,
        violations,
        summary: {
          totalViolations: 1,
          criticalCount: 1,
          majorCount: 0,
          minorCount: 0,
          compliancePercentage: 90,
        },
        createdAt: new Date().toISOString(),
        status: AnalysisStatus.COMPLETED,
      };

      // Act
      const pdfBuffer = await reportGenerator.generatePDF(analysisResult, 'snippet.c');

      // Assert
      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(0);
    });

    it('should handle empty violations list', async () => {
      // Arrange
      const analysisResult: AnalysisResult = {
        analysisId: 'test-analysis-7',
        fileId: 'test-file-7',
        userId: 'test-user-1',
        language: Language.CPP,
        violations: [],
        summary: {
          totalViolations: 0,
          criticalCount: 0,
          majorCount: 0,
          minorCount: 0,
          compliancePercentage: 100,
        },
        createdAt: new Date().toISOString(),
        status: AnalysisStatus.COMPLETED,
      };

      // Act
      const pdfBuffer = await reportGenerator.generatePDF(analysisResult, 'clean.cpp');

      // Assert
      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(0);
    });

    it('should handle large number of violations', async () => {
      // Arrange
      const violations: Violation[] = Array.from({ length: 50 }, (_, i) => ({
        ruleId: `MISRA-C-${i + 1}.1`,
        ruleName: `Rule ${i + 1}`,
        severity: (i % 3 === 0 ? 'mandatory' : i % 3 === 1 ? 'required' : 'advisory') as 'mandatory' | 'required' | 'advisory',
        line: i + 1,
        column: 1,
        message: `Violation ${i + 1}`,
        codeSnippet: `code line ${i + 1}`,
      }));

      const analysisResult: AnalysisResult = {
        analysisId: 'test-analysis-8',
        fileId: 'test-file-8',
        userId: 'test-user-1',
        language: Language.C,
        violations,
        summary: {
          totalViolations: 50,
          criticalCount: 17,
          majorCount: 17,
          minorCount: 16,
          compliancePercentage: 50,
        },
        createdAt: new Date().toISOString(),
        status: AnalysisStatus.COMPLETED,
      };

      // Act
      const pdfBuffer = await reportGenerator.generatePDF(analysisResult, 'many-violations.c');

      // Assert
      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(0);
    });

    it('should group violations by severity correctly', async () => {
      // Arrange
      const violations: Violation[] = [
        {
          ruleId: 'MISRA-C-1.1',
          ruleName: 'Mandatory Rule',
          severity: 'mandatory',
          line: 1,
          column: 1,
          message: 'Mandatory violation',
          codeSnippet: 'code1',
        },
        {
          ruleId: 'MISRA-C-2.1',
          ruleName: 'Required Rule',
          severity: 'required',
          line: 2,
          column: 1,
          message: 'Required violation',
          codeSnippet: 'code2',
        },
        {
          ruleId: 'MISRA-C-3.1',
          ruleName: 'Advisory Rule',
          severity: 'advisory',
          line: 3,
          column: 1,
          message: 'Advisory violation',
          codeSnippet: 'code3',
        },
      ];

      const analysisResult: AnalysisResult = {
        analysisId: 'test-analysis-9',
        fileId: 'test-file-9',
        userId: 'test-user-1',
        language: Language.C,
        violations,
        summary: {
          totalViolations: 3,
          criticalCount: 1,
          majorCount: 1,
          minorCount: 1,
          compliancePercentage: 80,
        },
        createdAt: new Date().toISOString(),
        status: AnalysisStatus.COMPLETED,
      };

      // Act
      const pdfBuffer = await reportGenerator.generatePDF(analysisResult, 'grouped.c');

      // Assert
      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(0);
    });
  });
});

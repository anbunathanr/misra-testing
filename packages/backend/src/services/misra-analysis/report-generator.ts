/**
 * Report Generator for MISRA Analysis Results
 * Generates PDF reports with executive summary and detailed violations
 * 
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 */

import PDFDocument from 'pdfkit';
import { AnalysisResult, Violation } from '../../types/misra-analysis';

interface ViolationsBySeverity {
  mandatory: Violation[];
  required: Violation[];
  advisory: Violation[];
}

export class ReportGenerator {
  /**
   * Generate PDF report for MISRA analysis results
   * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
   */
  async generatePDF(analysisResult: AnalysisResult, fileName: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margins: { top: 50, bottom: 50, left: 50, right: 50 },
        });

        const chunks: Buffer[] = [];

        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Generate report content
        this.addTitlePage(doc, fileName);
        this.addExecutiveSummary(doc, analysisResult); // Requirement 8.1, 8.2, 8.3
        this.addDetailedViolations(doc, analysisResult); // Requirement 8.4, 8.5

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Add title page to the report
   */
  private addTitlePage(doc: PDFKit.PDFDocument, fileName: string): void {
    doc
      .fontSize(28)
      .font('Helvetica-Bold')
      .text('MISRA Compliance Report', { align: 'center' });

    doc.moveDown(2);

    doc
      .fontSize(16)
      .font('Helvetica')
      .text(`File: ${fileName}`, { align: 'center' });

    doc.moveDown(1);

    doc
      .fontSize(12)
      .text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });

    doc.moveDown(3);

    doc
      .fontSize(10)
      .font('Helvetica-Oblique')
      .text('MISRA Platform - Static Code Analysis', { align: 'center' });

    doc.addPage();
  }

  /**
   * Add executive summary section
   * Requirements: 8.1, 8.2, 8.3
   * - 8.1: Include executive summary section
   * - 8.2: Show compliance percentage
   * - 8.3: Show severity breakdown
   */
  private addExecutiveSummary(doc: PDFKit.PDFDocument, analysisResult: AnalysisResult): void {
    doc
      .fontSize(20)
      .font('Helvetica-Bold')
      .text('Executive Summary', { underline: true });

    doc.moveDown(1);

    // Compliance percentage (Requirement 8.2)
    const compliance = analysisResult.summary.compliancePercentage;
    const complianceColor = this.getComplianceColor(compliance);

    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .fillColor(complianceColor)
      .text(`Compliance: ${compliance.toFixed(2)}%`);

    doc.fillColor('black');
    doc.moveDown(1);

    // Total violations
    doc
      .fontSize(12)
      .font('Helvetica')
      .text(`Total Violations: ${analysisResult.summary.totalViolations}`);

    doc.moveDown(1);

    // Severity breakdown (Requirement 8.3)
    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('Violations by Severity:');

    doc.moveDown(0.5);

    doc
      .fontSize(12)
      .font('Helvetica')
      .fillColor('#DC2626')
      .text(`  • Mandatory: ${analysisResult.summary.criticalCount}`, { continued: false });

    doc
      .fillColor('#F59E0B')
      .text(`  • Required: ${analysisResult.summary.majorCount}`, { continued: false });

    doc
      .fillColor('#3B82F6')
      .text(`  • Advisory: ${analysisResult.summary.minorCount}`, { continued: false });

    doc.fillColor('black');
    doc.moveDown(1);

    // Overall assessment
    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('Overall Assessment:');

    doc.moveDown(0.5);

    const assessment = this.getAssessment(compliance);
    doc
      .fontSize(12)
      .font('Helvetica')
      .text(assessment, { align: 'justify' });

    doc.addPage();
  }

  /**
   * Add detailed violations section
   * Requirements: 8.4, 8.5
   * - 8.4: Group violations by severity
   * - 8.5: Include code snippets
   */
  private addDetailedViolations(doc: PDFKit.PDFDocument, analysisResult: AnalysisResult): void {
    doc
      .fontSize(20)
      .font('Helvetica-Bold')
      .text('Detailed Violations', { underline: true });

    doc.moveDown(1);

    if (analysisResult.violations.length === 0) {
      doc
        .fontSize(12)
        .font('Helvetica')
        .text('No violations found. Code is fully compliant!', { align: 'center' });
      return;
    }

    // Group violations by severity (Requirement 8.4)
    const grouped = this.groupBySeverity(analysisResult.violations);

    // Mandatory violations
    if (grouped.mandatory.length > 0) {
      this.addViolationSection(doc, 'Mandatory Violations', grouped.mandatory, '#DC2626');
    }

    // Required violations
    if (grouped.required.length > 0) {
      this.addViolationSection(doc, 'Required Violations', grouped.required, '#F59E0B');
    }

    // Advisory violations
    if (grouped.advisory.length > 0) {
      this.addViolationSection(doc, 'Advisory Violations', grouped.advisory, '#3B82F6');
    }
  }

  /**
   * Add a section for violations of a specific severity
   */
  private addViolationSection(
    doc: PDFKit.PDFDocument,
    title: string,
    violations: Violation[],
    color: string
  ): void {
    doc
      .fontSize(16)
      .font('Helvetica-Bold')
      .fillColor(color)
      .text(title);

    doc.fillColor('black');
    doc.moveDown(0.5);

    doc
      .fontSize(10)
      .font('Helvetica')
      .text(`Total: ${violations.length} violation(s)`);

    doc.moveDown(1);

    violations.forEach((violation, index) => {
      // Check if we need a new page
      if (doc.y > 650) {
        doc.addPage();
      }

      // Violation header
      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .text(`${index + 1}. Rule ${violation.ruleId}: ${violation.ruleName}`);

      doc.moveDown(0.3);

      // Location
      doc
        .fontSize(10)
        .font('Helvetica')
        .text(`Location: Line ${violation.line}, Column ${violation.column}`);

      doc.moveDown(0.3);

      // Message
      doc
        .fontSize(10)
        .font('Helvetica')
        .text(`Message: ${violation.message}`, { align: 'justify' });

      doc.moveDown(0.5);

      // Code snippet (Requirement 8.5)
      doc
        .fontSize(9)
        .font('Courier')
        .fillColor('#374151')
        .text('Code Snippet:', { continued: false });

      doc.moveDown(0.2);

      doc
        .fontSize(8)
        .font('Courier')
        .fillColor('#1F2937')
        .rect(doc.x - 5, doc.y - 5, 500, this.calculateSnippetHeight(violation.codeSnippet))
        .fillAndStroke('#F3F4F6', '#E5E7EB');

      doc
        .fillColor('#1F2937')
        .text(violation.codeSnippet, {
          width: 490,
          align: 'left',
        });

      doc.fillColor('black');
      doc.moveDown(1);

      // Separator
      if (index < violations.length - 1) {
        doc
          .strokeColor('#E5E7EB')
          .lineWidth(1)
          .moveTo(50, doc.y)
          .lineTo(545, doc.y)
          .stroke();

        doc.moveDown(1);
      }
    });

    doc.addPage();
  }

  /**
   * Group violations by severity
   */
  private groupBySeverity(violations: Violation[]): ViolationsBySeverity {
    return {
      mandatory: violations.filter((v) => v.severity === 'mandatory'),
      required: violations.filter((v) => v.severity === 'required'),
      advisory: violations.filter((v) => v.severity === 'advisory'),
    };
  }

  /**
   * Get color based on compliance percentage
   */
  private getComplianceColor(compliance: number): string {
    if (compliance >= 90) return '#10B981'; // Green
    if (compliance >= 70) return '#F59E0B'; // Orange
    return '#DC2626'; // Red
  }

  /**
   * Get assessment text based on compliance percentage
   */
  private getAssessment(compliance: number): string {
    if (compliance >= 95) {
      return 'Excellent! The code demonstrates high compliance with MISRA standards. Only minor issues remain.';
    }
    if (compliance >= 85) {
      return 'Good compliance level. The code follows most MISRA guidelines, but some improvements are recommended.';
    }
    if (compliance >= 70) {
      return 'Moderate compliance. Several violations need to be addressed to meet MISRA standards.';
    }
    if (compliance >= 50) {
      return 'Low compliance. Significant work is required to bring the code up to MISRA standards.';
    }
    return 'Critical compliance issues detected. Immediate attention is required to address multiple violations.';
  }

  /**
   * Calculate height needed for code snippet box
   */
  private calculateSnippetHeight(snippet: string): number {
    const lines = snippet.split('\n').length;
    return Math.max(lines * 12 + 10, 30);
  }
}

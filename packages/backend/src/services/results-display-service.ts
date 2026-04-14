/**
 * Results Display Service
 * Formats and displays MISRA analysis results with compliance scores and violation categorization
 * 
 * Requirements: 4.1, 4.2, 4.5, 7.1
 * Task: 6.1 - Create results display service
 */

import { ReportGenerator } from './misra-analysis/report-generator';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export interface ViolationDetail {
  ruleId: string;
  ruleName: string;
  severity: 'mandatory' | 'required' | 'advisory';
  line: number;
  column: number;
  message: string;
  codeSnippet: string;
  category?: string;
}

export interface AnalysisResultInput {
  analysisId: string;
  fileId: string;
  fileName: string;
  language: 'C' | 'CPP';
  violations: ViolationDetail[];
  rulesChecked: number;
  timestamp: number;
  userId: string;
  organizationId?: string;
}

export interface ComplianceScore {
  percentage: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  status: 'excellent' | 'good' | 'moderate' | 'poor' | 'critical';
}

export interface ViolationCategorization {
  bySeverity: {
    mandatory: ViolationDetail[];
    required: ViolationDetail[];
    advisory: ViolationDetail[];
  };
  counts: {
    mandatory: number;
    required: number;
    advisory: number;
    total: number;
  };
}

export interface FormattedResults {
  analysisId: string;
  fileId: string;
  fileName: string;
  language: 'C' | 'CPP';
  complianceScore: ComplianceScore;
  violations: ViolationCategorization;
  summary: {
    totalViolations: number;
    rulesChecked: number;
    rulesViolated: number;
    compliancePercentage: number;
  };
  timestamp: number;
  reportDownloadUrl?: string;
}

export interface ReportGenerationOptions {
  generatePDF: boolean;
  storageLocation?: string;
  expirationHours?: number;
}

/**
 * Results Display Service
 * Formats analysis results, calculates compliance scores, and generates reports
 */
export class ResultsDisplayService {
  private reportGenerator: ReportGenerator;
  private s3Client: S3Client;
  private bucketName: string;

  constructor(bucketName?: string) {
    this.reportGenerator = new ReportGenerator();
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
    });
    this.bucketName = bucketName || process.env.REPORTS_BUCKET || 'misra-platform-reports';
  }

  /**
   * Format analysis results matching test system output format
   * Requirement 7.1: Format results matching test system output format
   */
  formatResults(analysisResult: AnalysisResultInput): FormattedResults {
    // Calculate compliance score (Requirement 4.1)
    const complianceScore = this.calculateComplianceScore(
      analysisResult.violations,
      analysisResult.rulesChecked
    );

    // Categorize violations by severity (Requirement 4.2)
    const violations = this.categorizeViolations(analysisResult.violations);

    // Get unique rules violated
    const uniqueRules = new Set(analysisResult.violations.map(v => v.ruleId));

    return {
      analysisId: analysisResult.analysisId,
      fileId: analysisResult.fileId,
      fileName: analysisResult.fileName,
      language: analysisResult.language,
      complianceScore,
      violations,
      summary: {
        totalViolations: analysisResult.violations.length,
        rulesChecked: analysisResult.rulesChecked,
        rulesViolated: uniqueRules.size,
        compliancePercentage: complianceScore.percentage,
      },
      timestamp: analysisResult.timestamp,
    };
  }

  /**
   * Calculate compliance score and grade
   * Requirement 4.1: Display analysis results with compliance percentage
   */
  calculateComplianceScore(
    violations: ViolationDetail[],
    rulesChecked: number
  ): ComplianceScore {
    // Calculate weighted score based on severity
    const weights = {
      mandatory: 3,
      required: 2,
      advisory: 1,
    };

    // Count violations by severity
    const counts = {
      mandatory: violations.filter(v => v.severity === 'mandatory').length,
      required: violations.filter(v => v.severity === 'required').length,
      advisory: violations.filter(v => v.severity === 'advisory').length,
    };

    // Calculate weighted violation score
    const weightedViolations =
      counts.mandatory * weights.mandatory +
      counts.required * weights.required +
      counts.advisory * weights.advisory;

    // Maximum possible weighted score (if all rules were violated with mandatory severity)
    const maxWeightedScore = rulesChecked * weights.mandatory;

    // Calculate compliance percentage (100% - violation percentage)
    const violationPercentage = maxWeightedScore > 0
      ? (weightedViolations / maxWeightedScore) * 100
      : 0;

    const compliancePercentage = Math.max(0, 100 - violationPercentage);

    // Determine grade and status
    let grade: 'A' | 'B' | 'C' | 'D' | 'F';
    let status: 'excellent' | 'good' | 'moderate' | 'poor' | 'critical';

    if (compliancePercentage >= 95) {
      grade = 'A';
      status = 'excellent';
    } else if (compliancePercentage >= 85) {
      grade = 'B';
      status = 'good';
    } else if (compliancePercentage >= 70) {
      grade = 'C';
      status = 'moderate';
    } else if (compliancePercentage >= 50) {
      grade = 'D';
      status = 'poor';
    } else {
      grade = 'F';
      status = 'critical';
    }

    return {
      percentage: Math.round(compliancePercentage * 100) / 100,
      grade,
      status,
    };
  }

  /**
   * Categorize violations by severity
   * Requirement 4.2: Categorize violations by severity (error/warning/info)
   */
  categorizeViolations(violations: ViolationDetail[]): ViolationCategorization {
    const bySeverity = {
      mandatory: violations.filter(v => v.severity === 'mandatory'),
      required: violations.filter(v => v.severity === 'required'),
      advisory: violations.filter(v => v.severity === 'advisory'),
    };

    return {
      bySeverity,
      counts: {
        mandatory: bySeverity.mandatory.length,
        required: bySeverity.required.length,
        advisory: bySeverity.advisory.length,
        total: violations.length,
      },
    };
  }

  /**
   * Generate downloadable PDF report
   * Requirement 4.5: Generate downloadable PDF reports with executive summary
   * Requirement 7.1: Create downloadable PDF report generation using existing infrastructure
   */
  async generateDownloadableReport(
    analysisResult: AnalysisResultInput,
    options: ReportGenerationOptions = { generatePDF: true }
  ): Promise<string> {
    if (!options.generatePDF) {
      throw new Error('PDF generation is required');
    }

    // Check if report already exists in S3
    const reportKey = `reports/${analysisResult.fileId}/${analysisResult.analysisId}.pdf`;

    try {
      // Try to get existing report
      await this.s3Client.send(
        new GetObjectCommand({
          Bucket: this.bucketName,
          Key: reportKey,
        })
      );

      console.log('Report already exists, generating presigned URL');
    } catch (error: any) {
      // Report doesn't exist, generate it
      if (error.name === 'NoSuchKey' || error.Code === 'NoSuchKey') {
        console.log('Generating new PDF report...');

        // Convert to format expected by ReportGenerator
        const reportData = this.convertToReportFormat(analysisResult);

        // Generate PDF using existing infrastructure
        const pdfBuffer = await this.reportGenerator.generatePDF(
          reportData,
          analysisResult.fileName
        );

        // Store PDF in S3
        await this.s3Client.send(
          new PutObjectCommand({
            Bucket: this.bucketName,
            Key: reportKey,
            Body: pdfBuffer,
            ContentType: 'application/pdf',
            Metadata: {
              fileId: analysisResult.fileId,
              analysisId: analysisResult.analysisId,
              fileName: analysisResult.fileName,
              timestamp: analysisResult.timestamp.toString(),
            },
          })
        );

        console.log('PDF report generated and stored in S3');
      } else {
        throw error;
      }
    }

    // Generate presigned URL for download (expires in specified hours, default 1 hour)
    const expirationSeconds = (options.expirationHours || 1) * 3600;

    const downloadUrl = await getSignedUrl(
      this.s3Client,
      new GetObjectCommand({
        Bucket: this.bucketName,
        Key: reportKey,
      }),
      { expiresIn: expirationSeconds }
    );

    return downloadUrl;
  }

  /**
   * Convert analysis result to format expected by ReportGenerator
   */
  private convertToReportFormat(analysisResult: AnalysisResultInput): any {
    const complianceScore = this.calculateComplianceScore(
      analysisResult.violations,
      analysisResult.rulesChecked
    );

    const categorization = this.categorizeViolations(analysisResult.violations);

    return {
      analysisId: analysisResult.analysisId,
      fileId: analysisResult.fileId,
      fileName: analysisResult.fileName,
      userId: analysisResult.userId,
      language: analysisResult.language,
      violations: analysisResult.violations,
      summary: {
        totalViolations: analysisResult.violations.length,
        criticalCount: categorization.counts.mandatory,
        majorCount: categorization.counts.required,
        minorCount: categorization.counts.advisory,
        compliancePercentage: complianceScore.percentage,
      },
      createdAt: new Date(analysisResult.timestamp).toISOString(),
      status: 'COMPLETED',
    };
  }

  /**
   * Format results for test system output compatibility
   * Matches the exact format used in test-button.html
   */
  formatForTestSystem(analysisResult: AnalysisResultInput): {
    success: boolean;
    complianceScore: number;
    violations: ViolationDetail[];
    summary: {
      total: number;
      mandatory: number;
      required: number;
      advisory: number;
    };
    timestamp: string;
  } {
    const categorization = this.categorizeViolations(analysisResult.violations);
    const complianceScore = this.calculateComplianceScore(
      analysisResult.violations,
      analysisResult.rulesChecked
    );

    return {
      success: true,
      complianceScore: complianceScore.percentage,
      violations: analysisResult.violations,
      summary: {
        total: analysisResult.violations.length,
        mandatory: categorization.counts.mandatory,
        required: categorization.counts.required,
        advisory: categorization.counts.advisory,
      },
      timestamp: new Date(analysisResult.timestamp).toISOString(),
    };
  }
}

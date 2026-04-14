/**
 * Example usage of ResultsDisplayService
 * Shows how to format analysis results and generate PDF reports
 * 
 * This file demonstrates the integration of the ResultsDisplayService
 * in Lambda functions and other backend services.
 */

import { ResultsDisplayService, AnalysisResultInput } from './results-display-service';

/**
 * Example 1: Format analysis results for API response
 * Use case: GET /analysis/results/:fileId endpoint
 */
export async function formatAnalysisResultsForAPI(
  analysisData: any
): Promise<any> {
  const service = new ResultsDisplayService();

  // Convert raw analysis data to service input format
  const analysisInput: AnalysisResultInput = {
    analysisId: analysisData.analysisId,
    fileId: analysisData.fileId,
    fileName: analysisData.fileName,
    language: analysisData.language,
    violations: analysisData.violations,
    rulesChecked: analysisData.rulesChecked,
    timestamp: analysisData.timestamp,
    userId: analysisData.userId,
    organizationId: analysisData.organizationId,
  };

  // Format results with compliance score and categorization
  const formattedResults = service.formatResults(analysisInput);

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify({
      analysisId: formattedResults.analysisId,
      fileId: formattedResults.fileId,
      fileName: formattedResults.fileName,
      language: formattedResults.language,
      complianceScore: {
        percentage: formattedResults.complianceScore.percentage,
        grade: formattedResults.complianceScore.grade,
        status: formattedResults.complianceScore.status,
      },
      violations: {
        total: formattedResults.violations.counts.total,
        mandatory: formattedResults.violations.counts.mandatory,
        required: formattedResults.violations.counts.required,
        advisory: formattedResults.violations.counts.advisory,
        details: formattedResults.violations.bySeverity,
      },
      summary: formattedResults.summary,
      timestamp: formattedResults.timestamp,
    }),
  };
}

/**
 * Example 2: Generate PDF report and return download URL
 * Use case: GET /reports/:fileId endpoint
 */
export async function generatePDFReportForDownload(
  analysisData: any,
  bucketName: string
): Promise<any> {
  const service = new ResultsDisplayService(bucketName);

  // Convert to service input format
  const analysisInput: AnalysisResultInput = {
    analysisId: analysisData.analysisId,
    fileId: analysisData.fileId,
    fileName: analysisData.fileName,
    language: analysisData.language,
    violations: analysisData.violations,
    rulesChecked: analysisData.rulesChecked,
    timestamp: analysisData.timestamp,
    userId: analysisData.userId,
    organizationId: analysisData.organizationId,
  };

  // Generate PDF report and get presigned download URL
  const downloadUrl = await service.generateDownloadableReport(analysisInput, {
    generatePDF: true,
    expirationHours: 1, // URL expires in 1 hour
  });

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify({
      fileId: analysisInput.fileId,
      analysisId: analysisInput.analysisId,
      fileName: `${analysisInput.fileName}_misra_report.pdf`,
      downloadUrl: downloadUrl,
      expiresAt: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
    }),
  };
}

/**
 * Example 3: Format results for test system compatibility
 * Use case: Automated testing workflow (test-button.html)
 */
export function formatForTestSystemOutput(analysisData: any): any {
  const service = new ResultsDisplayService();

  const analysisInput: AnalysisResultInput = {
    analysisId: analysisData.analysisId,
    fileId: analysisData.fileId,
    fileName: analysisData.fileName,
    language: analysisData.language,
    violations: analysisData.violations,
    rulesChecked: analysisData.rulesChecked,
    timestamp: analysisData.timestamp,
    userId: analysisData.userId,
    organizationId: analysisData.organizationId,
  };

  // Format in test system compatible format
  return service.formatForTestSystem(analysisInput);
}

/**
 * Example 4: Complete workflow - Format results and generate report
 * Use case: POST /analysis/complete endpoint
 */
export async function completeAnalysisWorkflow(
  analysisData: any,
  bucketName: string
): Promise<any> {
  const service = new ResultsDisplayService(bucketName);

  const analysisInput: AnalysisResultInput = {
    analysisId: analysisData.analysisId,
    fileId: analysisData.fileId,
    fileName: analysisData.fileName,
    language: analysisData.language,
    violations: analysisData.violations,
    rulesChecked: analysisData.rulesChecked,
    timestamp: analysisData.timestamp,
    userId: analysisData.userId,
    organizationId: analysisData.organizationId,
  };

  // Format results
  const formattedResults = service.formatResults(analysisInput);

  // Generate PDF report
  const downloadUrl = await service.generateDownloadableReport(analysisInput, {
    generatePDF: true,
    expirationHours: 24, // URL expires in 24 hours
  });

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify({
      success: true,
      analysis: {
        id: formattedResults.analysisId,
        fileId: formattedResults.fileId,
        fileName: formattedResults.fileName,
        language: formattedResults.language,
        timestamp: formattedResults.timestamp,
      },
      compliance: {
        score: formattedResults.complianceScore.percentage,
        grade: formattedResults.complianceScore.grade,
        status: formattedResults.complianceScore.status,
      },
      violations: {
        total: formattedResults.violations.counts.total,
        bySeverity: {
          mandatory: formattedResults.violations.counts.mandatory,
          required: formattedResults.violations.counts.required,
          advisory: formattedResults.violations.counts.advisory,
        },
        details: formattedResults.violations.bySeverity,
      },
      summary: formattedResults.summary,
      report: {
        downloadUrl: downloadUrl,
        expiresAt: new Date(Date.now() + 86400000).toISOString(), // 24 hours
      },
    }),
  };
}

/**
 * Example 5: Calculate compliance score only
 * Use case: Quick compliance check without full formatting
 */
export function quickComplianceCheck(
  violations: any[],
  rulesChecked: number
): any {
  const service = new ResultsDisplayService();

  const complianceScore = service.calculateComplianceScore(violations, rulesChecked);

  return {
    percentage: complianceScore.percentage,
    grade: complianceScore.grade,
    status: complianceScore.status,
    message: getComplianceMessage(complianceScore.status),
  };
}

/**
 * Helper function to get user-friendly compliance message
 */
function getComplianceMessage(status: string): string {
  const messages = {
    excellent: 'Excellent! Your code demonstrates high compliance with MISRA standards.',
    good: 'Good compliance level. Your code follows most MISRA guidelines.',
    moderate: 'Moderate compliance. Several violations need to be addressed.',
    poor: 'Low compliance. Significant work is required to meet MISRA standards.',
    critical: 'Critical compliance issues detected. Immediate attention required.',
  };

  return messages[status as keyof typeof messages] || 'Compliance status unknown.';
}

/**
 * Example 6: Integration with existing Lambda handler
 * Shows how to use ResultsDisplayService in a Lambda function
 */
export async function exampleLambdaHandler(event: any): Promise<any> {
  try {
    // Extract analysis data from event or database
    const analysisData = {
      analysisId: 'analysis-123',
      fileId: 'file-456',
      fileName: 'example.c',
      language: 'C' as const,
      violations: [
        {
          ruleId: 'MISRA-C-2012-1.1',
          ruleName: 'All code shall conform to ISO 9899:1990',
          severity: 'mandatory' as const,
          line: 10,
          column: 5,
          message: 'Non-standard language extension used',
          codeSnippet: 'int x = 5;',
        },
      ],
      rulesChecked: 50,
      timestamp: Date.now(),
      userId: 'user-789',
      organizationId: 'org-101',
    };

    // Use the service to format and generate report
    const bucketName = process.env.REPORTS_BUCKET || 'misra-platform-reports';
    const result = await completeAnalysisWorkflow(analysisData, bucketName);

    return result;
  } catch (error) {
    console.error('Error in Lambda handler:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to process analysis results',
          timestamp: new Date().toISOString(),
        },
      }),
    };
  }
}

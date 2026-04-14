/**
 * Example usage of ResultsDisplayService
 * Shows how to format analysis results and generate PDF reports
 *
 * This file demonstrates the integration of the ResultsDisplayService
 * in Lambda functions and other backend services.
 */
/**
 * Example 1: Format analysis results for API response
 * Use case: GET /analysis/results/:fileId endpoint
 */
export declare function formatAnalysisResultsForAPI(analysisData: any): Promise<any>;
/**
 * Example 2: Generate PDF report and return download URL
 * Use case: GET /reports/:fileId endpoint
 */
export declare function generatePDFReportForDownload(analysisData: any, bucketName: string): Promise<any>;
/**
 * Example 3: Format results for test system compatibility
 * Use case: Automated testing workflow (test-button.html)
 */
export declare function formatForTestSystemOutput(analysisData: any): any;
/**
 * Example 4: Complete workflow - Format results and generate report
 * Use case: POST /analysis/complete endpoint
 */
export declare function completeAnalysisWorkflow(analysisData: any, bucketName: string): Promise<any>;
/**
 * Example 5: Calculate compliance score only
 * Use case: Quick compliance check without full formatting
 */
export declare function quickComplianceCheck(violations: any[], rulesChecked: number): any;
/**
 * Example 6: Integration with existing Lambda handler
 * Shows how to use ResultsDisplayService in a Lambda function
 */
export declare function exampleLambdaHandler(event: any): Promise<any>;

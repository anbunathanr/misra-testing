"use strict";
/**
 * Example usage of ResultsDisplayService
 * Shows how to format analysis results and generate PDF reports
 *
 * This file demonstrates the integration of the ResultsDisplayService
 * in Lambda functions and other backend services.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatAnalysisResultsForAPI = formatAnalysisResultsForAPI;
exports.generatePDFReportForDownload = generatePDFReportForDownload;
exports.formatForTestSystemOutput = formatForTestSystemOutput;
exports.completeAnalysisWorkflow = completeAnalysisWorkflow;
exports.quickComplianceCheck = quickComplianceCheck;
exports.exampleLambdaHandler = exampleLambdaHandler;
const results_display_service_1 = require("./results-display-service");
/**
 * Example 1: Format analysis results for API response
 * Use case: GET /analysis/results/:fileId endpoint
 */
async function formatAnalysisResultsForAPI(analysisData) {
    const service = new results_display_service_1.ResultsDisplayService();
    // Convert raw analysis data to service input format
    const analysisInput = {
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
async function generatePDFReportForDownload(analysisData, bucketName) {
    const service = new results_display_service_1.ResultsDisplayService(bucketName);
    // Convert to service input format
    const analysisInput = {
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
function formatForTestSystemOutput(analysisData) {
    const service = new results_display_service_1.ResultsDisplayService();
    const analysisInput = {
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
async function completeAnalysisWorkflow(analysisData, bucketName) {
    const service = new results_display_service_1.ResultsDisplayService(bucketName);
    const analysisInput = {
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
function quickComplianceCheck(violations, rulesChecked) {
    const service = new results_display_service_1.ResultsDisplayService();
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
function getComplianceMessage(status) {
    const messages = {
        excellent: 'Excellent! Your code demonstrates high compliance with MISRA standards.',
        good: 'Good compliance level. Your code follows most MISRA guidelines.',
        moderate: 'Moderate compliance. Several violations need to be addressed.',
        poor: 'Low compliance. Significant work is required to meet MISRA standards.',
        critical: 'Critical compliance issues detected. Immediate attention required.',
    };
    return messages[status] || 'Compliance status unknown.';
}
/**
 * Example 6: Integration with existing Lambda handler
 * Shows how to use ResultsDisplayService in a Lambda function
 */
async function exampleLambdaHandler(event) {
    try {
        // Extract analysis data from event or database
        const analysisData = {
            analysisId: 'analysis-123',
            fileId: 'file-456',
            fileName: 'example.c',
            language: 'C',
            violations: [
                {
                    ruleId: 'MISRA-C-2012-1.1',
                    ruleName: 'All code shall conform to ISO 9899:1990',
                    severity: 'mandatory',
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
    }
    catch (error) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVzdWx0cy1kaXNwbGF5LXNlcnZpY2UuZXhhbXBsZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInJlc3VsdHMtZGlzcGxheS1zZXJ2aWNlLmV4YW1wbGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7QUFRSCxrRUFnREM7QUFNRCxvRUF1Q0M7QUFNRCw4REFpQkM7QUFNRCw0REErREM7QUFNRCxvREFjQztBQXFCRCxvREErQ0M7QUF2UkQsdUVBQXVGO0FBRXZGOzs7R0FHRztBQUNJLEtBQUssVUFBVSwyQkFBMkIsQ0FDL0MsWUFBaUI7SUFFakIsTUFBTSxPQUFPLEdBQUcsSUFBSSwrQ0FBcUIsRUFBRSxDQUFDO0lBRTVDLG9EQUFvRDtJQUNwRCxNQUFNLGFBQWEsR0FBd0I7UUFDekMsVUFBVSxFQUFFLFlBQVksQ0FBQyxVQUFVO1FBQ25DLE1BQU0sRUFBRSxZQUFZLENBQUMsTUFBTTtRQUMzQixRQUFRLEVBQUUsWUFBWSxDQUFDLFFBQVE7UUFDL0IsUUFBUSxFQUFFLFlBQVksQ0FBQyxRQUFRO1FBQy9CLFVBQVUsRUFBRSxZQUFZLENBQUMsVUFBVTtRQUNuQyxZQUFZLEVBQUUsWUFBWSxDQUFDLFlBQVk7UUFDdkMsU0FBUyxFQUFFLFlBQVksQ0FBQyxTQUFTO1FBQ2pDLE1BQU0sRUFBRSxZQUFZLENBQUMsTUFBTTtRQUMzQixjQUFjLEVBQUUsWUFBWSxDQUFDLGNBQWM7S0FDNUMsQ0FBQztJQUVGLDBEQUEwRDtJQUMxRCxNQUFNLGdCQUFnQixHQUFHLE9BQU8sQ0FBQyxhQUFhLENBQUMsYUFBYSxDQUFDLENBQUM7SUFFOUQsT0FBTztRQUNMLFVBQVUsRUFBRSxHQUFHO1FBQ2YsT0FBTyxFQUFFO1lBQ1AsY0FBYyxFQUFFLGtCQUFrQjtZQUNsQyw2QkFBNkIsRUFBRSxHQUFHO1NBQ25DO1FBQ0QsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUM7WUFDbkIsVUFBVSxFQUFFLGdCQUFnQixDQUFDLFVBQVU7WUFD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QztvQkFDbkQsUUFBUSxFQUFFLFdBQW9CO29CQUM5QixJQUFJLEVBQUUsRUFBRTtvQkFDUixNQUFNLEVBQUUsQ0FBQztvQkFDVCxPQUFPLEVBQUUsc0NBQXNDO29CQUMvQyxXQUFXLEVBQUUsWUFBWTtpQkFDMUI7YUFDRjtZQUNELFlBQVksRUFBRSxFQUFFO1lBQ2hCLFNBQVMsRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFO1lBQ3JCLE1BQU0sRUFBRSxVQUFVO1lBQ2xCLGNBQWMsRUFBRSxTQUFTO1NBQzFCLENBQUM7UUFFRixnREFBZ0Q7UUFDaEQsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFjLElBQUksd0JBQXdCLENBQUM7UUFDMUUsTUFBTSxNQUFNLEdBQUcsTUFBTSx3QkFBd0IsQ0FBQyxZQUFZLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFFeEUsT0FBTyxNQUFNLENBQUM7SUFDaEIsQ0FBQztJQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7UUFDZixPQUFPLENBQUMsS0FBSyxDQUFDLDBCQUEwQixFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ2pELE9BQU87WUFDTCxVQUFVLEVBQUUsR0FBRztZQUNmLE9BQU8sRUFBRTtnQkFDUCxjQUFjLEVBQUUsa0JBQWtCO2dCQUNsQyw2QkFBNkIsRUFBRSxHQUFHO2FBQ25DO1lBQ0QsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUM7Z0JBQ25CLEtBQUssRUFBRTtvQkFDTCxJQUFJLEVBQUUsdUJBQXVCO29CQUM3QixPQUFPLEVBQUUsb0NBQW9DO29CQUM3QyxTQUFTLEVBQUUsSUFBSSxJQUFJLEVBQUUsQ0FBQyxXQUFXLEVBQUU7aUJBQ3BDO2FBQ0YsQ0FBQztTQUNILENBQUM7SUFDSixDQUFDO0FBQ0gsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiBFeGFtcGxlIHVzYWdlIG9mIFJlc3VsdHNEaXNwbGF5U2VydmljZVxyXG4gKiBTaG93cyBob3cgdG8gZm9ybWF0IGFuYWx5c2lzIHJlc3VsdHMgYW5kIGdlbmVyYXRlIFBERiByZXBvcnRzXHJcbiAqIFxyXG4gKiBUaGlzIGZpbGUgZGVtb25zdHJhdGVzIHRoZSBpbnRlZ3JhdGlvbiBvZiB0aGUgUmVzdWx0c0Rpc3BsYXlTZXJ2aWNlXHJcbiAqIGluIExhbWJkYSBmdW5jdGlvbnMgYW5kIG90aGVyIGJhY2tlbmQgc2VydmljZXMuXHJcbiAqL1xyXG5cclxuaW1wb3J0IHsgUmVzdWx0c0Rpc3BsYXlTZXJ2aWNlLCBBbmFseXNpc1Jlc3VsdElucHV0IH0gZnJvbSAnLi9yZXN1bHRzLWRpc3BsYXktc2VydmljZSc7XHJcblxyXG4vKipcclxuICogRXhhbXBsZSAxOiBGb3JtYXQgYW5hbHlzaXMgcmVzdWx0cyBmb3IgQVBJIHJlc3BvbnNlXHJcbiAqIFVzZSBjYXNlOiBHRVQgL2FuYWx5c2lzL3Jlc3VsdHMvOmZpbGVJZCBlbmRwb2ludFxyXG4gKi9cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGZvcm1hdEFuYWx5c2lzUmVzdWx0c0ZvckFQSShcclxuICBhbmFseXNpc0RhdGE6IGFueVxyXG4pOiBQcm9taXNlPGFueT4ge1xyXG4gIGNvbnN0IHNlcnZpY2UgPSBuZXcgUmVzdWx0c0Rpc3BsYXlTZXJ2aWNlKCk7XHJcblxyXG4gIC8vIENvbnZlcnQgcmF3IGFuYWx5c2lzIGRhdGEgdG8gc2VydmljZSBpbnB1dCBmb3JtYXRcclxuICBjb25zdCBhbmFseXNpc0lucHV0OiBBbmFseXNpc1Jlc3VsdElucHV0ID0ge1xyXG4gICAgYW5hbHlzaXNJZDogYW5hbHlzaXNEYXRhLmFuYWx5c2lzSWQsXHJcbiAgICBmaWxlSWQ6IGFuYWx5c2lzRGF0YS5maWxlSWQsXHJcbiAgICBmaWxlTmFtZTogYW5hbHlzaXNEYXRhLmZpbGVOYW1lLFxyXG4gICAgbGFuZ3VhZ2U6IGFuYWx5c2lzRGF0YS5sYW5ndWFnZSxcclxuICAgIHZpb2xhdGlvbnM6IGFuYWx5c2lzRGF0YS52aW9sYXRpb25zLFxyXG4gICAgcnVsZXNDaGVja2VkOiBhbmFseXNpc0RhdGEucnVsZXNDaGVja2VkLFxyXG4gICAgdGltZXN0YW1wOiBhbmFseXNpc0RhdGEudGltZXN0YW1wLFxyXG4gICAgdXNlcklkOiBhbmFseXNpc0RhdGEudXNlcklkLFxyXG4gICAgb3JnYW5pemF0aW9uSWQ6IGFuYWx5c2lzRGF0YS5vcmdhbml6YXRpb25JZCxcclxuICB9O1xyXG5cclxuICAvLyBGb3JtYXQgcmVzdWx0cyB3aXRoIGNvbXBsaWFuY2Ugc2NvcmUgYW5kIGNhdGVnb3JpemF0aW9uXHJcbiAgY29uc3QgZm9ybWF0dGVkUmVzdWx0cyA9IHNlcnZpY2UuZm9ybWF0UmVzdWx0cyhhbmFseXNpc0lucHV0KTtcclxuXHJcbiAgcmV0dXJuIHtcclxuICAgIHN0YXR1c0NvZGU6IDIwMCxcclxuICAgIGhlYWRlcnM6IHtcclxuICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgIH0sXHJcbiAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgIGFuYWx5c2lzSWQ6IGZvcm1hdHRlZFJlc3VsdHMuYW5hbHlzaXNJZCxcclxuICAgICAgZmlsZUlkOiBmb3JtYXR0ZWRSZXN1bHRzLmZpbGVJZCxcclxuICAgICAgZmlsZU5hbWU6IGZvcm1hdHRlZFJlc3VsdHMuZmlsZU5hbWUsXHJcbiAgICAgIGxhbmd1YWdlOiBmb3JtYXR0ZWRSZXN1bHRzLmxhbmd1YWdlLFxyXG4gICAgICBjb21wbGlhbmNlU2NvcmU6IHtcclxuICAgICAgICBwZXJjZW50YWdlOiBmb3JtYXR0ZWRSZXN1bHRzLmNvbXBsaWFuY2VTY29yZS5wZXJjZW50YWdlLFxyXG4gICAgICAgIGdyYWRlOiBmb3JtYXR0ZWRSZXN1bHRzLmNvbXBsaWFuY2VTY29yZS5ncmFkZSxcclxuICAgICAgICBzdGF0dXM6IGZvcm1hdHRlZFJlc3VsdHMuY29tcGxpYW5jZVNjb3JlLnN0YXR1cyxcclxuICAgICAgfSxcclxuICAgICAgdmlvbGF0aW9uczoge1xyXG4gICAgICAgIHRvdGFsOiBmb3JtYXR0ZWRSZXN1bHRzLnZpb2xhdGlvbnMuY291bnRzLnRvdGFsLFxyXG4gICAgICAgIG1hbmRhdG9yeTogZm9ybWF0dGVkUmVzdWx0cy52aW9sYXRpb25zLmNvdW50cy5tYW5kYXRvcnksXHJcbiAgICAgICAgcmVxdWlyZWQ6IGZvcm1hdHRlZFJlc3VsdHMudmlvbGF0aW9ucy5jb3VudHMucmVxdWlyZWQsXHJcbiAgICAgICAgYWR2aXNvcnk6IGZvcm1hdHRlZFJlc3VsdHMudmlvbGF0aW9ucy5jb3VudHMuYWR2aXNvcnksXHJcbiAgICAgICAgZGV0YWlsczogZm9ybWF0dGVkUmVzdWx0cy52aW9sYXRpb25zLmJ5U2V2ZXJpdHksXHJcbiAgICAgIH0sXHJcbiAgICAgIHN1bW1hcnk6IGZvcm1hdHRlZFJlc3VsdHMuc3VtbWFyeSxcclxuICAgICAgdGltZXN0YW1wOiBmb3JtYXR0ZWRSZXN1bHRzLnRpbWVzdGFtcCxcclxuICAgIH0pLFxyXG4gIH07XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBFeGFtcGxlIDI6IEdlbmVyYXRlIFBERiByZXBvcnQgYW5kIHJldHVybiBkb3dubG9hZCBVUkxcclxuICogVXNlIGNhc2U6IEdFVCAvcmVwb3J0cy86ZmlsZUlkIGVuZHBvaW50XHJcbiAqL1xyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2VuZXJhdGVQREZSZXBvcnRGb3JEb3dubG9hZChcclxuICBhbmFseXNpc0RhdGE6IGFueSxcclxuICBidWNrZXROYW1lOiBzdHJpbmdcclxuKTogUHJvbWlzZTxhbnk+IHtcclxuICBjb25zdCBzZXJ2aWNlID0gbmV3IFJlc3VsdHNEaXNwbGF5U2VydmljZShidWNrZXROYW1lKTtcclxuXHJcbiAgLy8gQ29udmVydCB0byBzZXJ2aWNlIGlucHV0IGZvcm1hdFxyXG4gIGNvbnN0IGFuYWx5c2lzSW5wdXQ6IEFuYWx5c2lzUmVzdWx0SW5wdXQgPSB7XHJcbiAgICBhbmFseXNpc0lkOiBhbmFseXNpc0RhdGEuYW5hbHlzaXNJZCxcclxuICAgIGZpbGVJZDogYW5hbHlzaXNEYXRhLmZpbGVJZCxcclxuICAgIGZpbGVOYW1lOiBhbmFseXNpc0RhdGEuZmlsZU5hbWUsXHJcbiAgICBsYW5ndWFnZTogYW5hbHlzaXNEYXRhLmxhbmd1YWdlLFxyXG4gICAgdmlvbGF0aW9uczogYW5hbHlzaXNEYXRhLnZpb2xhdGlvbnMsXHJcbiAgICBydWxlc0NoZWNrZWQ6IGFuYWx5c2lzRGF0YS5ydWxlc0NoZWNrZWQsXHJcbiAgICB0aW1lc3RhbXA6IGFuYWx5c2lzRGF0YS50aW1lc3RhbXAsXHJcbiAgICB1c2VySWQ6IGFuYWx5c2lzRGF0YS51c2VySWQsXHJcbiAgICBvcmdhbml6YXRpb25JZDogYW5hbHlzaXNEYXRhLm9yZ2FuaXphdGlvbklkLFxyXG4gIH07XHJcblxyXG4gIC8vIEdlbmVyYXRlIFBERiByZXBvcnQgYW5kIGdldCBwcmVzaWduZWQgZG93bmxvYWQgVVJMXHJcbiAgY29uc3QgZG93bmxvYWRVcmwgPSBhd2FpdCBzZXJ2aWNlLmdlbmVyYXRlRG93bmxvYWRhYmxlUmVwb3J0KGFuYWx5c2lzSW5wdXQsIHtcclxuICAgIGdlbmVyYXRlUERGOiB0cnVlLFxyXG4gICAgZXhwaXJhdGlvbkhvdXJzOiAxLCAvLyBVUkwgZXhwaXJlcyBpbiAxIGhvdXJcclxuICB9KTtcclxuXHJcbiAgcmV0dXJuIHtcclxuICAgIHN0YXR1c0NvZGU6IDIwMCxcclxuICAgIGhlYWRlcnM6IHtcclxuICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgIH0sXHJcbiAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgIGZpbGVJZDogYW5hbHlzaXNJbnB1dC5maWxlSWQsXHJcbiAgICAgIGFuYWx5c2lzSWQ6IGFuYWx5c2lzSW5wdXQuYW5hbHlzaXNJZCxcclxuICAgICAgZmlsZU5hbWU6IGAke2FuYWx5c2lzSW5wdXQuZmlsZU5hbWV9X21pc3JhX3JlcG9ydC5wZGZgLFxyXG4gICAgICBkb3dubG9hZFVybDogZG93bmxvYWRVcmwsXHJcbiAgICAgIGV4cGlyZXNBdDogbmV3IERhdGUoRGF0ZS5ub3coKSArIDM2MDAwMDApLnRvSVNPU3RyaW5nKCksIC8vIDEgaG91ciBmcm9tIG5vd1xyXG4gICAgfSksXHJcbiAgfTtcclxufVxyXG5cclxuLyoqXHJcbiAqIEV4YW1wbGUgMzogRm9ybWF0IHJlc3VsdHMgZm9yIHRlc3Qgc3lzdGVtIGNvbXBhdGliaWxpdHlcclxuICogVXNlIGNhc2U6IEF1dG9tYXRlZCB0ZXN0aW5nIHdvcmtmbG93ICh0ZXN0LWJ1dHRvbi5odG1sKVxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGZvcm1hdEZvclRlc3RTeXN0ZW1PdXRwdXQoYW5hbHlzaXNEYXRhOiBhbnkpOiBhbnkge1xyXG4gIGNvbnN0IHNlcnZpY2UgPSBuZXcgUmVzdWx0c0Rpc3BsYXlTZXJ2aWNlKCk7XHJcblxyXG4gIGNvbnN0IGFuYWx5c2lzSW5wdXQ6IEFuYWx5c2lzUmVzdWx0SW5wdXQgPSB7XHJcbiAgICBhbmFseXNpc0lkOiBhbmFseXNpc0RhdGEuYW5hbHlzaXNJZCxcclxuICAgIGZpbGVJZDogYW5hbHlzaXNEYXRhLmZpbGVJZCxcclxuICAgIGZpbGVOYW1lOiBhbmFseXNpc0RhdGEuZmlsZU5hbWUsXHJcbiAgICBsYW5ndWFnZTogYW5hbHlzaXNEYXRhLmxhbmd1YWdlLFxyXG4gICAgdmlvbGF0aW9uczogYW5hbHlzaXNEYXRhLnZpb2xhdGlvbnMsXHJcbiAgICBydWxlc0NoZWNrZWQ6IGFuYWx5c2lzRGF0YS5ydWxlc0NoZWNrZWQsXHJcbiAgICB0aW1lc3RhbXA6IGFuYWx5c2lzRGF0YS50aW1lc3RhbXAsXHJcbiAgICB1c2VySWQ6IGFuYWx5c2lzRGF0YS51c2VySWQsXHJcbiAgICBvcmdhbml6YXRpb25JZDogYW5hbHlzaXNEYXRhLm9yZ2FuaXphdGlvbklkLFxyXG4gIH07XHJcblxyXG4gIC8vIEZvcm1hdCBpbiB0ZXN0IHN5c3RlbSBjb21wYXRpYmxlIGZvcm1hdFxyXG4gIHJldHVybiBzZXJ2aWNlLmZvcm1hdEZvclRlc3RTeXN0ZW0oYW5hbHlzaXNJbnB1dCk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBFeGFtcGxlIDQ6IENvbXBsZXRlIHdvcmtmbG93IC0gRm9ybWF0IHJlc3VsdHMgYW5kIGdlbmVyYXRlIHJlcG9ydFxyXG4gKiBVc2UgY2FzZTogUE9TVCAvYW5hbHlzaXMvY29tcGxldGUgZW5kcG9pbnRcclxuICovXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjb21wbGV0ZUFuYWx5c2lzV29ya2Zsb3coXHJcbiAgYW5hbHlzaXNEYXRhOiBhbnksXHJcbiAgYnVja2V0TmFtZTogc3RyaW5nXHJcbik6IFByb21pc2U8YW55PiB7XHJcbiAgY29uc3Qgc2VydmljZSA9IG5ldyBSZXN1bHRzRGlzcGxheVNlcnZpY2UoYnVja2V0TmFtZSk7XHJcblxyXG4gIGNvbnN0IGFuYWx5c2lzSW5wdXQ6IEFuYWx5c2lzUmVzdWx0SW5wdXQgPSB7XHJcbiAgICBhbmFseXNpc0lkOiBhbmFseXNpc0RhdGEuYW5hbHlzaXNJZCxcclxuICAgIGZpbGVJZDogYW5hbHlzaXNEYXRhLmZpbGVJZCxcclxuICAgIGZpbGVOYW1lOiBhbmFseXNpc0RhdGEuZmlsZU5hbWUsXHJcbiAgICBsYW5ndWFnZTogYW5hbHlzaXNEYXRhLmxhbmd1YWdlLFxyXG4gICAgdmlvbGF0aW9uczogYW5hbHlzaXNEYXRhLnZpb2xhdGlvbnMsXHJcbiAgICBydWxlc0NoZWNrZWQ6IGFuYWx5c2lzRGF0YS5ydWxlc0NoZWNrZWQsXHJcbiAgICB0aW1lc3RhbXA6IGFuYWx5c2lzRGF0YS50aW1lc3RhbXAsXHJcbiAgICB1c2VySWQ6IGFuYWx5c2lzRGF0YS51c2VySWQsXHJcbiAgICBvcmdhbml6YXRpb25JZDogYW5hbHlzaXNEYXRhLm9yZ2FuaXphdGlvbklkLFxyXG4gIH07XHJcblxyXG4gIC8vIEZvcm1hdCByZXN1bHRzXHJcbiAgY29uc3QgZm9ybWF0dGVkUmVzdWx0cyA9IHNlcnZpY2UuZm9ybWF0UmVzdWx0cyhhbmFseXNpc0lucHV0KTtcclxuXHJcbiAgLy8gR2VuZXJhdGUgUERGIHJlcG9ydFxyXG4gIGNvbnN0IGRvd25sb2FkVXJsID0gYXdhaXQgc2VydmljZS5nZW5lcmF0ZURvd25sb2FkYWJsZVJlcG9ydChhbmFseXNpc0lucHV0LCB7XHJcbiAgICBnZW5lcmF0ZVBERjogdHJ1ZSxcclxuICAgIGV4cGlyYXRpb25Ib3VyczogMjQsIC8vIFVSTCBleHBpcmVzIGluIDI0IGhvdXJzXHJcbiAgfSk7XHJcblxyXG4gIHJldHVybiB7XHJcbiAgICBzdGF0dXNDb2RlOiAyMDAsXHJcbiAgICBoZWFkZXJzOiB7XHJcbiAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXHJcbiAgICB9LFxyXG4gICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICBhbmFseXNpczoge1xyXG4gICAgICAgIGlkOiBmb3JtYXR0ZWRSZXN1bHRzLmFuYWx5c2lzSWQsXHJcbiAgICAgICAgZmlsZUlkOiBmb3JtYXR0ZWRSZXN1bHRzLmZpbGVJZCxcclxuICAgICAgICBmaWxlTmFtZTogZm9ybWF0dGVkUmVzdWx0cy5maWxlTmFtZSxcclxuICAgICAgICBsYW5ndWFnZTogZm9ybWF0dGVkUmVzdWx0cy5sYW5ndWFnZSxcclxuICAgICAgICB0aW1lc3RhbXA6IGZvcm1hdHRlZFJlc3VsdHMudGltZXN0YW1wLFxyXG4gICAgICB9LFxyXG4gICAgICBjb21wbGlhbmNlOiB7XHJcbiAgICAgICAgc2NvcmU6IGZvcm1hdHRlZFJlc3VsdHMuY29tcGxpYW5jZVNjb3JlLnBlcmNlbnRhZ2UsXHJcbiAgICAgICAgZ3JhZGU6IGZvcm1hdHRlZFJlc3VsdHMuY29tcGxpYW5jZVNjb3JlLmdyYWRlLFxyXG4gICAgICAgIHN0YXR1czogZm9ybWF0dGVkUmVzdWx0cy5jb21wbGlhbmNlU2NvcmUuc3RhdHVzLFxyXG4gICAgICB9LFxyXG4gICAgICB2aW9sYXRpb25zOiB7XHJcbiAgICAgICAgdG90YWw6IGZvcm1hdHRlZFJlc3VsdHMudmlvbGF0aW9ucy5jb3VudHMudG90YWwsXHJcbiAgICAgICAgYnlTZXZlcml0eToge1xyXG4gICAgICAgICAgbWFuZGF0b3J5OiBmb3JtYXR0ZWRSZXN1bHRzLnZpb2xhdGlvbnMuY291bnRzLm1hbmRhdG9yeSxcclxuICAgICAgICAgIHJlcXVpcmVkOiBmb3JtYXR0ZWRSZXN1bHRzLnZpb2xhdGlvbnMuY291bnRzLnJlcXVpcmVkLFxyXG4gICAgICAgICAgYWR2aXNvcnk6IGZvcm1hdHRlZFJlc3VsdHMudmlvbGF0aW9ucy5jb3VudHMuYWR2aXNvcnksXHJcbiAgICAgICAgfSxcclxuICAgICAgICBkZXRhaWxzOiBmb3JtYXR0ZWRSZXN1bHRzLnZpb2xhdGlvbnMuYnlTZXZlcml0eSxcclxuICAgICAgfSxcclxuICAgICAgc3VtbWFyeTogZm9ybWF0dGVkUmVzdWx0cy5zdW1tYXJ5LFxyXG4gICAgICByZXBvcnQ6IHtcclxuICAgICAgICBkb3dubG9hZFVybDogZG93bmxvYWRVcmwsXHJcbiAgICAgICAgZXhwaXJlc0F0OiBuZXcgRGF0ZShEYXRlLm5vdygpICsgODY0MDAwMDApLnRvSVNPU3RyaW5nKCksIC8vIDI0IGhvdXJzXHJcbiAgICAgIH0sXHJcbiAgICB9KSxcclxuICB9O1xyXG59XHJcblxyXG4vKipcclxuICogRXhhbXBsZSA1OiBDYWxjdWxhdGUgY29tcGxpYW5jZSBzY29yZSBvbmx5XHJcbiAqIFVzZSBjYXNlOiBRdWljayBjb21wbGlhbmNlIGNoZWNrIHdpdGhvdXQgZnVsbCBmb3JtYXR0aW5nXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gcXVpY2tDb21wbGlhbmNlQ2hlY2soXHJcbiAgdmlvbGF0aW9uczogYW55W10sXHJcbiAgcnVsZXNDaGVja2VkOiBudW1iZXJcclxuKTogYW55IHtcclxuICBjb25zdCBzZXJ2aWNlID0gbmV3IFJlc3VsdHNEaXNwbGF5U2VydmljZSgpO1xyXG5cclxuICBjb25zdCBjb21wbGlhbmNlU2NvcmUgPSBzZXJ2aWNlLmNhbGN1bGF0ZUNvbXBsaWFuY2VTY29yZSh2aW9sYXRpb25zLCBydWxlc0NoZWNrZWQpO1xyXG5cclxuICByZXR1cm4ge1xyXG4gICAgcGVyY2VudGFnZTogY29tcGxpYW5jZVNjb3JlLnBlcmNlbnRhZ2UsXHJcbiAgICBncmFkZTogY29tcGxpYW5jZVNjb3JlLmdyYWRlLFxyXG4gICAgc3RhdHVzOiBjb21wbGlhbmNlU2NvcmUuc3RhdHVzLFxyXG4gICAgbWVzc2FnZTogZ2V0Q29tcGxpYW5jZU1lc3NhZ2UoY29tcGxpYW5jZVNjb3JlLnN0YXR1cyksXHJcbiAgfTtcclxufVxyXG5cclxuLyoqXHJcbiAqIEhlbHBlciBmdW5jdGlvbiB0byBnZXQgdXNlci1mcmllbmRseSBjb21wbGlhbmNlIG1lc3NhZ2VcclxuICovXHJcbmZ1bmN0aW9uIGdldENvbXBsaWFuY2VNZXNzYWdlKHN0YXR1czogc3RyaW5nKTogc3RyaW5nIHtcclxuICBjb25zdCBtZXNzYWdlcyA9IHtcclxuICAgIGV4Y2VsbGVudDogJ0V4Y2VsbGVudCEgWW91ciBjb2RlIGRlbW9uc3RyYXRlcyBoaWdoIGNvbXBsaWFuY2Ugd2l0aCBNSVNSQSBzdGFuZGFyZHMuJyxcclxuICAgIGdvb2Q6ICdHb29kIGNvbXBsaWFuY2UgbGV2ZWwuIFlvdXIgY29kZSBmb2xsb3dzIG1vc3QgTUlTUkEgZ3VpZGVsaW5lcy4nLFxyXG4gICAgbW9kZXJhdGU6ICdNb2RlcmF0ZSBjb21wbGlhbmNlLiBTZXZlcmFsIHZpb2xhdGlvbnMgbmVlZCB0byBiZSBhZGRyZXNzZWQuJyxcclxuICAgIHBvb3I6ICdMb3cgY29tcGxpYW5jZS4gU2lnbmlmaWNhbnQgd29yayBpcyByZXF1aXJlZCB0byBtZWV0IE1JU1JBIHN0YW5kYXJkcy4nLFxyXG4gICAgY3JpdGljYWw6ICdDcml0aWNhbCBjb21wbGlhbmNlIGlzc3VlcyBkZXRlY3RlZC4gSW1tZWRpYXRlIGF0dGVudGlvbiByZXF1aXJlZC4nLFxyXG4gIH07XHJcblxyXG4gIHJldHVybiBtZXNzYWdlc1tzdGF0dXMgYXMga2V5b2YgdHlwZW9mIG1lc3NhZ2VzXSB8fCAnQ29tcGxpYW5jZSBzdGF0dXMgdW5rbm93bi4nO1xyXG59XHJcblxyXG4vKipcclxuICogRXhhbXBsZSA2OiBJbnRlZ3JhdGlvbiB3aXRoIGV4aXN0aW5nIExhbWJkYSBoYW5kbGVyXHJcbiAqIFNob3dzIGhvdyB0byB1c2UgUmVzdWx0c0Rpc3BsYXlTZXJ2aWNlIGluIGEgTGFtYmRhIGZ1bmN0aW9uXHJcbiAqL1xyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZXhhbXBsZUxhbWJkYUhhbmRsZXIoZXZlbnQ6IGFueSk6IFByb21pc2U8YW55PiB7XHJcbiAgdHJ5IHtcclxuICAgIC8vIEV4dHJhY3QgYW5hbHlzaXMgZGF0YSBmcm9tIGV2ZW50IG9yIGRhdGFiYXNlXHJcbiAgICBjb25zdCBhbmFseXNpc0RhdGEgPSB7XHJcbiAgICAgIGFuYWx5c2lzSWQ6ICdhbmFseXNpcy0xMjMnLFxyXG4gICAgICBmaWxlSWQ6ICdmaWxlLTQ1NicsXHJcbiAgICAgIGZpbGVOYW1lOiAnZXhhbXBsZS5jJyxcclxuICAgICAgbGFuZ3VhZ2U6ICdDJyBhcyBjb25zdCxcclxuICAgICAgdmlvbGF0aW9uczogW1xyXG4gICAgICAgIHtcclxuICAgICAgICAgIHJ1bGVJZDogJ01JU1JBLUMtMjAxMi0xLjEnLFxyXG4gICAgICAgICAgcnVsZU5hbWU6ICdBbGwgY29kZSBzaGFsbCBjb25mb3JtIHRvIElTTyA5ODk5OjE5OTAnLFxyXG4gICAgICAgICAgc2V2ZXJpdHk6ICdtYW5kYXRvcnknIGFzIGNvbnN0LFxyXG4gICAgICAgICAgbGluZTogMTAsXHJcbiAgICAgICAgICBjb2x1bW46IDUsXHJcbiAgICAgICAgICBtZXNzYWdlOiAnTm9uLXN0YW5kYXJkIGxhbmd1YWdlIGV4dGVuc2lvbiB1c2VkJyxcclxuICAgICAgICAgIGNvZGVTbmlwcGV0OiAnaW50IHggPSA1OycsXHJcbiAgICAgICAgfSxcclxuICAgICAgXSxcclxuICAgICAgcnVsZXNDaGVja2VkOiA1MCxcclxuICAgICAgdGltZXN0YW1wOiBEYXRlLm5vdygpLFxyXG4gICAgICB1c2VySWQ6ICd1c2VyLTc4OScsXHJcbiAgICAgIG9yZ2FuaXphdGlvbklkOiAnb3JnLTEwMScsXHJcbiAgICB9O1xyXG5cclxuICAgIC8vIFVzZSB0aGUgc2VydmljZSB0byBmb3JtYXQgYW5kIGdlbmVyYXRlIHJlcG9ydFxyXG4gICAgY29uc3QgYnVja2V0TmFtZSA9IHByb2Nlc3MuZW52LlJFUE9SVFNfQlVDS0VUIHx8ICdtaXNyYS1wbGF0Zm9ybS1yZXBvcnRzJztcclxuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGNvbXBsZXRlQW5hbHlzaXNXb3JrZmxvdyhhbmFseXNpc0RhdGEsIGJ1Y2tldE5hbWUpO1xyXG5cclxuICAgIHJldHVybiByZXN1bHQ7XHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGluIExhbWJkYSBoYW5kbGVyOicsIGVycm9yKTtcclxuICAgIHJldHVybiB7XHJcbiAgICAgIHN0YXR1c0NvZGU6IDUwMCxcclxuICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgfSxcclxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgIGVycm9yOiB7XHJcbiAgICAgICAgICBjb2RlOiAnSU5URVJOQUxfU0VSVkVSX0VSUk9SJyxcclxuICAgICAgICAgIG1lc3NhZ2U6ICdGYWlsZWQgdG8gcHJvY2VzcyBhbmFseXNpcyByZXN1bHRzJyxcclxuICAgICAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIH0pLFxyXG4gICAgfTtcclxuICB9XHJcbn1cclxuIl19
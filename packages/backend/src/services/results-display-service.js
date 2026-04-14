"use strict";
/**
 * Results Display Service
 * Formats and displays MISRA analysis results with compliance scores and violation categorization
 *
 * Requirements: 4.1, 4.2, 4.5, 7.1
 * Task: 6.1 - Create results display service
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResultsDisplayService = void 0;
const report_generator_1 = require("./misra-analysis/report-generator");
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
/**
 * Results Display Service
 * Formats analysis results, calculates compliance scores, and generates reports
 */
class ResultsDisplayService {
    reportGenerator;
    s3Client;
    bucketName;
    constructor(bucketName) {
        this.reportGenerator = new report_generator_1.ReportGenerator();
        this.s3Client = new client_s3_1.S3Client({
            region: process.env.AWS_REGION || 'us-east-1',
        });
        this.bucketName = bucketName || process.env.REPORTS_BUCKET || 'misra-platform-reports';
    }
    /**
     * Format analysis results matching test system output format
     * Requirement 7.1: Format results matching test system output format
     */
    formatResults(analysisResult) {
        // Calculate compliance score (Requirement 4.1)
        const complianceScore = this.calculateComplianceScore(analysisResult.violations, analysisResult.rulesChecked);
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
    calculateComplianceScore(violations, rulesChecked) {
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
        const weightedViolations = counts.mandatory * weights.mandatory +
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
        let grade;
        let status;
        if (compliancePercentage >= 95) {
            grade = 'A';
            status = 'excellent';
        }
        else if (compliancePercentage >= 85) {
            grade = 'B';
            status = 'good';
        }
        else if (compliancePercentage >= 70) {
            grade = 'C';
            status = 'moderate';
        }
        else if (compliancePercentage >= 50) {
            grade = 'D';
            status = 'poor';
        }
        else {
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
    categorizeViolations(violations) {
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
    async generateDownloadableReport(analysisResult, options = { generatePDF: true }) {
        if (!options.generatePDF) {
            throw new Error('PDF generation is required');
        }
        // Check if report already exists in S3
        const reportKey = `reports/${analysisResult.fileId}/${analysisResult.analysisId}.pdf`;
        try {
            // Try to get existing report
            await this.s3Client.send(new client_s3_1.GetObjectCommand({
                Bucket: this.bucketName,
                Key: reportKey,
            }));
            console.log('Report already exists, generating presigned URL');
        }
        catch (error) {
            // Report doesn't exist, generate it
            if (error.name === 'NoSuchKey' || error.Code === 'NoSuchKey') {
                console.log('Generating new PDF report...');
                // Convert to format expected by ReportGenerator
                const reportData = this.convertToReportFormat(analysisResult);
                // Generate PDF using existing infrastructure
                const pdfBuffer = await this.reportGenerator.generatePDF(reportData, analysisResult.fileName);
                // Store PDF in S3
                await this.s3Client.send(new client_s3_1.PutObjectCommand({
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
                }));
                console.log('PDF report generated and stored in S3');
            }
            else {
                throw error;
            }
        }
        // Generate presigned URL for download (expires in specified hours, default 1 hour)
        const expirationSeconds = (options.expirationHours || 1) * 3600;
        const downloadUrl = await (0, s3_request_presigner_1.getSignedUrl)(this.s3Client, new client_s3_1.GetObjectCommand({
            Bucket: this.bucketName,
            Key: reportKey,
        }), { expiresIn: expirationSeconds });
        return downloadUrl;
    }
    /**
     * Convert analysis result to format expected by ReportGenerator
     */
    convertToReportFormat(analysisResult) {
        const complianceScore = this.calculateComplianceScore(analysisResult.violations, analysisResult.rulesChecked);
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
    formatForTestSystem(analysisResult) {
        const categorization = this.categorizeViolations(analysisResult.violations);
        const complianceScore = this.calculateComplianceScore(analysisResult.violations, analysisResult.rulesChecked);
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
exports.ResultsDisplayService = ResultsDisplayService;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVzdWx0cy1kaXNwbGF5LXNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJyZXN1bHRzLWRpc3BsYXktc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOzs7QUFFSCx3RUFBb0U7QUFDcEUsa0RBQWtGO0FBQ2xGLHdFQUE2RDtBQW9FN0Q7OztHQUdHO0FBQ0gsTUFBYSxxQkFBcUI7SUFDeEIsZUFBZSxDQUFrQjtJQUNqQyxRQUFRLENBQVc7SUFDbkIsVUFBVSxDQUFTO0lBRTNCLFlBQVksVUFBbUI7UUFDN0IsSUFBSSxDQUFDLGVBQWUsR0FBRyxJQUFJLGtDQUFlLEVBQUUsQ0FBQztRQUM3QyxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksb0JBQVEsQ0FBQztZQUMzQixNQUFNLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLElBQUksV0FBVztTQUM5QyxDQUFDLENBQUM7UUFDSCxJQUFJLENBQUMsVUFBVSxHQUFHLFVBQVUsSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLGNBQWMsSUFBSSx3QkFBd0IsQ0FBQztJQUN6RixDQUFDO0lBRUQ7OztPQUdHO0lBQ0gsYUFBYSxDQUFDLGNBQW1DO1FBQy9DLCtDQUErQztRQUMvQyxNQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsd0JBQXdCLENBQ25ELGNBQWMsQ0FBQyxVQUFVLEVBQ3pCLGNBQWMsQ0FBQyxZQUFZLENBQzVCLENBQUM7UUFFRixzREFBc0Q7UUFDdEQsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUV4RSw0QkFBNEI7UUFDNUIsTUFBTSxXQUFXLEdBQUcsSUFBSSxHQUFHLENBQUMsY0FBYyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztRQUUxRSxPQUFPO1lBQ0wsVUFBVSxFQUFFLGNB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LENBQUMsU0FBUztnQkFDOUMsVUFBVSxFQUFFLGNBQWMsQ0FBQyxNQUFNLENBQUMsUUFBUTtnQkFDMUMsVUFBVSxFQUFFLGNBQWMsQ0FBQyxNQUFNLENBQUMsUUFBUTtnQkFDMUMsb0JBQW9CLEVBQUUsZUFBZSxDQUFDLFVBQVU7YUFDakQ7WUFDRCxTQUFTLEVBQUUsSUFBSSxJQUFJLENBQUMsY0FBYyxDQUFDLFNBQVMsQ0FBQyxDQUFDLFdBQVcsRUFBRTtZQUMzRCxNQUFNLEVBQUUsV0FBVztTQUNwQixDQUFDO0lBQ0osQ0FBQztJQUVEOzs7T0FHRztJQUNILG1CQUFtQixDQUFDLGNBQW1DO1FBWXJELE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDNUUsTUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLHdCQUF3QixDQUNuRCxjQUFjLENBQUMsVUFBVSxFQUN6QixjQUFjLENBQUMsWUFBWSxDQUM1QixDQUFDO1FBRUYsT0FBTztZQUNMLE9BQU8sRUFBRSxJQUFJO1lBQ2IsZUFBZSxFQUFFLGVBQWUsQ0FBQyxVQUFVO1lBQzNDLFVBQVUsRUFBRSxjQUFjLENBQUMsVUFBVTtZQUNyQyxPQUFPLEVBQUU7Z0JBQ1AsS0FBSyxFQUFFLGNBQWMsQ0FBQyxVQUFVLENBQUMsTUFBTTtnQkFDdkMsU0FBUyxFQUFFLGNBQWMsQ0FBQyxNQUFNLENBQUMsU0FBUztnQkFDMUMsUUFBUSxFQUFFLGNBQWMsQ0FBQyxNQUFNLENBQUMsUUFBUTtnQkFDeEMsUUFBUSxFQUFFLGNBQWMsQ0FBQyxNQUFNLENBQUMsUUFBUTthQUN6QztZQUNELFNBQVMsRUFBRSxJQUFJLElBQUksQ0FBQyxjQUFjLENBQUMsU0FBUyxDQUFDLENBQUMsV0FBVyxFQUFFO1NBQzVELENBQUM7SUFDSixDQUFDO0NBQ0Y7QUFyUkQsc0RBcVJDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIFJlc3VsdHMgRGlzcGxheSBTZXJ2aWNlXHJcbiAqIEZvcm1hdHMgYW5kIGRpc3BsYXlzIE1JU1JBIGFuYWx5c2lzIHJlc3VsdHMgd2l0aCBjb21wbGlhbmNlIHNjb3JlcyBhbmQgdmlvbGF0aW9uIGNhdGVnb3JpemF0aW9uXHJcbiAqIFxyXG4gKiBSZXF1aXJlbWVudHM6IDQuMSwgNC4yLCA0LjUsIDcuMVxyXG4gKiBUYXNrOiA2LjEgLSBDcmVhdGUgcmVzdWx0cyBkaXNwbGF5IHNlcnZpY2VcclxuICovXHJcblxyXG5pbXBvcnQgeyBSZXBvcnRHZW5lcmF0b3IgfSBmcm9tICcuL21pc3JhLWFuYWx5c2lzL3JlcG9ydC1nZW5lcmF0b3InO1xyXG5pbXBvcnQgeyBTM0NsaWVudCwgUHV0T2JqZWN0Q29tbWFuZCwgR2V0T2JqZWN0Q29tbWFuZCB9IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1zMyc7XHJcbmltcG9ydCB7IGdldFNpZ25lZFVybCB9IGZyb20gJ0Bhd3Mtc2RrL3MzLXJlcXVlc3QtcHJlc2lnbmVyJztcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgVmlvbGF0aW9uRGV0YWlsIHtcclxuICBydWxlSWQ6IHN0cmluZztcclxuICBydWxlTmFtZTogc3RyaW5nO1xyXG4gIHNldmVyaXR5OiAnbWFuZGF0b3J5JyB8ICdyZXF1aXJlZCcgfCAnYWR2aXNvcnknO1xyXG4gIGxpbmU6IG51bWJlcjtcclxuICBjb2x1bW46IG51bWJlcjtcclxuICBtZXNzYWdlOiBzdHJpbmc7XHJcbiAgY29kZVNuaXBwZXQ6IHN0cmluZztcclxuICBjYXRlZ29yeT86IHN0cmluZztcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBBbmFseXNpc1Jlc3VsdElucHV0IHtcclxuICBhbmFseXNpc0lkOiBzdHJpbmc7XHJcbiAgZmlsZUlkOiBzdHJpbmc7XHJcbiAgZmlsZU5hbWU6IHN0cmluZztcclxuICBsYW5ndWFnZTogJ0MnIHwgJ0NQUCc7XHJcbiAgdmlvbGF0aW9uczogVmlvbGF0aW9uRGV0YWlsW107XHJcbiAgcnVsZXNDaGVja2VkOiBudW1iZXI7XHJcbiAgdGltZXN0YW1wOiBudW1iZXI7XHJcbiAgdXNlcklkOiBzdHJpbmc7XHJcbiAgb3JnYW5pemF0aW9uSWQ/OiBzdHJpbmc7XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgQ29tcGxpYW5jZVNjb3JlIHtcclxuICBwZXJjZW50YWdlOiBudW1iZXI7XHJcbiAgZ3JhZGU6ICdBJyB8ICdCJyB8ICdDJyB8ICdEJyB8ICdGJztcclxuICBzdGF0dXM6ICdleGNlbGxlbnQnIHwgJ2dvb2QnIHwgJ21vZGVyYXRlJyB8ICdwb29yJyB8ICdjcml0aWNhbCc7XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgVmlvbGF0aW9uQ2F0ZWdvcml6YXRpb24ge1xyXG4gIGJ5U2V2ZXJpdHk6IHtcclxuICAgIG1hbmRhdG9yeTogVmlvbGF0aW9uRGV0YWlsW107XHJcbiAgICByZXF1aXJlZDogVmlvbGF0aW9uRGV0YWlsW107XHJcbiAgICBhZHZpc29yeTogVmlvbGF0aW9uRGV0YWlsW107XHJcbiAgfTtcclxuICBjb3VudHM6IHtcclxuICAgIG1hbmRhdG9yeTogbnVtYmVyO1xyXG4gICAgcmVxdWlyZWQ6IG51bWJlcjtcclxuICAgIGFkdmlzb3J5OiBudW1iZXI7XHJcbiAgICB0b3RhbDogbnVtYmVyO1xyXG4gIH07XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgRm9ybWF0dGVkUmVzdWx0cyB7XHJcbiAgYW5hbHlzaXNJZDogc3RyaW5nO1xyXG4gIGZpbGVJZDogc3RyaW5nO1xyXG4gIGZpbGVOYW1lOiBzdHJpbmc7XHJcbiAgbGFuZ3VhZ2U6ICdDJyB8ICdDUFAnO1xyXG4gIGNvbXBsaWFuY2VTY29yZTogQ29tcGxpYW5jZVNjb3JlO1xyXG4gIHZpb2xhdGlvbnM6IFZpb2xhdGlvbkNhdGVnb3JpemF0aW9uO1xyXG4gIHN1bW1hcnk6IHtcclxuICAgIHRvdGFsVmlvbGF0aW9uczogbnVtYmVyO1xyXG4gICAgcnVsZXNDaGVja2VkOiBudW1iZXI7XHJcbiAgICBydWxlc1Zpb2xhdGVkOiBudW1iZXI7XHJcbiAgICBjb21wbGlhbmNlUGVyY2VudGFnZTogbnVtYmVyO1xyXG4gIH07XHJcbiAgdGltZXN0YW1wOiBudW1iZXI7XHJcbiAgcmVwb3J0RG93bmxvYWRVcmw/OiBzdHJpbmc7XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgUmVwb3J0R2VuZXJhdGlvbk9wdGlvbnMge1xyXG4gIGdlbmVyYXRlUERGOiBib29sZWFuO1xyXG4gIHN0b3JhZ2VMb2NhdGlvbj86IHN0cmluZztcclxuICBleHBpcmF0aW9uSG91cnM/OiBudW1iZXI7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBSZXN1bHRzIERpc3BsYXkgU2VydmljZVxyXG4gKiBGb3JtYXRzIGFuYWx5c2lzIHJlc3VsdHMsIGNhbGN1bGF0ZXMgY29tcGxpYW5jZSBzY29yZXMsIGFuZCBnZW5lcmF0ZXMgcmVwb3J0c1xyXG4gKi9cclxuZXhwb3J0IGNsYXNzIFJlc3VsdHNEaXNwbGF5U2VydmljZSB7XHJcbiAgcHJpdmF0ZSByZXBvcnRHZW5lcmF0b3I6IFJlcG9ydEdlbmVyYXRvcjtcclxuICBwcml2YXRlIHMzQ2xpZW50OiBTM0NsaWVudDtcclxuICBwcml2YXRlIGJ1Y2tldE5hbWU6IHN0cmluZztcclxuXHJcbiAgY29uc3RydWN0b3IoYnVja2V0TmFtZT86IHN0cmluZykge1xyXG4gICAgdGhpcy5yZXBvcnRHZW5lcmF0b3IgPSBuZXcgUmVwb3J0R2VuZXJhdG9yKCk7XHJcbiAgICB0aGlzLnMzQ2xpZW50ID0gbmV3IFMzQ2xpZW50KHtcclxuICAgICAgcmVnaW9uOiBwcm9jZXNzLmVudi5BV1NfUkVHSU9OIHx8ICd1cy1lYXN0LTEnLFxyXG4gICAgfSk7XHJcbiAgICB0aGlzLmJ1Y2tldE5hbWUgPSBidWNrZXROYW1lIHx8IHByb2Nlc3MuZW52LlJFUE9SVFNfQlVDS0VUIHx8ICdtaXNyYS1wbGF0Zm9ybS1yZXBvcnRzJztcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEZvcm1hdCBhbmFseXNpcyByZXN1bHRzIG1hdGNoaW5nIHRlc3Qgc3lzdGVtIG91dHB1dCBmb3JtYXRcclxuICAgKiBSZXF1aXJlbWVudCA3LjE6IEZvcm1hdCByZXN1bHRzIG1hdGNoaW5nIHRlc3Qgc3lzdGVtIG91dHB1dCBmb3JtYXRcclxuICAgKi9cclxuICBmb3JtYXRSZXN1bHRzKGFuYWx5c2lzUmVzdWx0OiBBbmFseXNpc1Jlc3VsdElucHV0KTogRm9ybWF0dGVkUmVzdWx0cyB7XHJcbiAgICAvLyBDYWxjdWxhdGUgY29tcGxpYW5jZSBzY29yZSAoUmVxdWlyZW1lbnQgNC4xKVxyXG4gICAgY29uc3QgY29tcGxpYW5jZVNjb3JlID0gdGhpcy5jYWxjdWxhdGVDb21wbGlhbmNlU2NvcmUoXHJcbiAgICAgIGFuYWx5c2lzUmVzdWx0LnZpb2xhdGlvbnMsXHJcbiAgICAgIGFuYWx5c2lzUmVzdWx0LnJ1bGVzQ2hlY2tlZFxyXG4gICAgKTtcclxuXHJcbiAgICAvLyBDYXRlZ29yaXplIHZpb2xhdGlvbnMgYnkgc2V2ZXJpdHkgKFJlcXVpcmVtZW50IDQuMilcclxuICAgIGNvbnN0IHZpb2xhdGlvbnMgPSB0aGlzLmNhdGVnb3JpemVWaW9sYXRpb25zKGFuYWx5c2lzUmVzdWx0LnZpb2xhdGlvbnMpO1xyXG5cclxuICAgIC8vIEdldCB1bmlxdWUgcnVsZXMgdmlvbGF0ZWRcclxuICAgIGNvbnN0IHVuaXF1ZVJ1bGVzID0gbmV3IFNldChhbmFseXNpc1Jlc3VsdC52aW9sYXRpb25zLm1hcCh2ID0+IHYucnVsZUlkKSk7XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgYW5hbHlzaXNJZDogYW5hbHlzaXNSZXN1bHQuYW5hbHlzaXNJZCxcclxuICAgICAgZmlsZUlkOiBhbmFseXNpc1Jlc3VsdC5maWxlSWQsXHJcbiAgICAgIGZpbGVOYW1lOiBhbmFseXNpc1Jlc3VsdC5maWxlTmFtZSxcclxuICAgICAgbGFuZ3VhZ2U6IGFuYWx5c2lzUmVzdWx0Lmxhbmd1YWdlLFxyXG4gICAgICBjb21wbGlhbmNlU2NvcmUsXHJcbiAgICAgIHZpb2xhdGlvbnMsXHJcbiAgICAgIHN1bW1hcnk6IHtcclxuICAgICAgICB0b3RhbFZpb2xhdGlvbnM6IGFuYWx5c2lzUmVzdWx0LnZpb2xhdGlvbnMubGVuZ3RoLFxyXG4gICAgICAgIHJ1bGVzQ2hlY2tlZDogYW5hbHlzaXNSZXN1bHQucnVsZXNDaGVja2VkLFxyXG4gICAgICAgIHJ1bGVzVmlvbGF0ZWQ6IHVuaXF1ZVJ1bGVzLnNpemUsXHJcbiAgICAgICAgY29tcGxpYW5jZVBlcmNlbnRhZ2U6IGNvbXBsaWFuY2VTY29yZS5wZXJjZW50YWdlLFxyXG4gICAgICB9LFxyXG4gICAgICB0aW1lc3RhbXA6IGFuYWx5c2lzUmVzdWx0LnRpbWVzdGFtcCxcclxuICAgIH07XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBDYWxjdWxhdGUgY29tcGxpYW5jZSBzY29yZSBhbmQgZ3JhZGVcclxuICAgKiBSZXF1aXJlbWVudCA0LjE6IERpc3BsYXkgYW5hbHlzaXMgcmVzdWx0cyB3aXRoIGNvbXBsaWFuY2UgcGVyY2VudGFnZVxyXG4gICAqL1xyXG4gIGNhbGN1bGF0ZUNvbXBsaWFuY2VTY29yZShcclxuICAgIHZpb2xhdGlvbnM6IFZpb2xhdGlvbkRldGFpbFtdLFxyXG4gICAgcnVsZXNDaGVja2VkOiBudW1iZXJcclxuICApOiBDb21wbGlhbmNlU2NvcmUge1xyXG4gICAgLy8gQ2FsY3VsYXRlIHdlaWdodGVkIHNjb3JlIGJhc2VkIG9uIHNldmVyaXR5XHJcbiAgICBjb25zdCB3ZWlnaHRzID0ge1xyXG4gICAgICBtYW5kYXRvcnk6IDMsXHJcbiAgICAgIHJlcXVpcmVkOiAyLFxyXG4gICAgICBhZHZpc29yeTogMSxcclxuICAgIH07XHJcblxyXG4gICAgLy8gQ291bnQgdmlvbGF0aW9ucyBieSBzZXZlcml0eVxyXG4gICAgY29uc3QgY291bnRzID0ge1xyXG4gICAgICBtYW5kYXRvcnk6IHZpb2xhdGlvbnMuZmlsdGVyKHYgPT4gdi5zZXZlcml0eSA9PT0gJ21hbmRhdG9yeScpLmxlbmd0aCxcclxuICAgICAgcmVxdWlyZWQ6IHZpb2xhdGlvbnMuZmlsdGVyKHYgPT4gdi5zZXZlcml0eSA9PT0gJ3JlcXVpcmVkJykubGVuZ3RoLFxyXG4gICAgICBhZHZpc29yeTogdmlvbGF0aW9ucy5maWx0ZXIodiA9PiB2LnNldmVyaXR5ID09PSAnYWR2aXNvcnknKS5sZW5ndGgsXHJcbiAgICB9O1xyXG5cclxuICAgIC8vIENhbGN1bGF0ZSB3ZWlnaHRlZCB2aW9sYXRpb24gc2NvcmVcclxuICAgIGNvbnN0IHdlaWdodGVkVmlvbGF0aW9ucyA9XHJcbiAgICAgIGNvdW50cy5tYW5kYXRvcnkgKiB3ZWlnaHRzLm1hbmRhdG9yeSArXHJcbiAgICAgIGNvdW50cy5yZXF1aXJlZCAqIHdlaWdodHMucmVxdWlyZWQgK1xyXG4gICAgICBjb3VudHMuYWR2aXNvcnkgKiB3ZWlnaHRzLmFkdmlzb3J5O1xyXG5cclxuICAgIC8vIE1heGltdW0gcG9zc2libGUgd2VpZ2h0ZWQgc2NvcmUgKGlmIGFsbCBydWxlcyB3ZXJlIHZpb2xhdGVkIHdpdGggbWFuZGF0b3J5IHNldmVyaXR5KVxyXG4gICAgY29uc3QgbWF4V2VpZ2h0ZWRTY29yZSA9IHJ1bGVzQ2hlY2tlZCAqIHdlaWdodHMubWFuZGF0b3J5O1xyXG5cclxuICAgIC8vIENhbGN1bGF0ZSBjb21wbGlhbmNlIHBlcmNlbnRhZ2UgKDEwMCUgLSB2aW9sYXRpb24gcGVyY2VudGFnZSlcclxuICAgIGNvbnN0IHZpb2xhdGlvblBlcmNlbnRhZ2UgPSBtYXhXZWlnaHRlZFNjb3JlID4gMFxyXG4gICAgICA/ICh3ZWlnaHRlZFZpb2xhdGlvbnMgLyBtYXhXZWlnaHRlZFNjb3JlKSAqIDEwMFxyXG4gICAgICA6IDA7XHJcblxyXG4gICAgY29uc3QgY29tcGxpYW5jZVBlcmNlbnRhZ2UgPSBNYXRoLm1heCgwLCAxMDAgLSB2aW9sYXRpb25QZXJjZW50YWdlKTtcclxuXHJcbiAgICAvLyBEZXRlcm1pbmUgZ3JhZGUgYW5kIHN0YXR1c1xyXG4gICAgbGV0IGdyYWRlOiAnQScgfCAnQicgfCAnQycgfCAnRCcgfCAnRic7XHJcbiAgICBsZXQgc3RhdHVzOiAnZXhjZWxsZW50JyB8ICdnb29kJyB8ICdtb2RlcmF0ZScgfCAncG9vcicgfCAnY3JpdGljYWwnO1xyXG5cclxuICAgIGlmIChjb21wbGlhbmNlUGVyY2VudGFnZSA+PSA5NSkge1xyXG4gICAgICBncmFkZSA9ICdBJztcclxuICAgICAgc3RhdHVzID0gJ2V4Y2VsbGVudCc7XHJcbiAgICB9IGVsc2UgaWYgKGNvbXBsaWFuY2VQZXJjZW50YWdlID49IDg1KSB7XHJcbiAgICAgIGdyYWRlID0gJ0InO1xyXG4gICAgICBzdGF0dXMgPSAnZ29vZCc7XHJcbiAgICB9IGVsc2UgaWYgKGNvbXBsaWFuY2VQZXJjZW50YWdlID49IDcwKSB7XHJcbiAgICAgIGdyYWRlID0gJ0MnO1xyXG4gICAgICBzdGF0dXMgPSAnbW9kZXJhdGUnO1xyXG4gICAgfSBlbHNlIGlmIChjb21wbGlhbmNlUGVyY2VudGFnZSA+PSA1MCkge1xyXG4gICAgICBncmFkZSA9ICdEJztcclxuICAgICAgc3RhdHVzID0gJ3Bvb3InO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgZ3JhZGUgPSAnRic7XHJcbiAgICAgIHN0YXR1cyA9ICdjcml0aWNhbCc7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgcGVyY2VudGFnZTogTWF0aC5yb3VuZChjb21wbGlhbmNlUGVyY2VudGFnZSAqIDEwMCkgLyAxMDAsXHJcbiAgICAgIGdyYWRlLFxyXG4gICAgICBzdGF0dXMsXHJcbiAgICB9O1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQ2F0ZWdvcml6ZSB2aW9sYXRpb25zIGJ5IHNldmVyaXR5XHJcbiAgICogUmVxdWlyZW1lbnQgNC4yOiBDYXRlZ29yaXplIHZpb2xhdGlvbnMgYnkgc2V2ZXJpdHkgKGVycm9yL3dhcm5pbmcvaW5mbylcclxuICAgKi9cclxuICBjYXRlZ29yaXplVmlvbGF0aW9ucyh2aW9sYXRpb25zOiBWaW9sYXRpb25EZXRhaWxbXSk6IFZpb2xhdGlvbkNhdGVnb3JpemF0aW9uIHtcclxuICAgIGNvbnN0IGJ5U2V2ZXJpdHkgPSB7XHJcbiAgICAgIG1hbmRhdG9yeTogdmlvbGF0aW9ucy5maWx0ZXIodiA9PiB2LnNldmVyaXR5ID09PSAnbWFuZGF0b3J5JyksXHJcbiAgICAgIHJlcXVpcmVkOiB2aW9sYXRpb25zLmZpbHRlcih2ID0+IHYuc2V2ZXJpdHkgPT09ICdyZXF1aXJlZCcpLFxyXG4gICAgICBhZHZpc29yeTogdmlvbGF0aW9ucy5maWx0ZXIodiA9PiB2LnNldmVyaXR5ID09PSAnYWR2aXNvcnknKSxcclxuICAgIH07XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgYnlTZXZlcml0eSxcclxuICAgICAgY291bnRzOiB7XHJcbiAgICAgICAgbWFuZGF0b3J5OiBieVNldmVyaXR5Lm1hbmRhdG9yeS5sZW5ndGgsXHJcbiAgICAgICAgcmVxdWlyZWQ6IGJ5U2V2ZXJpdHkucmVxdWlyZWQubGVuZ3RoLFxyXG4gICAgICAgIGFkdmlzb3J5OiBieVNldmVyaXR5LmFkdmlzb3J5Lmxlbmd0aCxcclxuICAgICAgICB0b3RhbDogdmlvbGF0aW9ucy5sZW5ndGgsXHJcbiAgICAgIH0sXHJcbiAgICB9O1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR2VuZXJhdGUgZG93bmxvYWRhYmxlIFBERiByZXBvcnRcclxuICAgKiBSZXF1aXJlbWVudCA0LjU6IEdlbmVyYXRlIGRvd25sb2FkYWJsZSBQREYgcmVwb3J0cyB3aXRoIGV4ZWN1dGl2ZSBzdW1tYXJ5XHJcbiAgICogUmVxdWlyZW1lbnQgNy4xOiBDcmVhdGUgZG93bmxvYWRhYmxlIFBERiByZXBvcnQgZ2VuZXJhdGlvbiB1c2luZyBleGlzdGluZyBpbmZyYXN0cnVjdHVyZVxyXG4gICAqL1xyXG4gIGFzeW5jIGdlbmVyYXRlRG93bmxvYWRhYmxlUmVwb3J0KFxyXG4gICAgYW5hbHlzaXNSZXN1bHQ6IEFuYWx5c2lzUmVzdWx0SW5wdXQsXHJcbiAgICBvcHRpb25zOiBSZXBvcnRHZW5lcmF0aW9uT3B0aW9ucyA9IHsgZ2VuZXJhdGVQREY6IHRydWUgfVxyXG4gICk6IFByb21pc2U8c3RyaW5nPiB7XHJcbiAgICBpZiAoIW9wdGlvbnMuZ2VuZXJhdGVQREYpIHtcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdQREYgZ2VuZXJhdGlvbiBpcyByZXF1aXJlZCcpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIENoZWNrIGlmIHJlcG9ydCBhbHJlYWR5IGV4aXN0cyBpbiBTM1xyXG4gICAgY29uc3QgcmVwb3J0S2V5ID0gYHJlcG9ydHMvJHthbmFseXNpc1Jlc3VsdC5maWxlSWR9LyR7YW5hbHlzaXNSZXN1bHQuYW5hbHlzaXNJZH0ucGRmYDtcclxuXHJcbiAgICB0cnkge1xyXG4gICAgICAvLyBUcnkgdG8gZ2V0IGV4aXN0aW5nIHJlcG9ydFxyXG4gICAgICBhd2FpdCB0aGlzLnMzQ2xpZW50LnNlbmQoXHJcbiAgICAgICAgbmV3IEdldE9iamVjdENvbW1hbmQoe1xyXG4gICAgICAgICAgQnVja2V0OiB0aGlzLmJ1Y2tldE5hbWUsXHJcbiAgICAgICAgICBLZXk6IHJlcG9ydEtleSxcclxuICAgICAgICB9KVxyXG4gICAgICApO1xyXG5cclxuICAgICAgY29uc29sZS5sb2coJ1JlcG9ydCBhbHJlYWR5IGV4aXN0cywgZ2VuZXJhdGluZyBwcmVzaWduZWQgVVJMJyk7XHJcbiAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XHJcbiAgICAgIC8vIFJlcG9ydCBkb2Vzbid0IGV4aXN0LCBnZW5lcmF0ZSBpdFxyXG4gICAgICBpZiAoZXJyb3IubmFtZSA9PT0gJ05vU3VjaEtleScgfHwgZXJyb3IuQ29kZSA9PT0gJ05vU3VjaEtleScpIHtcclxuICAgICAgICBjb25zb2xlLmxvZygnR2VuZXJhdGluZyBuZXcgUERGIHJlcG9ydC4uLicpO1xyXG5cclxuICAgICAgICAvLyBDb252ZXJ0IHRvIGZvcm1hdCBleHBlY3RlZCBieSBSZXBvcnRHZW5lcmF0b3JcclxuICAgICAgICBjb25zdCByZXBvcnREYXRhID0gdGhpcy5jb252ZXJ0VG9SZXBvcnRGb3JtYXQoYW5hbHlzaXNSZXN1bHQpO1xyXG5cclxuICAgICAgICAvLyBHZW5lcmF0ZSBQREYgdXNpbmcgZXhpc3RpbmcgaW5mcmFzdHJ1Y3R1cmVcclxuICAgICAgICBjb25zdCBwZGZCdWZmZXIgPSBhd2FpdCB0aGlzLnJlcG9ydEdlbmVyYXRvci5nZW5lcmF0ZVBERihcclxuICAgICAgICAgIHJlcG9ydERhdGEsXHJcbiAgICAgICAgICBhbmFseXNpc1Jlc3VsdC5maWxlTmFtZVxyXG4gICAgICAgICk7XHJcblxyXG4gICAgICAgIC8vIFN0b3JlIFBERiBpbiBTM1xyXG4gICAgICAgIGF3YWl0IHRoaXMuczNDbGllbnQuc2VuZChcclxuICAgICAgICAgIG5ldyBQdXRPYmplY3RDb21tYW5kKHtcclxuICAgICAgICAgICAgQnVja2V0OiB0aGlzLmJ1Y2tldE5hbWUsXHJcbiAgICAgICAgICAgIEtleTogcmVwb3J0S2V5LFxyXG4gICAgICAgICAgICBCb2R5OiBwZGZCdWZmZXIsXHJcbiAgICAgICAgICAgIENvbnRlbnRUeXBlOiAnYXBwbGljYXRpb24vcGRmJyxcclxuICAgICAgICAgICAgTWV0YWRhdGE6IHtcclxuICAgICAgICAgICAgICBmaWxlSWQ6IGFuYWx5c2lzUmVzdWx0LmZpbGVJZCxcclxuICAgICAgICAgICAgICBhbmFseXNpc0lkOiBhbmFseXNpc1Jlc3VsdC5hbmFseXNpc0lkLFxyXG4gICAgICAgICAgICAgIGZpbGVOYW1lOiBhbmFseXNpc1Jlc3VsdC5maWxlTmFtZSxcclxuICAgICAgICAgICAgICB0aW1lc3RhbXA6IGFuYWx5c2lzUmVzdWx0LnRpbWVzdGFtcC50b1N0cmluZygpLFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgfSlcclxuICAgICAgICApO1xyXG5cclxuICAgICAgICBjb25zb2xlLmxvZygnUERGIHJlcG9ydCBnZW5lcmF0ZWQgYW5kIHN0b3JlZCBpbiBTMycpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIHRocm93IGVycm9yO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLy8gR2VuZXJhdGUgcHJlc2lnbmVkIFVSTCBmb3IgZG93bmxvYWQgKGV4cGlyZXMgaW4gc3BlY2lmaWVkIGhvdXJzLCBkZWZhdWx0IDEgaG91cilcclxuICAgIGNvbnN0IGV4cGlyYXRpb25TZWNvbmRzID0gKG9wdGlvbnMuZXhwaXJhdGlvbkhvdXJzIHx8IDEpICogMzYwMDtcclxuXHJcbiAgICBjb25zdCBkb3dubG9hZFVybCA9IGF3YWl0IGdldFNpZ25lZFVybChcclxuICAgICAgdGhpcy5zM0NsaWVudCxcclxuICAgICAgbmV3IEdldE9iamVjdENvbW1hbmQoe1xyXG4gICAgICAgIEJ1Y2tldDogdGhpcy5idWNrZXROYW1lLFxyXG4gICAgICAgIEtleTogcmVwb3J0S2V5LFxyXG4gICAgICB9KSxcclxuICAgICAgeyBleHBpcmVzSW46IGV4cGlyYXRpb25TZWNvbmRzIH1cclxuICAgICk7XHJcblxyXG4gICAgcmV0dXJuIGRvd25sb2FkVXJsO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQ29udmVydCBhbmFseXNpcyByZXN1bHQgdG8gZm9ybWF0IGV4cGVjdGVkIGJ5IFJlcG9ydEdlbmVyYXRvclxyXG4gICAqL1xyXG4gIHByaXZhdGUgY29udmVydFRvUmVwb3J0Rm9ybWF0KGFuYWx5c2lzUmVzdWx0OiBBbmFseXNpc1Jlc3VsdElucHV0KTogYW55IHtcclxuICAgIGNvbnN0IGNvbXBsaWFuY2VTY29yZSA9IHRoaXMuY2FsY3VsYXRlQ29tcGxpYW5jZVNjb3JlKFxyXG4gICAgICBhbmFseXNpc1Jlc3VsdC52aW9sYXRpb25zLFxyXG4gICAgICBhbmFseXNpc1Jlc3VsdC5ydWxlc0NoZWNrZWRcclxuICAgICk7XHJcblxyXG4gICAgY29uc3QgY2F0ZWdvcml6YXRpb24gPSB0aGlzLmNhdGVnb3JpemVWaW9sYXRpb25zKGFuYWx5c2lzUmVzdWx0LnZpb2xhdGlvbnMpO1xyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgIGFuYWx5c2lzSWQ6IGFuYWx5c2lzUmVzdWx0LmFuYWx5c2lzSWQsXHJcbiAgICAgIGZpbGVJZDogYW5hbHlzaXNSZXN1bHQuZmlsZUlkLFxyXG4gICAgICBmaWxlTmFtZTogYW5hbHlzaXNSZXN1bHQuZmlsZU5hbWUsXHJcbiAgICAgIHVzZXJJZDogYW5hbHlzaXNSZXN1bHQudXNlcklkLFxyXG4gICAgICBsYW5ndWFnZTogYW5hbHlzaXNSZXN1bHQubGFuZ3VhZ2UsXHJcbiAgICAgIHZpb2xhdGlvbnM6IGFuYWx5c2lzUmVzdWx0LnZpb2xhdGlvbnMsXHJcbiAgICAgIHN1bW1hcnk6IHtcclxuICAgICAgICB0b3RhbFZpb2xhdGlvbnM6IGFuYWx5c2lzUmVzdWx0LnZpb2xhdGlvbnMubGVuZ3RoLFxyXG4gICAgICAgIGNyaXRpY2FsQ291bnQ6IGNhdGVnb3JpemF0aW9uLmNvdW50cy5tYW5kYXRvcnksXHJcbiAgICAgICAgbWFqb3JDb3VudDogY2F0ZWdvcml6YXRpb24uY291bnRzLnJlcXVpcmVkLFxyXG4gICAgICAgIG1pbm9yQ291bnQ6IGNhdGVnb3JpemF0aW9uLmNvdW50cy5hZHZpc29yeSxcclxuICAgICAgICBjb21wbGlhbmNlUGVyY2VudGFnZTogY29tcGxpYW5jZVNjb3JlLnBlcmNlbnRhZ2UsXHJcbiAgICAgIH0sXHJcbiAgICAgIGNyZWF0ZWRBdDogbmV3IERhdGUoYW5hbHlzaXNSZXN1bHQudGltZXN0YW1wKS50b0lTT1N0cmluZygpLFxyXG4gICAgICBzdGF0dXM6ICdDT01QTEVURUQnLFxyXG4gICAgfTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEZvcm1hdCByZXN1bHRzIGZvciB0ZXN0IHN5c3RlbSBvdXRwdXQgY29tcGF0aWJpbGl0eVxyXG4gICAqIE1hdGNoZXMgdGhlIGV4YWN0IGZvcm1hdCB1c2VkIGluIHRlc3QtYnV0dG9uLmh0bWxcclxuICAgKi9cclxuICBmb3JtYXRGb3JUZXN0U3lzdGVtKGFuYWx5c2lzUmVzdWx0OiBBbmFseXNpc1Jlc3VsdElucHV0KToge1xyXG4gICAgc3VjY2VzczogYm9vbGVhbjtcclxuICAgIGNvbXBsaWFuY2VTY29yZTogbnVtYmVyO1xyXG4gICAgdmlvbGF0aW9uczogVmlvbGF0aW9uRGV0YWlsW107XHJcbiAgICBzdW1tYXJ5OiB7XHJcbiAgICAgIHRvdGFsOiBudW1iZXI7XHJcbiAgICAgIG1hbmRhdG9yeTogbnVtYmVyO1xyXG4gICAgICByZXF1aXJlZDogbnVtYmVyO1xyXG4gICAgICBhZHZpc29yeTogbnVtYmVyO1xyXG4gICAgfTtcclxuICAgIHRpbWVzdGFtcDogc3RyaW5nO1xyXG4gIH0ge1xyXG4gICAgY29uc3QgY2F0ZWdvcml6YXRpb24gPSB0aGlzLmNhdGVnb3JpemVWaW9sYXRpb25zKGFuYWx5c2lzUmVzdWx0LnZpb2xhdGlvbnMpO1xyXG4gICAgY29uc3QgY29tcGxpYW5jZVNjb3JlID0gdGhpcy5jYWxjdWxhdGVDb21wbGlhbmNlU2NvcmUoXHJcbiAgICAgIGFuYWx5c2lzUmVzdWx0LnZpb2xhdGlvbnMsXHJcbiAgICAgIGFuYWx5c2lzUmVzdWx0LnJ1bGVzQ2hlY2tlZFxyXG4gICAgKTtcclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICBjb21wbGlhbmNlU2NvcmU6IGNvbXBsaWFuY2VTY29yZS5wZXJjZW50YWdlLFxyXG4gICAgICB2aW9sYXRpb25zOiBhbmFseXNpc1Jlc3VsdC52aW9sYXRpb25zLFxyXG4gICAgICBzdW1tYXJ5OiB7XHJcbiAgICAgICAgdG90YWw6IGFuYWx5c2lzUmVzdWx0LnZpb2xhdGlvbnMubGVuZ3RoLFxyXG4gICAgICAgIG1hbmRhdG9yeTogY2F0ZWdvcml6YXRpb24uY291bnRzLm1hbmRhdG9yeSxcclxuICAgICAgICByZXF1aXJlZDogY2F0ZWdvcml6YXRpb24uY291bnRzLnJlcXVpcmVkLFxyXG4gICAgICAgIGFkdmlzb3J5OiBjYXRlZ29yaXphdGlvbi5jb3VudHMuYWR2aXNvcnksXHJcbiAgICAgIH0sXHJcbiAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoYW5hbHlzaXNSZXN1bHQudGltZXN0YW1wKS50b0lTT1N0cmluZygpLFxyXG4gICAgfTtcclxuICB9XHJcbn1cclxuIl19
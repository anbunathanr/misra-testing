"use strict";
/**
 * Lambda function to generate and retrieve violation reports
 * Provides detailed MISRA violation reports with recommendations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const violation_report_service_1 = require("../../services/misra/violation-report-service");
const file_metadata_service_1 = require("../../services/file-metadata-service");
const dynamodb_client_1 = require("../../database/dynamodb-client");
const violation_report_1 = require("../../types/violation-report");
const misra_rules_1 = require("../../types/misra-rules");
const environment = process.env.ENVIRONMENT || 'dev';
const dbClient = new dynamodb_client_1.DynamoDBClientWrapper(environment);
const metadataService = new file_metadata_service_1.FileMetadataService(dbClient);
const reportService = new violation_report_service_1.ViolationReportService();
const handler = async (event) => {
    console.log('Get violation report request:', JSON.stringify(event, null, 2));
    try {
        const fileId = event.pathParameters?.fileId;
        const format = event.queryStringParameters?.format || violation_report_1.ReportFormat.JSON;
        const sortBy = event.queryStringParameters?.sortBy || 'line';
        if (!fileId) {
            return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'File ID is required' })
            };
        }
        // Get file metadata
        const metadata = await metadataService.getFileMetadata(fileId);
        if (!metadata) {
            return {
                statusCode: 404,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'File not found' })
            };
        }
        // Check if analysis is complete
        if (metadata.analysis_status !== 'completed') {
            return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    error: 'Analysis not complete',
                    status: metadata.analysis_status
                })
            };
        }
        // Reconstruct analysis result from metadata
        // Note: In a real implementation, you'd store full violation details in a separate table
        const analysisResult = {
            fileId: metadata.file_id,
            fileName: metadata.filename,
            ruleSet: misra_rules_1.MisraRuleSet.C_2012, // Default, should be stored in metadata
            violations: [], // Would be retrieved from violations table
            violationsCount: metadata.analysis_results?.violations_count || 0,
            rulesChecked: metadata.analysis_results?.rules_checked || [],
            analysisTimestamp: metadata.analysis_results?.completion_timestamp || Date.now(),
            success: true
        };
        // Generate report
        const report = reportService.generateReport(analysisResult, {
            format,
            sortBy,
            includeSummary: true,
            includeRecommendations: true,
            groupBySeverity: true,
            groupByRule: true
        });
        // Format response based on requested format
        let responseBody;
        let contentType;
        switch (format) {
            case violation_report_1.ReportFormat.TEXT:
                responseBody = reportService.formatAsText(report);
                contentType = 'text/plain';
                break;
            case violation_report_1.ReportFormat.CSV:
                responseBody = reportService.formatAsCSV(report);
                contentType = 'text/csv';
                break;
            case violation_report_1.ReportFormat.JSON:
            default:
                responseBody = JSON.stringify(report, null, 2);
                contentType = 'application/json';
                break;
        }
        return {
            statusCode: 200,
            headers: {
                'Content-Type': contentType,
                'Content-Disposition': `attachment; filename="violation-report-${fileId}.${format}"`
            },
            body: responseBody
        };
    }
    catch (error) {
        console.error('Error generating violation report:', error);
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                error: 'Failed to generate violation report',
                message: error instanceof Error ? error.message : 'Unknown error'
            })
        };
    }
};
exports.handler = handler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0LXZpb2xhdGlvbi1yZXBvcnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJnZXQtdmlvbGF0aW9uLXJlcG9ydC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7OztHQUdHOzs7QUFHSCw0RkFBdUY7QUFDdkYsZ0ZBQTJFO0FBQzNFLG9FQUF1RTtBQUN2RSxtRUFBNEQ7QUFDNUQseURBQXVFO0FBRXZFLE1BQU0sV0FBVyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsV0FBVyxJQUFJLEtBQUssQ0FBQztBQUNyRCxNQUFNLFFBQVEsR0FBRyxJQUFJLHVDQUFxQixDQUFDLFdBQVcsQ0FBQyxDQUFDO0FBQ3hELE1BQU0sZUFBZSxHQUFHLElBQUksMkNBQW1CLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDMUQsTUFBTSxhQUFhLEdBQUcsSUFBSSxpREFBc0IsRUFBRSxDQUFDO0FBRTVDLE1BQU0sT0FBTyxHQUFHLEtBQUssRUFBRSxLQUEyQixFQUFrQyxFQUFFO0lBQzNGLE9BQU8sQ0FBQyxHQUFHLENBQUMsK0JBQStCLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFFN0UsSUFBSSxDQUFDO1FBQ0gsTUFBTSxNQUFNLEdBQUcsS0FBSyxDQUFDLGNBQWMsRUFBRSxNQUFNLENBQUM7UUFDNUMsTUFBTSxNQUFNLEdBQUksS0FBSyxDQUFDLHFCQUFxQixFQUFFLE1BQXVCLElBQUksK0JBQVksQ0FBQyxJQUFJLENBQUM7UUFDMUYsTUFBTSxNQUFNLEdBQUksS0FBSyxDQUFDLHFCQUFxQixFQUFFLE1BQXVDLElBQUksTUFBTSxDQUFDO1FBRS9GLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNaLE9BQU87Z0JBQ0wsVUFBVSxFQUFFLEdBQUc7Z0JBQ2YsT0FBTyxFQUFFLEVBQUUsY0FBYyxFQUFFLGtCQUFrQixFQUFFO2dCQUMvQyxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMs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SUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1FBQ2YsT0FBTyxDQUFDLEtBQUssQ0FBQyxvQ0FBb0MsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUUzRCxPQUFPO1lBQ0wsVUFBVSxFQUFFLEdBQUc7WUFDZixPQUFPLEVBQUUsRUFBRSxjQUFjLEVBQUUsa0JBQWtCLEVBQUU7WUFDL0MsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUM7Z0JBQ25CLEtBQUssRUFBRSxxQ0FBcUM7Z0JBQzVDLE9BQU8sRUFBRSxLQUFLLFlBQVksS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxlQUFlO2FBQ2xFLENBQUM7U0FDSCxDQUFDO0lBQ0osQ0FBQztBQUNILENBQUMsQ0FBQztBQXpHVyxRQUFBLE9BQU8sV0F5R2xCIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIExhbWJkYSBmdW5jdGlvbiB0byBnZW5lcmF0ZSBhbmQgcmV0cmlldmUgdmlvbGF0aW9uIHJlcG9ydHNcclxuICogUHJvdmlkZXMgZGV0YWlsZWQgTUlTUkEgdmlvbGF0aW9uIHJlcG9ydHMgd2l0aCByZWNvbW1lbmRhdGlvbnNcclxuICovXHJcblxyXG5pbXBvcnQgeyBBUElHYXRld2F5UHJveHlFdmVudCwgQVBJR2F0ZXdheVByb3h5UmVzdWx0IH0gZnJvbSAnYXdzLWxhbWJkYSc7XHJcbmltcG9ydCB7IFZpb2xhdGlvblJlcG9ydFNlcnZpY2UgfSBmcm9tICcuLi8uLi9zZXJ2aWNlcy9taXNyYS92aW9sYXRpb24tcmVwb3J0LXNlcnZpY2UnO1xyXG5pbXBvcnQgeyBGaWxlTWV0YWRhdGFTZXJ2aWNlIH0gZnJvbSAnLi4vLi4vc2VydmljZXMvZmlsZS1tZXRhZGF0YS1zZXJ2aWNlJztcclxuaW1wb3J0IHsgRHluYW1vREJDbGllbnRXcmFwcGVyIH0gZnJvbSAnLi4vLi4vZGF0YWJhc2UvZHluYW1vZGItY2xpZW50JztcclxuaW1wb3J0IHsgUmVwb3J0Rm9ybWF0IH0gZnJvbSAnLi4vLi4vdHlwZXMvdmlvbGF0aW9uLXJlcG9ydCc7XHJcbmltcG9ydCB7IEFuYWx5c2lzUmVzdWx0LCBNaXNyYVJ1bGVTZXQgfSBmcm9tICcuLi8uLi90eXBlcy9taXNyYS1ydWxlcyc7XHJcblxyXG5jb25zdCBlbnZpcm9ubWVudCA9IHByb2Nlc3MuZW52LkVOVklST05NRU5UIHx8ICdkZXYnO1xyXG5jb25zdCBkYkNsaWVudCA9IG5ldyBEeW5hbW9EQkNsaWVudFdyYXBwZXIoZW52aXJvbm1lbnQpO1xyXG5jb25zdCBtZXRhZGF0YVNlcnZpY2UgPSBuZXcgRmlsZU1ldGFkYXRhU2VydmljZShkYkNsaWVudCk7XHJcbmNvbnN0IHJlcG9ydFNlcnZpY2UgPSBuZXcgVmlvbGF0aW9uUmVwb3J0U2VydmljZSgpO1xyXG5cclxuZXhwb3J0IGNvbnN0IGhhbmRsZXIgPSBhc3luYyAoZXZlbnQ6IEFQSUdhdGV3YXlQcm94eUV2ZW50KTogUHJvbWlzZTxBUElHYXRld2F5UHJveHlSZXN1bHQ+ID0+IHtcclxuICBjb25zb2xlLmxvZygnR2V0IHZpb2xhdGlvbiByZXBvcnQgcmVxdWVzdDonLCBKU09OLnN0cmluZ2lmeShldmVudCwgbnVsbCwgMikpO1xyXG5cclxuICB0cnkge1xyXG4gICAgY29uc3QgZmlsZUlkID0gZXZlbnQucGF0aFBhcmFtZXRlcnM/LmZpbGVJZDtcclxuICAgIGNvbnN0IGZvcm1hdCA9IChldmVudC5xdWVyeVN0cmluZ1BhcmFtZXRlcnM/LmZvcm1hdCBhcyBSZXBvcnRGb3JtYXQpIHx8IFJlcG9ydEZvcm1hdC5KU09OO1xyXG4gICAgY29uc3Qgc29ydEJ5ID0gKGV2ZW50LnF1ZXJ5U3RyaW5nUGFyYW1ldGVycz8uc29ydEJ5IGFzICdsaW5lJyB8ICdzZXZlcml0eScgfCAncnVsZScpIHx8ICdsaW5lJztcclxuXHJcbiAgICBpZiAoIWZpbGVJZCkge1xyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHN0YXR1c0NvZGU6IDQwMCxcclxuICAgICAgICBoZWFkZXJzOiB7ICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicgfSxcclxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7IGVycm9yOiAnRmlsZSBJRCBpcyByZXF1aXJlZCcgfSlcclxuICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBHZXQgZmlsZSBtZXRhZGF0YVxyXG4gICAgY29uc3QgbWV0YWRhdGEgPSBhd2FpdCBtZXRhZGF0YVNlcnZpY2UuZ2V0RmlsZU1ldGFkYXRhKGZpbGVJZCk7XHJcbiAgICBcclxuICAgIGlmICghbWV0YWRhdGEpIHtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBzdGF0dXNDb2RlOiA0MDQsXHJcbiAgICAgICAgaGVhZGVyczogeyAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nIH0sXHJcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoeyBlcnJvcjogJ0ZpbGUgbm90IGZvdW5kJyB9KVxyXG4gICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIC8vIENoZWNrIGlmIGFuYWx5c2lzIGlzIGNvbXBsZXRlXHJcbiAgICBpZiAobWV0YWRhdGEuYW5hbHlzaXNfc3RhdHVzICE9PSAnY29tcGxldGVkJykge1xyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHN0YXR1c0NvZGU6IDQwMCxcclxuICAgICAgICBoZWFkZXJzOiB7ICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicgfSxcclxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7IFxyXG4gICAgICAgICAgZXJyb3I6ICdBbmFseXNpcyBub3QgY29tcGxldGUnLFxyXG4gICAgICAgICAgc3RhdHVzOiBtZXRhZGF0YS5hbmFseXNpc19zdGF0dXMgXHJcbiAgICAgICAgfSlcclxuICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBSZWNvbnN0cnVjdCBhbmFseXNpcyByZXN1bHQgZnJvbSBtZXRhZGF0YVxyXG4gICAgLy8gTm90ZTogSW4gYSByZWFsIGltcGxlbWVudGF0aW9uLCB5b3UnZCBzdG9yZSBmdWxsIHZpb2xhdGlvbiBkZXRhaWxzIGluIGEgc2VwYXJhdGUgdGFibGVcclxuICAgIGNvbnN0IGFuYWx5c2lzUmVzdWx0OiBBbmFseXNpc1Jlc3VsdCA9IHtcclxuICAgICAgZmlsZUlkOiBtZXRhZGF0YS5maWxlX2lkLFxyXG4gICAgICBmaWxlTmFtZTogbWV0YWRhdGEuZmlsZW5hbWUsXHJcbiAgICAgIHJ1bGVTZXQ6IE1pc3JhUnVsZVNldC5DXzIwMTIsIC8vIERlZmF1bHQsIHNob3VsZCBiZSBzdG9yZWQgaW4gbWV0YWRhdGFcclxuICAgICAgdmlvbGF0aW9uczogW10sIC8vIFdvdWxkIGJlIHJldHJpZXZlZCBmcm9tIHZpb2xhdGlvbnMgdGFibGVcclxuICAgICAgdmlvbGF0aW9uc0NvdW50OiBtZXRhZGF0YS5hbmFseXNpc19yZXN1bHRzPy52aW9sYXRpb25zX2NvdW50IHx8IDAsXHJcbiAgICAgIHJ1bGVzQ2hlY2tlZDogbWV0YWRhdGEuYW5hbHlzaXNfcmVzdWx0cz8ucnVsZXNfY2hlY2tlZCB8fCBbXSxcclxuICAgICAgYW5hbHlzaXNUaW1lc3RhbXA6IG1ldGFkYXRhLmFuYWx5c2lzX3Jlc3VsdHM/LmNvbXBsZXRpb25fdGltZXN0YW1wIHx8IERhdGUubm93KCksXHJcbiAgICAgIHN1Y2Nlc3M6IHRydWVcclxuICAgIH07XHJcblxyXG4gICAgLy8gR2VuZXJhdGUgcmVwb3J0XHJcbiAgICBjb25zdCByZXBvcnQgPSByZXBvcnRTZXJ2aWNlLmdlbmVyYXRlUmVwb3J0KGFuYWx5c2lzUmVzdWx0LCB7XHJcbiAgICAgIGZvcm1hdCxcclxuICAgICAgc29ydEJ5LFxyXG4gICAgICBpbmNsdWRlU3VtbWFyeTogdHJ1ZSxcclxuICAgICAgaW5jbHVkZVJlY29tbWVuZGF0aW9uczogdHJ1ZSxcclxuICAgICAgZ3JvdXBCeVNldmVyaXR5OiB0cnVlLFxyXG4gICAgICBncm91cEJ5UnVsZTogdHJ1ZVxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gRm9ybWF0IHJlc3BvbnNlIGJhc2VkIG9uIHJlcXVlc3RlZCBmb3JtYXRcclxuICAgIGxldCByZXNwb25zZUJvZHk6IHN0cmluZztcclxuICAgIGxldCBjb250ZW50VHlwZTogc3RyaW5nO1xyXG5cclxuICAgIHN3aXRjaCAoZm9ybWF0KSB7XHJcbiAgICAgIGNhc2UgUmVwb3J0Rm9ybWF0LlRFWFQ6XHJcbiAgICAgICAgcmVzcG9uc2VCb2R5ID0gcmVwb3J0U2VydmljZS5mb3JtYXRBc1RleHQocmVwb3J0KTtcclxuICAgICAgICBjb250ZW50VHlwZSA9ICd0ZXh0L3BsYWluJztcclxuICAgICAgICBicmVhaztcclxuICAgICAgXHJcbiAgICAgIGNhc2UgUmVwb3J0Rm9ybWF0LkNTVjpcclxuICAgICAgICByZXNwb25zZUJvZHkgPSByZXBvcnRTZXJ2aWNlLmZvcm1hdEFzQ1NWKHJlcG9ydCk7XHJcbiAgICAgICAgY29udGVudFR5cGUgPSAndGV4dC9jc3YnO1xyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgICBcclxuICAgICAgY2FzZSBSZXBvcnRGb3JtYXQuSlNPTjpcclxuICAgICAgZGVmYXVsdDpcclxuICAgICAgICByZXNwb25zZUJvZHkgPSBKU09OLnN0cmluZ2lmeShyZXBvcnQsIG51bGwsIDIpO1xyXG4gICAgICAgIGNvbnRlbnRUeXBlID0gJ2FwcGxpY2F0aW9uL2pzb24nO1xyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgIHN0YXR1c0NvZGU6IDIwMCxcclxuICAgICAgaGVhZGVyczogeyBcclxuICAgICAgICAnQ29udGVudC1UeXBlJzogY29udGVudFR5cGUsXHJcbiAgICAgICAgJ0NvbnRlbnQtRGlzcG9zaXRpb24nOiBgYXR0YWNobWVudDsgZmlsZW5hbWU9XCJ2aW9sYXRpb24tcmVwb3J0LSR7ZmlsZUlkfS4ke2Zvcm1hdH1cImBcclxuICAgICAgfSxcclxuICAgICAgYm9keTogcmVzcG9uc2VCb2R5XHJcbiAgICB9O1xyXG5cclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgY29uc29sZS5lcnJvcignRXJyb3IgZ2VuZXJhdGluZyB2aW9sYXRpb24gcmVwb3J0OicsIGVycm9yKTtcclxuICAgIFxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgc3RhdHVzQ29kZTogNTAwLFxyXG4gICAgICBoZWFkZXJzOiB7ICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicgfSxcclxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgIGVycm9yOiAnRmFpbGVkIHRvIGdlbmVyYXRlIHZpb2xhdGlvbiByZXBvcnQnLFxyXG4gICAgICAgIG1lc3NhZ2U6IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogJ1Vua25vd24gZXJyb3InXHJcbiAgICAgIH0pXHJcbiAgICB9O1xyXG4gIH1cclxufTtcclxuIl19
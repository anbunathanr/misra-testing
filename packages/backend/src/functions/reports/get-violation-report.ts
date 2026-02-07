/**
 * Lambda function to generate and retrieve violation reports
 * Provides detailed MISRA violation reports with recommendations
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ViolationReportService } from '../../services/misra/violation-report-service';
import { FileMetadataService } from '../../services/file-metadata-service';
import { DynamoDBClientWrapper } from '../../database/dynamodb-client';
import { ReportFormat } from '../../types/violation-report';
import { AnalysisResult, MisraRuleSet } from '../../types/misra-rules';

const environment = process.env.ENVIRONMENT || 'dev';
const dbClient = new DynamoDBClientWrapper(environment);
const metadataService = new FileMetadataService(dbClient);
const reportService = new ViolationReportService();

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log('Get violation report request:', JSON.stringify(event, null, 2));

  try {
    const fileId = event.pathParameters?.fileId;
    const format = (event.queryStringParameters?.format as ReportFormat) || ReportFormat.JSON;
    const sortBy = (event.queryStringParameters?.sortBy as 'line' | 'severity' | 'rule') || 'line';

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
    const analysisResult: AnalysisResult = {
      fileId: metadata.file_id,
      fileName: metadata.filename,
      ruleSet: MisraRuleSet.C_2012, // Default, should be stored in metadata
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
    let responseBody: string;
    let contentType: string;

    switch (format) {
      case ReportFormat.TEXT:
        responseBody = reportService.formatAsText(report);
        contentType = 'text/plain';
        break;
      
      case ReportFormat.CSV:
        responseBody = reportService.formatAsCSV(report);
        contentType = 'text/csv';
        break;
      
      case ReportFormat.JSON:
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

  } catch (error) {
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

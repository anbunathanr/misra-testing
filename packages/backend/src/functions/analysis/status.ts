import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION }));

interface AnalysisStatusResponse {
  analysisId: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  progress: number;
  estimatedTimeRemaining?: number;
  results?: AnalysisResults;
  error?: string;
  createdAt: string;
  completedAt?: string;
}

interface AnalysisResults {
  complianceScore: number;
  violations: ViolationDetail[];
  summary: {
    totalRules: number;
    passedRules: number;
    failedRules: number;
    warningRules: number;
  };
  reportUrl?: string;
  duration: number;
}

interface ViolationDetail {
  ruleId: string;
  ruleName: string;
  severity: 'error' | 'warning' | 'info';
  line: number;
  column: number;
  message: string;
  suggestion?: string;
  category: string;
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const analysisId = event.pathParameters?.analysisId;

    if (!analysisId) {
      return errorResponse(400, 'MISSING_ANALYSIS_ID', 'Analysis ID is required');
    }

    // Get analysis record from DynamoDB
    const analysisRecord = await dynamoClient.send(new GetCommand({
      TableName: process.env.ANALYSIS_RESULTS_TABLE_NAME!,
      Key: { analysisId }
    }));

    if (!analysisRecord.Item) {
      return errorResponse(404, 'ANALYSIS_NOT_FOUND', 'Analysis not found');
    }

    const analysis = analysisRecord.Item;
    
    // Return real analysis status from database
    let currentProgress = analysis.progress || 0;
    let status = analysis.status;
    let estimatedTimeRemaining;

    // Calculate estimated time remaining for running analyses
    if (status === 'running' && currentProgress < 100) {
      const runTime = Date.now() - new Date(analysis.createdAt).getTime();
      const estimatedTotal = analysis.estimatedDuration || 120000; // 2 minutes default
      const progressRate = currentProgress / runTime;
      estimatedTimeRemaining = Math.max(5, Math.floor((100 - currentProgress) / progressRate / 1000));
    }

    // If analysis is completed, ensure we have results
    if (status === 'completed' && !analysis.results) {
      // This shouldn't happen in production, but handle gracefully
      status = 'failed';
      analysis.error = 'Analysis completed but results not found';
    }

    const response: AnalysisStatusResponse = {
      analysisId,
      status,
      progress: currentProgress,
      estimatedTimeRemaining,
      results: analysis.results,
      error: analysis.error,
      createdAt: analysis.createdAt,
      completedAt: analysis.completedAt
    };

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      },
      body: JSON.stringify(response)
    };

  } catch (error: any) {
    console.error('Analysis status error:', error);
    return errorResponse(500, 'STATUS_CHECK_ERROR', 'Failed to check analysis status. Please try again.');
  }
};

function errorResponse(statusCode: number, code: string, message: string): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    },
    body: JSON.stringify({
      error: {
        code,
        message,
        timestamp: new Date().toISOString()
      }
    })
  };
}
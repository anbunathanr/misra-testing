import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { analysisMonitor } from '../../services/misra-analysis/analysis-monitor';

const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION }));

interface AnalysisStatusResponse {
  analysisId: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  progress: number;
  estimatedTimeRemaining?: number;
  rulesProcessed?: number;
  totalRules?: number;
  currentStep?: string;
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

    // Use analysis monitor to get comprehensive progress information
    // Requirements: 3.3 (2-second polling), 3.4 (estimated time remaining)
    const progress = await analysisMonitor.getAnalysisProgress(analysisId);

    if (!progress) {
      return errorResponse(404, 'ANALYSIS_NOT_FOUND', 'Analysis not found');
    }

    // Get full analysis record for results if completed
    let results: AnalysisResults | undefined;
    let error: string | undefined;
    let completedAt: string | undefined;

    if (progress.status === 'completed' || progress.status === 'failed') {
      try {
        const analysisRecord = await dynamoClient.send(new GetCommand({
          TableName: process.env.ANALYSIS_RESULTS_TABLE_NAME!,
          Key: { analysisId }
        }));

        if (analysisRecord && analysisRecord.Item) {
          results = analysisRecord.Item.results;
          error = analysisRecord.Item.error;
          completedAt = analysisRecord.Item.completedAt;
        }
      } catch (dbError) {
        // Log error but don't fail the request - progress data is sufficient
        console.warn('Failed to fetch additional analysis data from DynamoDB:', dbError);
      }
    }

    const response: AnalysisStatusResponse = {
      analysisId,
      status: progress.status,
      progress: progress.progress,
      estimatedTimeRemaining: progress.estimatedTimeRemaining,
      rulesProcessed: progress.rulesProcessed,
      totalRules: progress.totalRules,
      currentStep: progress.currentStep,
      results,
      error,
      createdAt: new Date(progress.startTime).toISOString(),
      completedAt
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
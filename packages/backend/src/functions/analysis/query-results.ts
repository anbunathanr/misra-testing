/**
 * Lambda function to query analysis results
 * Provides filtering and pagination for analysis history
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { AnalysisResultsService } from '../../services/analysis-results-service';
import { DynamoDBClientWrapper } from '../../database/dynamodb-client';
import { AnalysisQueryFilters } from '../../types/analysis-persistence';
import { MisraRuleSet } from '../../types/misra-rules';

const environment = process.env.ENVIRONMENT || 'dev';
const dbClient = new DynamoDBClientWrapper(environment);
const resultsService = new AnalysisResultsService(dbClient);

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log('Query analysis results request:', JSON.stringify(event, null, 2));

  try {
    const queryParams = event.queryStringParameters || {};
    
    // Build filters from query parameters
    const filters: AnalysisQueryFilters = {};
    
    if (queryParams.fileId) {
      filters.fileId = queryParams.fileId;
    }
    
    if (queryParams.userId) {
      filters.userId = queryParams.userId;
    }
    
    if (queryParams.ruleSet) {
      filters.ruleSet = queryParams.ruleSet as MisraRuleSet;
    }
    
    if (queryParams.startDate) {
      filters.startDate = parseInt(queryParams.startDate);
    }
    
    if (queryParams.endDate) {
      filters.endDate = parseInt(queryParams.endDate);
    }
    
    if (queryParams.minViolations) {
      filters.minViolations = parseInt(queryParams.minViolations);
    }
    
    if (queryParams.maxViolations) {
      filters.maxViolations = parseInt(queryParams.maxViolations);
    }
    
    if (queryParams.successOnly === 'true') {
      filters.successOnly = true;
    }

    // Pagination options
    const limit = queryParams.limit ? parseInt(queryParams.limit) : 50;
    const exclusiveStartKey = queryParams.lastKey ? JSON.parse(queryParams.lastKey) : undefined;

    // Query results
    const results = await resultsService.queryAnalysisResults(filters, {
      limit,
      exclusiveStartKey
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        results: results.items,
        count: results.count,
        scannedCount: results.scannedCount,
        lastEvaluatedKey: results.lastEvaluatedKey
      })
    };

  } catch (error) {
    console.error('Error querying analysis results:', error);
    
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Failed to query analysis results',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};

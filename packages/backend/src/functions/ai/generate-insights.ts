/**
 * Lambda function to generate AI-powered insights and recommendations
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { AIInsightsService } from '../../services/ai/ai-insights-service'
import { DynamoDBClientWrapper } from '../../database/dynamodb-client'
import { JWTService } from '../../services/auth/jwt-service'
import { InsightGenerationRequest } from '../../types/ai-insights'

const dbClient = new DynamoDBClientWrapper(process.env.ENVIRONMENT || 'dev')
const aiService = new AIInsightsService(dbClient)
const jwtService = new JWTService()

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // Extract and validate JWT token
    const authHeader = event.headers.Authorization || event.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse(401, 'MISSING_TOKEN', 'Authorization token is required')
    }

    const token = authHeader.substring(7)
    let tokenPayload

    try {
      tokenPayload = await jwtService.verifyAccessToken(token)
    } catch (error) {
      return errorResponse(401, 'INVALID_TOKEN', 'Invalid or expired token')
    }

    // Parse request body
    const requestBody = event.body ? JSON.parse(event.body) : {}

    const request: InsightGenerationRequest = {
      user_id: tokenPayload.userId,
      analysis_ids: requestBody.analysis_ids,
      time_range_days: requestBody.time_range_days || 30,
      include_baseline: requestBody.include_baseline !== false
    }

    // Generate insights
    const insights = await aiService.generateInsights(request)

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      },
      body: JSON.stringify(insights),
    }
  } catch (error) {
    console.error('Generate insights error:', error)

    if (error instanceof Error) {
      return errorResponse(500, 'INTERNAL_ERROR', error.message)
    }

    return errorResponse(500, 'INTERNAL_ERROR', 'Internal server error')
  }
}

function errorResponse(
  statusCode: number,
  code: string,
  message: string
): APIGatewayProxyResult {
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
        timestamp: new Date().toISOString(),
        requestId: Math.random().toString(36).substring(7),
      },
    }),
  }
}

/**
 * Lambda function to submit user feedback on AI insights
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { v4 as uuidv4 } from 'uuid'
import { UserFeedback } from '../../types/ai-insights'
import { AIInsightsService } from '../../services/ai/ai-insights-service'
import { DynamoDBClientWrapper } from '../../database/dynamodb-client'
import { JWTService } from '../../services/auth/jwt-service'

const dbClient = new DynamoDBClientWrapper(process.env.ENVIRONMENT || 'dev')
const aiService = new AIInsightsService(dbClient)
const jwtService = new JWTService()

interface FeedbackRequest {
  insight_id: string
  rating: number
  helpful: boolean
  comment?: string
}

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
    if (!event.body) {
      return errorResponse(400, 'MISSING_BODY', 'Request body is required')
    }

    const request: FeedbackRequest = JSON.parse(event.body)

    // Validate input
    if (!request.insight_id || request.rating === undefined || request.helpful === undefined) {
      return errorResponse(
        400,
        'INVALID_INPUT',
        'insight_id, rating, and helpful are required'
      )
    }

    if (request.rating < 1 || request.rating > 5) {
      return errorResponse(400, 'INVALID_RATING', 'Rating must be between 1 and 5')
    }

    // Create feedback object
    const feedback: UserFeedback = {
      feedback_id: uuidv4(),
      insight_id: request.insight_id,
      user_id: tokenPayload.userId,
      rating: request.rating,
      helpful: request.helpful,
      comment: request.comment,
      created_at: Date.now()
    }

    // Store feedback
    await aiService.storeFeedback(feedback)

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization'
      },
      body: JSON.stringify({
        message: 'Feedback submitted successfully',
        feedback_id: feedback.feedback_id
      })
    }
  } catch (error) {
    console.error('Submit feedback error:', error)

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
      'Access-Control-Allow-Headers': 'Content-Type,Authorization'
    },
    body: JSON.stringify({
      error: {
        code,
        message,
        timestamp: new Date().toISOString(),
        requestId: Math.random().toString(36).substring(7)
      }
    })
  }
}

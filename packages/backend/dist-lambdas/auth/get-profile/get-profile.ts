/**
 * Get User Profile Lambda Function
 * Demonstrates RBAC middleware usage
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { JWTService, JWTPayload } from '../../services/auth/jwt-service'
import { UserService } from '../../services/user/user-service'
import { checkPermission, checkOwnership } from '../../middleware/rbac-middleware'

const jwtService = new JWTService()
const userService = new UserService()

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // Extract and verify JWT token
    const authHeader = event.headers.Authorization || event.headers.authorization
    const token = jwtService.extractTokenFromHeader(authHeader)

    if (!token) {
      return errorResponse(401, 'MISSING_TOKEN', 'Authorization token required')
    }

    // Verify token
    let user: JWTPayload
    try {
      user = await jwtService.verifyAccessToken(token)
    } catch (error) {
      return errorResponse(401, 'INVALID_TOKEN', 'Invalid or expired token')
    }

    // Check permission to read users
    const permissionError = checkPermission(user, 'users', 'read')
    if (permissionError) {
      return permissionError
    }

    // Get userId from path parameters
    const userId = event.pathParameters?.userId || user.userId

    // If requesting another user's profile, check ownership
    if (userId !== user.userId) {
      const ownershipError = checkOwnership(user, userId)
      if (ownershipError) {
        return ownershipError
      }
    }

    // Get user profile
    const userProfile = await userService.getUserById(userId)

    if (!userProfile) {
      return errorResponse(404, 'USER_NOT_FOUND', 'User not found')
    }

    // Remove sensitive data before returning
    const safeProfile = {
      userId: userProfile.userId,
      email: userProfile.email,
      organizationId: userProfile.organizationId,
      role: userProfile.role,
      preferences: userProfile.preferences,
      createdAt: userProfile.createdAt,
      lastLoginAt: userProfile.lastLoginAt,
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      },
      body: JSON.stringify(safeProfile),
    }
  } catch (error) {
    console.error('Get profile error:', error)
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

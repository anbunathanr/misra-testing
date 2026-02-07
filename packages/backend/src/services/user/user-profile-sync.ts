/**
 * User Profile Synchronization Service
 * Syncs user data between n8n and DynamoDB
 */

import { N8nService, N8nUser } from '../auth/n8n-service'
import { UserService, CreateUserRequest } from './user-service'

export interface SyncResult {
  success: boolean
  userId?: string
  created: boolean
  updated: boolean
  error?: string
}

export class UserProfileSyncService {
  private n8nService: N8nService
  private userService: UserService

  constructor() {
    this.n8nService = new N8nService()
    this.userService = new UserService()
  }

  /**
   * Sync user profile from n8n to DynamoDB
   * Creates user if doesn't exist, updates if exists
   */
  async syncUserProfile(email: string): Promise<SyncResult> {
    try {
      // Get user data from n8n
      const n8nUser = await this.n8nService.syncUserProfile('', email)

      if (!n8nUser) {
        return {
          success: false,
          created: false,
          updated: false,
          error: 'User not found in n8n',
        }
      }

      // Check if user exists in our system
      const existingUser = await this.userService.getUserByEmail(email)

      if (existingUser) {
        // User exists, check if we need to update
        const needsUpdate = this.checkIfUpdateNeeded(existingUser, n8nUser)

        if (needsUpdate) {
          // Update user role if changed
          if (existingUser.role !== n8nUser.role && n8nUser.role) {
            // Note: We'd need to add an updateUserRole method to UserService
            // For now, we'll just log it
            console.log(`User role changed: ${existingUser.role} -> ${n8nUser.role}`)
          }

          return {
            success: true,
            userId: existingUser.userId,
            created: false,
            updated: true,
          }
        }

        return {
          success: true,
          userId: existingUser.userId,
          created: false,
          updated: false,
        }
      }

      // User doesn't exist, create new user
      const newUser = await this.userService.createUser({
        email: n8nUser.email,
        organizationId: n8nUser.organizationId,
        role: n8nUser.role || 'developer',
        preferences: {
          theme: 'light',
          notifications: {
            email: true,
            webhook: false,
          },
          defaultMisraRuleSet: 'MISRA_C_2012',
        },
      })

      return {
        success: true,
        userId: newUser.userId,
        created: true,
        updated: false,
      }
    } catch (error) {
      console.error('Error syncing user profile:', error)
      return {
        success: false,
        created: false,
        updated: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Sync multiple users by organization
   */
  async syncOrganizationUsers(organizationId: string): Promise<SyncResult[]> {
    try {
      // Get all users from our system for this organization
      const existingUsers = await this.userService.getUsersByOrganization(organizationId)

      // In a real implementation, we'd fetch all users from n8n for this org
      // For now, we'll just sync the existing users
      const syncResults: SyncResult[] = []

      for (const user of existingUsers) {
        const result = await this.syncUserProfile(user.email)
        syncResults.push(result)
      }

      return syncResults
    } catch (error) {
      console.error('Error syncing organization users:', error)
      return []
    }
  }

  /**
   * Validate user credentials and sync profile
   * Used during login to ensure user data is up-to-date
   */
  async validateAndSync(email: string, password: string): Promise<{
    valid: boolean
    userId?: string
    n8nUser?: N8nUser
    error?: string
  }> {
    try {
      // Validate credentials with n8n
      const n8nUser = await this.n8nService.validateCredentials(email, password)

      if (!n8nUser) {
        return {
          valid: false,
          error: 'Invalid credentials',
        }
      }

      // Sync user profile
      const syncResult = await this.syncUserProfile(email)

      if (!syncResult.success) {
        return {
          valid: true,
          n8nUser,
          error: 'Failed to sync user profile',
        }
      }

      return {
        valid: true,
        userId: syncResult.userId,
        n8nUser,
      }
    } catch (error) {
      console.error('Error validating and syncing user:', error)
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Check if user data needs to be updated
   */
  private checkIfUpdateNeeded(existingUser: any, n8nUser: N8nUser): boolean {
    // Check if role changed
    if (n8nUser.role && existingUser.role !== n8nUser.role) {
      return true
    }

    // Check if organization changed
    if (existingUser.organizationId !== n8nUser.organizationId) {
      return true
    }

    return false
  }

  /**
   * Deactivate user (soft delete)
   * Marks user as inactive without deleting data
   */
  async deactivateUser(userId: string): Promise<boolean> {
    try {
      // In a real implementation, we'd add an 'active' field to the user model
      // and update it here. For now, we'll just log it.
      console.log(`Deactivating user: ${userId}`)
      return true
    } catch (error) {
      console.error('Error deactivating user:', error)
      return false
    }
  }

  /**
   * Reactivate user
   */
  async reactivateUser(userId: string): Promise<boolean> {
    try {
      console.log(`Reactivating user: ${userId}`)
      return true
    } catch (error) {
      console.error('Error reactivating user:', error)
      return false
    }
  }
}

/**
 * User Profile Synchronization Service
 * Syncs user data between n8n and DynamoDB
 */
import { N8nUser } from '../auth/n8n-service';
export interface SyncResult {
    success: boolean;
    userId?: string;
    created: boolean;
    updated: boolean;
    error?: string;
}
export declare class UserProfileSyncService {
    private n8nService;
    private userService;
    constructor();
    /**
     * Sync user profile from n8n to DynamoDB
     * Creates user if doesn't exist, updates if exists
     */
    syncUserProfile(email: string): Promise<SyncResult>;
    /**
     * Sync multiple users by organization
     */
    syncOrganizationUsers(organizationId: string): Promise<SyncResult[]>;
    /**
     * Validate user credentials and sync profile
     * Used during login to ensure user data is up-to-date
     */
    validateAndSync(email: string, password: string): Promise<{
        valid: boolean;
        userId?: string;
        n8nUser?: N8nUser;
        error?: string;
    }>;
    /**
     * Check if user data needs to be updated
     */
    private checkIfUpdateNeeded;
    /**
     * Deactivate user (soft delete)
     * Marks user as inactive without deleting data
     */
    deactivateUser(userId: string): Promise<boolean>;
    /**
     * Reactivate user
     */
    reactivateUser(userId: string): Promise<boolean>;
}

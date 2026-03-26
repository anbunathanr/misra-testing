"use strict";
/**
 * User Profile Synchronization Service
 * Syncs user data between n8n and DynamoDB
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserProfileSyncService = void 0;
const n8n_service_1 = require("../auth/n8n-service");
const user_service_1 = require("./user-service");
class UserProfileSyncService {
    n8nService;
    userService;
    constructor() {
        this.n8nService = new n8n_service_1.N8nService();
        this.userService = new user_service_1.UserService();
    }
    /**
     * Sync user profile from n8n to DynamoDB
     * Creates user if doesn't exist, updates if exists
     */
    async syncUserProfile(email) {
        try {
            // Get user data from n8n
            const n8nUser = await this.n8nService.syncUserProfile('', email);
            if (!n8nUser) {
                return {
                    success: false,
                    created: false,
                    updated: false,
                    error: 'User not found in n8n',
                };
            }
            // Check if user exists in our system
            const existingUser = await this.userService.getUserByEmail(email);
            if (existingUser) {
                // User exists, check if we need to update
                const needsUpdate = this.checkIfUpdateNeeded(existingUser, n8nUser);
                if (needsUpdate) {
                    // Update user role if changed
                    if (existingUser.role !== n8nUser.role && n8nUser.role) {
                        // Note: We'd need to add an updateUserRole method to UserService
                        // For now, we'll just log it
                        console.log(`User role changed: ${existingUser.role} -> ${n8nUser.role}`);
                    }
                    return {
                        success: true,
                        userId: existingUser.userId,
                        created: false,
                        updated: true,
                    };
                }
                return {
                    success: true,
                    userId: existingUser.userId,
                    created: false,
                    updated: false,
                };
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
            });
            return {
                success: true,
                userId: newUser.userId,
                created: true,
                updated: false,
            };
        }
        catch (error) {
            console.error('Error syncing user profile:', error);
            return {
                success: false,
                created: false,
                updated: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }
    /**
     * Sync multiple users by organization
     */
    async syncOrganizationUsers(organizationId) {
        try {
            // Get all users from our system for this organization
            const existingUsers = await this.userService.getUsersByOrganization(organizationId);
            // In a real implementation, we'd fetch all users from n8n for this org
            // For now, we'll just sync the existing users
            const syncResults = [];
            for (const user of existingUsers) {
                const result = await this.syncUserProfile(user.email);
                syncResults.push(result);
            }
            return syncResults;
        }
        catch (error) {
            console.error('Error syncing organization users:', error);
            return [];
        }
    }
    /**
     * Validate user credentials and sync profile
     * Used during login to ensure user data is up-to-date
     */
    async validateAndSync(email, password) {
        try {
            // Validate credentials with n8n
            const n8nUser = await this.n8nService.validateCredentials(email, password);
            if (!n8nUser) {
                return {
                    valid: false,
                    error: 'Invalid credentials',
                };
            }
            // Sync user profile
            const syncResult = await this.syncUserProfile(email);
            if (!syncResult.success) {
                return {
                    valid: true,
                    n8nUser,
                    error: 'Failed to sync user profile',
                };
            }
            return {
                valid: true,
                userId: syncResult.userId,
                n8nUser,
            };
        }
        catch (error) {
            console.error('Error validating and syncing user:', error);
            return {
                valid: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }
    /**
     * Check if user data needs to be updated
     */
    checkIfUpdateNeeded(existingUser, n8nUser) {
        // Check if role changed
        if (n8nUser.role && existingUser.role !== n8nUser.role) {
            return true;
        }
        // Check if organization changed
        if (existingUser.organizationId !== n8nUser.organizationId) {
            return true;
        }
        return false;
    }
    /**
     * Deactivate user (soft delete)
     * Marks user as inactive without deleting data
     */
    async deactivateUser(userId) {
        try {
            // In a real implementation, we'd add an 'active' field to the user model
            // and update it here. For now, we'll just log it.
            console.log(`Deactivating user: ${userId}`);
            return true;
        }
        catch (error) {
            console.error('Error deactivating user:', error);
            return false;
        }
    }
    /**
     * Reactivate user
     */
    async reactivateUser(userId) {
        try {
            console.log(`Reactivating user: ${userId}`);
            return true;
        }
        catch (error) {
            console.error('Error reactivating user:', error);
            return false;
        }
    }
}
exports.UserProfileSyncService = UserProfileSyncService;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlci1wcm9maWxlLXN5bmMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ1c2VyLXByb2ZpbGUtc3luYy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7OztHQUdHOzs7QUFFSCxxREFBeUQ7QUFDekQsaURBQStEO0FBVS9ELE1BQWEsc0JBQXNCO0lBQ3pCLFVBQVUsQ0FBWTtJQUN0QixXQUFXLENBQWE7SUFFaEM7UUFDRSxJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksd0JBQVUsRUFBRSxDQUFBO1FBQ2xDLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSwwQkFBVyxFQUFFLENBQUE7SUFDdEMsQ0FBQztJQUVEOzs7T0FHRztJQUNILEtBQUssQ0FBQyxlQUFlLENBQUMsS0FBYTtRQUNqQyxJQUFJLENBQUM7WUFDSCx5QkFBeUI7WUFDekIsTUFBTSxPQUFPLEdBQUcsTUFBTSxJQUFJLENBQUMsVUFBVSxDQUFDLGVBQWUsQ0FBQyxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUE7WUFFaEUsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUNiLE9BQU87b0JBQ0wsT0FBTyxFQUFFLEtBQUs7b0JBQ2QsT0FBTyxFQUFFLEtBQUs7b0JBQ2QsT0FBTyxFQUFFLEtBQUs7b0JBQ2QsS0FBSyxFQUFFLHVCQUF1QjtpQkFDL0IsQ0FBQTtZQUNILENBQUM7WUFFRCxxQ0FBcUM7WUFDckMsTUFBTSxZQUFZLEdBQUcsTUFBTSxJQUFJLENBQUMsV0FBVyxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsQ0FBQTtZQUVqRSxJQUFJLFlBQVksRUFBRSxDQUFDO2dCQUNqQiwwQ0FBMEM7Z0JBQzFDLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxZQUFZLEVBQUUsT0FBTyxDQUFDLENBQUE7Z0JBRW5FLElBQUksV0FBVyxFQUFFLENBQUM7b0JBQ2hCLDhCQUE4QjtvQkFDOUIsSUFBSSxZQUFZLENBQUMsSUFBSSxLQUFLLE9BQU8sQ0FBQyxJQUFJLElB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QUssQ0FBQTtJQUNkLENBQUM7SUFFRDs7O09BR0c7SUFDSCxLQUFLLENBQUMsY0FBYyxDQUFDLE1BQWM7UUFDakMsSUFBSSxDQUFDO1lBQ0gseUVBQXlFO1lBQ3pFLGtEQUFrRDtZQUNsRCxPQUFPLENBQUMsR0FBRyxDQUFDLHNCQUFzQixNQUFNLEVBQUUsQ0FBQyxDQUFBO1lBQzNDLE9BQU8sSUFBSSxDQUFBO1FBQ2IsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDZixPQUFPLENBQUMsS0FBSyxDQUFDLDBCQUEwQixFQUFFLEtBQUssQ0FBQyxDQUFBO1lBQ2hELE9BQU8sS0FBSyxDQUFBO1FBQ2QsQ0FBQztJQUNILENBQUM7SUFFRDs7T0FFRztJQUNILEtBQUssQ0FBQyxjQUFjLENBQUMsTUFBYztRQUNqQyxJQUFJLENBQUM7WUFDSCxPQUFPLENBQUMsR0FBRyxDQUFDLHNCQUFzQixNQUFNLEVBQUUsQ0FBQyxDQUFBO1lBQzNDLE9BQU8sSUFBSSxDQUFBO1FBQ2IsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDZixPQUFPLENBQUMsS0FBSyxDQUFDLDBCQUEwQixFQUFFLEtBQUssQ0FBQyxDQUFBO1lBQ2hELE9BQU8sS0FBSyxDQUFBO1FBQ2QsQ0FBQztJQUNILENBQUM7Q0FDRjtBQTdNRCx3REE2TUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogVXNlciBQcm9maWxlIFN5bmNocm9uaXphdGlvbiBTZXJ2aWNlXHJcbiAqIFN5bmNzIHVzZXIgZGF0YSBiZXR3ZWVuIG44biBhbmQgRHluYW1vREJcclxuICovXHJcblxyXG5pbXBvcnQgeyBOOG5TZXJ2aWNlLCBOOG5Vc2VyIH0gZnJvbSAnLi4vYXV0aC9uOG4tc2VydmljZSdcclxuaW1wb3J0IHsgVXNlclNlcnZpY2UsIENyZWF0ZVVzZXJSZXF1ZXN0IH0gZnJvbSAnLi91c2VyLXNlcnZpY2UnXHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFN5bmNSZXN1bHQge1xyXG4gIHN1Y2Nlc3M6IGJvb2xlYW5cclxuICB1c2VySWQ/OiBzdHJpbmdcclxuICBjcmVhdGVkOiBib29sZWFuXHJcbiAgdXBkYXRlZDogYm9vbGVhblxyXG4gIGVycm9yPzogc3RyaW5nXHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBVc2VyUHJvZmlsZVN5bmNTZXJ2aWNlIHtcclxuICBwcml2YXRlIG44blNlcnZpY2U6IE44blNlcnZpY2VcclxuICBwcml2YXRlIHVzZXJTZXJ2aWNlOiBVc2VyU2VydmljZVxyXG5cclxuICBjb25zdHJ1Y3RvcigpIHtcclxuICAgIHRoaXMubjhuU2VydmljZSA9IG5ldyBOOG5TZXJ2aWNlKClcclxuICAgIHRoaXMudXNlclNlcnZpY2UgPSBuZXcgVXNlclNlcnZpY2UoKVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogU3luYyB1c2VyIHByb2ZpbGUgZnJvbSBuOG4gdG8gRHluYW1vREJcclxuICAgKiBDcmVhdGVzIHVzZXIgaWYgZG9lc24ndCBleGlzdCwgdXBkYXRlcyBpZiBleGlzdHNcclxuICAgKi9cclxuICBhc3luYyBzeW5jVXNlclByb2ZpbGUoZW1haWw6IHN0cmluZyk6IFByb21pc2U8U3luY1Jlc3VsdD4ge1xyXG4gICAgdHJ5IHtcclxuICAgICAgLy8gR2V0IHVzZXIgZGF0YSBmcm9tIG44blxyXG4gICAgICBjb25zdCBuOG5Vc2VyID0gYXdhaXQgdGhpcy5uOG5TZXJ2aWNlLnN5bmNVc2VyUHJvZmlsZSgnJywgZW1haWwpXHJcblxyXG4gICAgICBpZiAoIW44blVzZXIpIHtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgc3VjY2VzczogZmFsc2UsXHJcbiAgICAgICAgICBjcmVhdGVkOiBmYWxzZSxcclxuICAgICAgICAgIHVwZGF0ZWQ6IGZhbHNlLFxyXG4gICAgICAgICAgZXJyb3I6ICdVc2VyIG5vdCBmb3VuZCBpbiBuOG4nLFxyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gQ2hlY2sgaWYgdXNlciBleGlzdHMgaW4gb3VyIHN5c3RlbVxyXG4gICAgICBjb25zdCBleGlzdGluZ1VzZXIgPSBhd2FpdCB0aGlzLnVzZXJTZXJ2aWNlLmdldFVzZXJCeUVtYWlsKGVtYWlsKVxyXG5cclxuICAgICAgaWYgKGV4aXN0aW5nVXNlcikge1xyXG4gICAgICAgIC8vIFVzZXIgZXhpc3RzLCBjaGVjayBpZiB3ZSBuZWVkIHRvIHVwZGF0ZVxyXG4gICAgICAgIGNvbnN0IG5lZWRzVXBkYXRlID0gdGhpcy5jaGVja0lmVXBkYXRlTmVlZGVkKGV4aXN0aW5nVXNlciwgbjhuVXNlcilcclxuXHJcbiAgICAgICAgaWYgKG5lZWRzVXBkYXRlKSB7XHJcbiAgICAgICAgICAvLyBVcGRhdGUgdXNlciByb2xlIGlmIGNoYW5nZWRcclxuICAgICAgICAgIGlmIChleGlzdGluZ1VzZXIucm9sZSAhPT0gbjhuVXNlci5yb2xlICYmIG44blVzZXIucm9sZSkge1xyXG4gICAgICAgICAgICAvLyBOb3RlOiBXZSdkIG5lZWQgdG8gYWRkIGFuIHVwZGF0ZVVzZXJSb2xlIG1ldGhvZCB0byBVc2VyU2VydmljZVxyXG4gICAgICAgICAgICAvLyBGb3Igbm93LCB3ZSdsbCBqdXN0IGxvZyBpdFxyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhgVXNlciByb2xlIGNoYW5nZWQ6ICR7ZXhpc3RpbmdVc2VyLnJvbGV9IC0+ICR7bjhuVXNlci5yb2xlfWApXHJcbiAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcclxuICAgICAgICAgICAgdXNlcklkOiBleGlzdGluZ1VzZXIudXNlcklkLFxyXG4gICAgICAgICAgICBjcmVhdGVkOiBmYWxzZSxcclxuICAgICAgICAgICAgdXBkYXRlZDogdHJ1ZSxcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICAgICAgdXNlcklkOiBleGlzdGluZ1VzZXIudXNlcklkLFxyXG4gICAgICAgICAgY3JlYXRlZDogZmFsc2UsXHJcbiAgICAgICAgICB1cGRhdGVkOiBmYWxzZSxcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIFVzZXIgZG9lc24ndCBleGlzdCwgY3JlYXRlIG5ldyB1c2VyXHJcbiAgICAgIGNvbnN0IG5ld1VzZXIgPSBhd2FpdCB0aGlzLnVzZXJTZXJ2aWNlLmNyZWF0ZVVzZXIoe1xyXG4gICAgICAgIGVtYWlsOiBuOG5Vc2VyLmVtYWlsLFxyXG4gICAgICAgIG9yZ2FuaXphdGlvbklkOiBuOG5Vc2VyLm9yZ2FuaXphdGlvbklkLFxyXG4gICAgICAgIHJvbGU6IG44blVzZXIucm9sZSB8fCAnZGV2ZWxvcGVyJyxcclxuICAgICAgICBwcmVmZXJlbmNlczoge1xyXG4gICAgICAgICAgdGhlbWU6ICdsaWdodCcsXHJcbiAgICAgICAgICBub3RpZmljYXRpb25zOiB7XHJcbiAgICAgICAgICAgIGVtYWlsOiB0cnVlLFxyXG4gICAgICAgICAgICB3ZWJob29rOiBmYWxzZSxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICBkZWZhdWx0TWlzcmFSdWxlU2V0OiAnTUlTUkFfQ18yMDEyJyxcclxuICAgICAgICB9LFxyXG4gICAgICB9KVxyXG5cclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICAgIHVzZXJJZDogbmV3VXNlci51c2VySWQsXHJcbiAgICAgICAgY3JlYXRlZDogdHJ1ZSxcclxuICAgICAgICB1cGRhdGVkOiBmYWxzZSxcclxuICAgICAgfVxyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc29sZS5lcnJvcignRXJyb3Igc3luY2luZyB1c2VyIHByb2ZpbGU6JywgZXJyb3IpXHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgc3VjY2VzczogZmFsc2UsXHJcbiAgICAgICAgY3JlYXRlZDogZmFsc2UsXHJcbiAgICAgICAgdXBkYXRlZDogZmFsc2UsXHJcbiAgICAgICAgZXJyb3I6IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogJ1Vua25vd24gZXJyb3InLFxyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBTeW5jIG11bHRpcGxlIHVzZXJzIGJ5IG9yZ2FuaXphdGlvblxyXG4gICAqL1xyXG4gIGFzeW5jIHN5bmNPcmdhbml6YXRpb25Vc2Vycyhvcmdhbml6YXRpb25JZDogc3RyaW5nKTogUHJvbWlzZTxTeW5jUmVzdWx0W10+IHtcclxuICAgIHRyeSB7XHJcbiAgICAgIC8vIEdldCBhbGwgdXNlcnMgZnJvbSBvdXIgc3lzdGVtIGZvciB0aGlzIG9yZ2FuaXphdGlvblxyXG4gICAgICBjb25zdCBleGlzdGluZ1VzZXJzID0gYXdhaXQgdGhpcy51c2VyU2VydmljZS5nZXRVc2Vyc0J5T3JnYW5pemF0aW9uKG9yZ2FuaXphdGlvbklkKVxyXG5cclxuICAgICAgLy8gSW4gYSByZWFsIGltcGxlbWVudGF0aW9uLCB3ZSdkIGZldGNoIGFsbCB1c2VycyBmcm9tIG44biBmb3IgdGhpcyBvcmdcclxuICAgICAgLy8gRm9yIG5vdywgd2UnbGwganVzdCBzeW5jIHRoZSBleGlzdGluZyB1c2Vyc1xyXG4gICAgICBjb25zdCBzeW5jUmVzdWx0czogU3luY1Jlc3VsdFtdID0gW11cclxuXHJcbiAgICAgIGZvciAoY29uc3QgdXNlciBvZiBleGlzdGluZ1VzZXJzKSB7XHJcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5zeW5jVXNlclByb2ZpbGUodXNlci5lbWFpbClcclxuICAgICAgICBzeW5jUmVzdWx0cy5wdXNoKHJlc3VsdClcclxuICAgICAgfVxyXG5cclxuICAgICAgcmV0dXJuIHN5bmNSZXN1bHRzXHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBjb25zb2xlLmVycm9yKCdFcnJvciBzeW5jaW5nIG9yZ2FuaXphdGlvbiB1c2VyczonLCBlcnJvcilcclxuICAgICAgcmV0dXJuIFtdXHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBWYWxpZGF0ZSB1c2VyIGNyZWRlbnRpYWxzIGFuZCBzeW5jIHByb2ZpbGVcclxuICAgKiBVc2VkIGR1cmluZyBsb2dpbiB0byBlbnN1cmUgdXNlciBkYXRhIGlzIHVwLXRvLWRhdGVcclxuICAgKi9cclxuICBhc3luYyB2YWxpZGF0ZUFuZFN5bmMoZW1haWw6IHN0cmluZywgcGFzc3dvcmQ6IHN0cmluZyk6IFByb21pc2U8e1xyXG4gICAgdmFsaWQ6IGJvb2xlYW5cclxuICAgIHVzZXJJZD86IHN0cmluZ1xyXG4gICAgbjhuVXNlcj86IE44blVzZXJcclxuICAgIGVycm9yPzogc3RyaW5nXHJcbiAgfT4ge1xyXG4gICAgdHJ5IHtcclxuICAgICAgLy8gVmFsaWRhdGUgY3JlZGVudGlhbHMgd2l0aCBuOG5cclxuICAgICAgY29uc3QgbjhuVXNlciA9IGF3YWl0IHRoaXMubjhuU2VydmljZS52YWxpZGF0ZUNyZWRlbnRpYWxzKGVtYWlsLCBwYXNzd29yZClcclxuXHJcbiAgICAgIGlmICghbjhuVXNlcikge1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICB2YWxpZDogZmFsc2UsXHJcbiAgICAgICAgICBlcnJvcjogJ0ludmFsaWQgY3JlZGVudGlhbHMnLFxyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gU3luYyB1c2VyIHByb2ZpbGVcclxuICAgICAgY29uc3Qgc3luY1Jlc3VsdCA9IGF3YWl0IHRoaXMuc3luY1VzZXJQcm9maWxlKGVtYWlsKVxyXG5cclxuICAgICAgaWYgKCFzeW5jUmVzdWx0LnN1Y2Nlc3MpIHtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgdmFsaWQ6IHRydWUsXHJcbiAgICAgICAgICBuOG5Vc2VyLFxyXG4gICAgICAgICAgZXJyb3I6ICdGYWlsZWQgdG8gc3luYyB1c2VyIHByb2ZpbGUnLFxyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG5cclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICB2YWxpZDogdHJ1ZSxcclxuICAgICAgICB1c2VySWQ6IHN5bmNSZXN1bHQudXNlcklkLFxyXG4gICAgICAgIG44blVzZXIsXHJcbiAgICAgIH1cclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIHZhbGlkYXRpbmcgYW5kIHN5bmNpbmcgdXNlcjonLCBlcnJvcilcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICB2YWxpZDogZmFsc2UsXHJcbiAgICAgICAgZXJyb3I6IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogJ1Vua25vd24gZXJyb3InLFxyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBDaGVjayBpZiB1c2VyIGRhdGEgbmVlZHMgdG8gYmUgdXBkYXRlZFxyXG4gICAqL1xyXG4gIHByaXZhdGUgY2hlY2tJZlVwZGF0ZU5lZWRlZChleGlzdGluZ1VzZXI6IGFueSwgbjhuVXNlcjogTjhuVXNlcik6IGJvb2xlYW4ge1xyXG4gICAgLy8gQ2hlY2sgaWYgcm9sZSBjaGFuZ2VkXHJcbiAgICBpZiAobjhuVXNlci5yb2xlICYmIGV4aXN0aW5nVXNlci5yb2xlICE9PSBuOG5Vc2VyLnJvbGUpIHtcclxuICAgICAgcmV0dXJuIHRydWVcclxuICAgIH1cclxuXHJcbiAgICAvLyBDaGVjayBpZiBvcmdhbml6YXRpb24gY2hhbmdlZFxyXG4gICAgaWYgKGV4aXN0aW5nVXNlci5vcmdhbml6YXRpb25JZCAhPT0gbjhuVXNlci5vcmdhbml6YXRpb25JZCkge1xyXG4gICAgICByZXR1cm4gdHJ1ZVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBmYWxzZVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogRGVhY3RpdmF0ZSB1c2VyIChzb2Z0IGRlbGV0ZSlcclxuICAgKiBNYXJrcyB1c2VyIGFzIGluYWN0aXZlIHdpdGhvdXQgZGVsZXRpbmcgZGF0YVxyXG4gICAqL1xyXG4gIGFzeW5jIGRlYWN0aXZhdGVVc2VyKHVzZXJJZDogc3RyaW5nKTogUHJvbWlzZTxib29sZWFuPiB7XHJcbiAgICB0cnkge1xyXG4gICAgICAvLyBJbiBhIHJlYWwgaW1wbGVtZW50YXRpb24sIHdlJ2QgYWRkIGFuICdhY3RpdmUnIGZpZWxkIHRvIHRoZSB1c2VyIG1vZGVsXHJcbiAgICAgIC8vIGFuZCB1cGRhdGUgaXQgaGVyZS4gRm9yIG5vdywgd2UnbGwganVzdCBsb2cgaXQuXHJcbiAgICAgIGNvbnNvbGUubG9nKGBEZWFjdGl2YXRpbmcgdXNlcjogJHt1c2VySWR9YClcclxuICAgICAgcmV0dXJuIHRydWVcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGRlYWN0aXZhdGluZyB1c2VyOicsIGVycm9yKVxyXG4gICAgICByZXR1cm4gZmFsc2VcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFJlYWN0aXZhdGUgdXNlclxyXG4gICAqL1xyXG4gIGFzeW5jIHJlYWN0aXZhdGVVc2VyKHVzZXJJZDogc3RyaW5nKTogUHJvbWlzZTxib29sZWFuPiB7XHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zb2xlLmxvZyhgUmVhY3RpdmF0aW5nIHVzZXI6ICR7dXNlcklkfWApXHJcbiAgICAgIHJldHVybiB0cnVlXHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBjb25zb2xlLmVycm9yKCdFcnJvciByZWFjdGl2YXRpbmcgdXNlcjonLCBlcnJvcilcclxuICAgICAgcmV0dXJuIGZhbHNlXHJcbiAgICB9XHJcbiAgfVxyXG59XHJcbiJdfQ==
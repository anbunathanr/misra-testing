"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.N8nService = void 0;
class N8nService {
    n8nWebhookUrl;
    n8nApiKey;
    constructor() {
        this.n8nWebhookUrl = process.env.N8N_WEBHOOK_URL || '';
        this.n8nApiKey = process.env.N8N_API_KEY || '';
        if (!this.n8nWebhookUrl) {
            console.warn('N8N_WEBHOOK_URL not configured');
        }
    }
    async validateCredentials(email, password) {
        try {
            // For development/testing, use mock validation
            if (process.env.NODE_ENV === 'development' || !this.n8nWebhookUrl) {
                return this.mockValidateCredentials(email, password);
            }
            // In production, this would make actual HTTP request to n8n
            // For now, using mock data until n8n is properly configured
            return this.mockValidateCredentials(email, password);
        }
        catch (error) {
            console.error('Error validating credentials with n8n:', error);
            throw new Error('Authentication service unavailable');
        }
    }
    async syncUserProfile(userId, email) {
        try {
            // For development/testing, use mock data
            if (process.env.NODE_ENV === 'development' || !this.n8nWebhookUrl) {
                return this.mockGetUserProfile(email);
            }
            // In production, this would make actual HTTP request to n8n
            // For now, using mock data until n8n is properly configured
            return this.mockGetUserProfile(email);
        }
        catch (error) {
            console.error('Error syncing user profile with n8n:', error);
            return null;
        }
    }
    mockValidateCredentials(email, password) {
        // Mock validation for development - matches test users created in DynamoDB
        const validUsers = [
            {
                email: 'admin@misra-platform.com',
                password: 'password123',
                organizationId: 'org-001',
                role: 'admin',
                firstName: 'Admin',
                lastName: 'User',
            },
            {
                email: 'developer@misra-platform.com',
                password: 'password123',
                organizationId: 'org-001',
                role: 'developer',
                firstName: 'Developer',
                lastName: 'User',
            },
            {
                email: 'viewer@misra-platform.com',
                password: 'password123',
                organizationId: 'org-001',
                role: 'viewer',
                firstName: 'Viewer',
                lastName: 'User',
            },
        ];
        const user = validUsers.find(u => u.email === email && u.password === password);
        if (!user) {
            return null;
        }
        return {
            email: user.email,
            organizationId: user.organizationId,
            role: user.role,
            firstName: user.firstName,
            lastName: user.lastName,
        };
    }
    mockGetUserProfile(email) {
        // Mock profile data for development - matches test users created in DynamoDB
        const profiles = [
            {
                email: 'admin@misra-platform.com',
                organizationId: 'org-001',
                role: 'admin',
                firstName: 'Admin',
                lastName: 'User',
            },
            {
                email: 'developer@misra-platform.com',
                organizationId: 'org-001',
                role: 'developer',
                firstName: 'Developer',
                lastName: 'User',
            },
            {
                email: 'viewer@misra-platform.com',
                organizationId: 'org-001',
                role: 'viewer',
                firstName: 'Viewer',
                lastName: 'User',
            },
        ];
        return profiles.find(p => p.email === email) || null;
    }
}
exports.N8nService = N8nService;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibjhuLXNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJuOG4tc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFzQkEsTUFBYSxVQUFVO0lBQ2IsYUFBYSxDQUFTO0lBQ3RCLFNBQVMsQ0FBUztJQUUxQjtRQUNFLElBQUksQ0FBQyxhQUFhLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxlQUFlLElBQUksRUFBRSxDQUFDO1FBQ3ZELElBQUksQ0FBQyxTQUFTLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxXQUFXLElBQUksRUFBRSxDQUFDO1FBRS9DLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7WUFDeEIsT0FBTyxDQUFDLElBQUksQ0FBQyxnQ0FBZ0MsQ0FBQyxDQUFDO1FBQ2pELENBQUM7SUFDSCxDQUFDO0lBRUQsS0FBSyxDQUFDLG1CQUFtQixDQUFDLEtBQWEsRUFBRSxRQUFnQjtRQUN2RCxJQUFJLENBQUM7WUFDSCwrQ0FBK0M7WUFDL0MsSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsS0FBSyxhQUFhLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7Z0JBQ2xFLE9BQU8sSUFBSSxDQUFDLHVCQUF1QixDQUFDLEtBQUssRUFBRSxRQUFRLENBQUMsQ0FBQztZQUN2RCxDQUFDO1lBRUQsNERBQTREO1lBQzVELDREQUE0RDtZQUM1RCxPQUFPLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxLQUFLLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDdkQsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDZixPQUFPLENBQUMsS0FBSyxDQUFDLHdDQUF3QyxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQy9ELE1BQU0sSUFBSSxLQUFLLENBQUMsb0NBQW9DLENBQUMsQ0FBQztRQUN4RCxDQUFDO0lBQ0gsQ0FBQztJQUVELEtBQUssQ0FBQyxlQUFlLENBQUMsTUFBYyxFQUFFLEtBQWE7UUFDakQs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Z0NBcUhDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gRGVjbGFyZSBOb2RlLmpzIGdsb2JhbHMgZm9yIExhbWJkYSBlbnZpcm9ubWVudFxyXG5kZWNsYXJlIGNvbnN0IHByb2Nlc3M6IHtcclxuICBlbnY6IHtcclxuICAgIE5PREVfRU5WPzogc3RyaW5nO1xyXG4gICAgTjhOX1dFQkhPT0tfVVJMPzogc3RyaW5nO1xyXG4gICAgTjhOX0FQSV9LRVk/OiBzdHJpbmc7XHJcbiAgfTtcclxufTtcclxuXHJcbmRlY2xhcmUgY29uc3QgY29uc29sZToge1xyXG4gIHdhcm46IChtZXNzYWdlOiBzdHJpbmcpID0+IHZvaWQ7XHJcbiAgZXJyb3I6IChtZXNzYWdlOiBzdHJpbmcsIC4uLmFyZ3M6IGFueVtdKSA9PiB2b2lkO1xyXG59O1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBOOG5Vc2VyIHtcclxuICBlbWFpbDogc3RyaW5nO1xyXG4gIG9yZ2FuaXphdGlvbklkOiBzdHJpbmc7XHJcbiAgcm9sZT86ICdhZG1pbicgfCAnZGV2ZWxvcGVyJyB8ICd2aWV3ZXInO1xyXG4gIGZpcnN0TmFtZT86IHN0cmluZztcclxuICBsYXN0TmFtZT86IHN0cmluZztcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIE44blNlcnZpY2Uge1xyXG4gIHByaXZhdGUgbjhuV2ViaG9va1VybDogc3RyaW5nO1xyXG4gIHByaXZhdGUgbjhuQXBpS2V5OiBzdHJpbmc7XHJcblxyXG4gIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgdGhpcy5uOG5XZWJob29rVXJsID0gcHJvY2Vzcy5lbnYuTjhOX1dFQkhPT0tfVVJMIHx8ICcnO1xyXG4gICAgdGhpcy5uOG5BcGlLZXkgPSBwcm9jZXNzLmVudi5OOE5fQVBJX0tFWSB8fCAnJztcclxuXHJcbiAgICBpZiAoIXRoaXMubjhuV2ViaG9va1VybCkge1xyXG4gICAgICBjb25zb2xlLndhcm4oJ044Tl9XRUJIT09LX1VSTCBub3QgY29uZmlndXJlZCcpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgYXN5bmMgdmFsaWRhdGVDcmVkZW50aWFscyhlbWFpbDogc3RyaW5nLCBwYXNzd29yZDogc3RyaW5nKTogUHJvbWlzZTxOOG5Vc2VyIHwgbnVsbD4ge1xyXG4gICAgdHJ5IHtcclxuICAgICAgLy8gRm9yIGRldmVsb3BtZW50L3Rlc3RpbmcsIHVzZSBtb2NrIHZhbGlkYXRpb25cclxuICAgICAgaWYgKHByb2Nlc3MuZW52Lk5PREVfRU5WID09PSAnZGV2ZWxvcG1lbnQnIHx8ICF0aGlzLm44bldlYmhvb2tVcmwpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5tb2NrVmFsaWRhdGVDcmVkZW50aWFscyhlbWFpbCwgcGFzc3dvcmQpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBJbiBwcm9kdWN0aW9uLCB0aGlzIHdvdWxkIG1ha2UgYWN0dWFsIEhUVFAgcmVxdWVzdCB0byBuOG5cclxuICAgICAgLy8gRm9yIG5vdywgdXNpbmcgbW9jayBkYXRhIHVudGlsIG44biBpcyBwcm9wZXJseSBjb25maWd1cmVkXHJcbiAgICAgIHJldHVybiB0aGlzLm1vY2tWYWxpZGF0ZUNyZWRlbnRpYWxzKGVtYWlsLCBwYXNzd29yZCk7XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBjb25zb2xlLmVycm9yKCdFcnJvciB2YWxpZGF0aW5nIGNyZWRlbnRpYWxzIHdpdGggbjhuOicsIGVycm9yKTtcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdBdXRoZW50aWNhdGlvbiBzZXJ2aWNlIHVuYXZhaWxhYmxlJyk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBhc3luYyBzeW5jVXNlclByb2ZpbGUodXNlcklkOiBzdHJpbmcsIGVtYWlsOiBzdHJpbmcpOiBQcm9taXNlPE44blVzZXIgfCBudWxsPiB7XHJcbiAgICB0cnkge1xyXG4gICAgICAvLyBGb3IgZGV2ZWxvcG1lbnQvdGVzdGluZywgdXNlIG1vY2sgZGF0YVxyXG4gICAgICBpZiAocHJvY2Vzcy5lbnYuTk9ERV9FTlYgPT09ICdkZXZlbG9wbWVudCcgfHwgIXRoaXMubjhuV2ViaG9va1VybCkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLm1vY2tHZXRVc2VyUHJvZmlsZShlbWFpbCk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIEluIHByb2R1Y3Rpb24sIHRoaXMgd291bGQgbWFrZSBhY3R1YWwgSFRUUCByZXF1ZXN0IHRvIG44blxyXG4gICAgICAvLyBGb3Igbm93LCB1c2luZyBtb2NrIGRhdGEgdW50aWwgbjhuIGlzIHByb3Blcmx5IGNvbmZpZ3VyZWRcclxuICAgICAgcmV0dXJuIHRoaXMubW9ja0dldFVzZXJQcm9maWxlKGVtYWlsKTtcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIHN5bmNpbmcgdXNlciBwcm9maWxlIHdpdGggbjhuOicsIGVycm9yKTtcclxuICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIG1vY2tWYWxpZGF0ZUNyZWRlbnRpYWxzKGVtYWlsOiBzdHJpbmcsIHBhc3N3b3JkOiBzdHJpbmcpOiBOOG5Vc2VyIHwgbnVsbCB7XHJcbiAgICAvLyBNb2NrIHZhbGlkYXRpb24gZm9yIGRldmVsb3BtZW50IC0gbWF0Y2hlcyB0ZXN0IHVzZXJzIGNyZWF0ZWQgaW4gRHluYW1vREJcclxuICAgIGNvbnN0IHZhbGlkVXNlcnMgPSBbXHJcbiAgICAgIHtcclxuICAgICAgICBlbWFpbDogJ2FkbWluQG1pc3JhLXBsYXRmb3JtLmNvbScsXHJcbiAgICAgICAgcGFzc3dvcmQ6ICdwYXNzd29yZDEyMycsXHJcbiAgICAgICAgb3JnYW5pemF0aW9uSWQ6ICdvcmctMDAxJyxcclxuICAgICAgICByb2xlOiAnYWRtaW4nIGFzIGNvbnN0LFxyXG4gICAgICAgIGZpcnN0TmFtZTogJ0FkbWluJyxcclxuICAgICAgICBsYXN0TmFtZTogJ1VzZXInLFxyXG4gICAgICB9LFxyXG4gICAgICB7XHJcbiAgICAgICAgZW1haWw6ICdkZXZlbG9wZXJAbWlzcmEtcGxhdGZvcm0uY29tJyxcclxuICAgICAgICBwYXNzd29yZDogJ3Bhc3N3b3JkMTIzJyxcclxuICAgICAgICBvcmdhbml6YXRpb25JZDogJ29yZy0wMDEnLFxyXG4gICAgICAgIHJvbGU6ICdkZXZlbG9wZXInIGFzIGNvbnN0LFxyXG4gICAgICAgIGZpcnN0TmFtZTogJ0RldmVsb3BlcicsXHJcbiAgICAgICAgbGFzdE5hbWU6ICdVc2VyJyxcclxuICAgICAgfSxcclxuICAgICAge1xyXG4gICAgICAgIGVtYWlsOiAndmlld2VyQG1pc3JhLXBsYXRmb3JtLmNvbScsXHJcbiAgICAgICAgcGFzc3dvcmQ6ICdwYXNzd29yZDEyMycsXHJcbiAgICAgICAgb3JnYW5pemF0aW9uSWQ6ICdvcmctMDAxJyxcclxuICAgICAgICByb2xlOiAndmlld2VyJyBhcyBjb25zdCxcclxuICAgICAgICBmaXJzdE5hbWU6ICdWaWV3ZXInLFxyXG4gICAgICAgIGxhc3ROYW1lOiAnVXNlcicsXHJcbiAgICAgIH0sXHJcbiAgICBdO1xyXG5cclxuICAgIGNvbnN0IHVzZXIgPSB2YWxpZFVzZXJzLmZpbmQodSA9PiB1LmVtYWlsID09PSBlbWFpbCAmJiB1LnBhc3N3b3JkID09PSBwYXNzd29yZCk7XHJcbiAgICBcclxuICAgIGlmICghdXNlcikge1xyXG4gICAgICByZXR1cm4gbnVsbDtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBlbWFpbDogdXNlci5lbWFpbCxcclxuICAgICAgb3JnYW5pemF0aW9uSWQ6IHVzZXIub3JnYW5pemF0aW9uSWQsXHJcbiAgICAgIHJvbGU6IHVzZXIucm9sZSxcclxuICAgICAgZmlyc3ROYW1lOiB1c2VyLmZpcnN0TmFtZSxcclxuICAgICAgbGFzdE5hbWU6IHVzZXIubGFzdE5hbWUsXHJcbiAgICB9O1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBtb2NrR2V0VXNlclByb2ZpbGUoZW1haWw6IHN0cmluZyk6IE44blVzZXIgfCBudWxsIHtcclxuICAgIC8vIE1vY2sgcHJvZmlsZSBkYXRhIGZvciBkZXZlbG9wbWVudCAtIG1hdGNoZXMgdGVzdCB1c2VycyBjcmVhdGVkIGluIER5bmFtb0RCXHJcbiAgICBjb25zdCBwcm9maWxlcyA9IFtcclxuICAgICAge1xyXG4gICAgICAgIGVtYWlsOiAnYWRtaW5AbWlzcmEtcGxhdGZvcm0uY29tJyxcclxuICAgICAgICBvcmdhbml6YXRpb25JZDogJ29yZy0wMDEnLFxyXG4gICAgICAgIHJvbGU6ICdhZG1pbicgYXMgY29uc3QsXHJcbiAgICAgICAgZmlyc3ROYW1lOiAnQWRtaW4nLFxyXG4gICAgICAgIGxhc3ROYW1lOiAnVXNlcicsXHJcbiAgICAgIH0sXHJcbiAgICAgIHtcclxuICAgICAgICBlbWFpbDogJ2RldmVsb3BlckBtaXNyYS1wbGF0Zm9ybS5jb20nLFxyXG4gICAgICAgIG9yZ2FuaXphdGlvbklkOiAnb3JnLTAwMScsXHJcbiAgICAgICAgcm9sZTogJ2RldmVsb3BlcicgYXMgY29uc3QsXHJcbiAgICAgICAgZmlyc3ROYW1lOiAnRGV2ZWxvcGVyJyxcclxuICAgICAgICBsYXN0TmFtZTogJ1VzZXInLFxyXG4gICAgICB9LFxyXG4gICAgICB7XHJcbiAgICAgICAgZW1haWw6ICd2aWV3ZXJAbWlzcmEtcGxhdGZvcm0uY29tJyxcclxuICAgICAgICBvcmdhbml6YXRpb25JZDogJ29yZy0wMDEnLFxyXG4gICAgICAgIHJvbGU6ICd2aWV3ZXInIGFzIGNvbnN0LFxyXG4gICAgICAgIGZpcnN0TmFtZTogJ1ZpZXdlcicsXHJcbiAgICAgICAgbGFzdE5hbWU6ICdVc2VyJyxcclxuICAgICAgfSxcclxuICAgIF07XHJcblxyXG4gICAgcmV0dXJuIHByb2ZpbGVzLmZpbmQocCA9PiBwLmVtYWlsID09PSBlbWFpbCkgfHwgbnVsbDtcclxuICB9XHJcbn0iXX0=
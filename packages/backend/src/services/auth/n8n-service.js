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
        // Mock validation for development
        const validUsers = [
            {
                email: 'admin@example.com',
                password: 'admin123',
                organizationId: 'org-1',
                role: 'admin',
            },
            {
                email: 'developer@example.com',
                password: 'dev123',
                organizationId: 'org-1',
                role: 'developer',
            },
            {
                email: 'viewer@example.com',
                password: 'view123',
                organizationId: 'org-2',
                role: 'viewer',
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
            firstName: 'Test',
            lastName: 'User',
        };
    }
    mockGetUserProfile(email) {
        // Mock profile data for development
        const profiles = [
            {
                email: 'admin@example.com',
                organizationId: 'org-1',
                role: 'admin',
                firstName: 'Admin',
                lastName: 'User',
            },
            {
                email: 'developer@example.com',
                organizationId: 'org-1',
                role: 'developer',
                firstName: 'Developer',
                lastName: 'User',
            },
            {
                email: 'viewer@example.com',
                organizationId: 'org-2',
                role: 'viewer',
                firstName: 'Viewer',
                lastName: 'User',
            },
        ];
        return profiles.find(p => p.email === email) || null;
    }
}
exports.N8nService = N8nService;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibjhuLXNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJuOG4tc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFzQkEsTUFBYSxVQUFVO0lBQ2IsYUFBYSxDQUFTO0lBQ3RCLFNBQVMsQ0FBUztJQUUxQjtRQUNFLElBQUksQ0FBQyxhQUFhLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxlQUFlLElBQUksRUFBRSxDQUFDO1FBQ3ZELElBQUksQ0FBQyxTQUFTLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxXQUFXLElBQUksRUFBRSxDQUFDO1FBRS9DLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7WUFDeEIsT0FBTyxDQUFDLElBQUksQ0FBQyxnQ0FBZ0MsQ0FBQyxDQUFDO1FBQ2pELENBQUM7SUFDSCxDQUFDO0lBRUQsS0FBSyxDQUFDLG1CQUFtQixDQUFDLEtBQWEsRUFBRSxRQUFnQjtRQUN2RCxJQUFJLENBQUM7WUFDSCwrQ0FBK0M7WUFDL0MsSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsS0FBSyxhQUFhLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7Z0JBQ2xFLE9BQU8sSUFBSSxDQUFDLHVCQUF1QixDQUFDLEtBQUssRUFBRSxRQUFRLENBQUMsQ0FBQztZQUN2RCxDQUFDO1lBRUQsNERBQTREO1lBQzVELDREQUE0RDtZQUM1RCxPQUFPLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxLQUFLLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDdkQsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDZixPQUFPLENBQUMsS0FBSyxDQUFDLHdDQUF3QyxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQy9ELE1BQU0sSUFBSSxLQUFLLENBQUMsb0NBQW9DLENBQUMsQ0FBQztRQUN4RCxDQUFDO0lBQ0gsQ0FBQztJQUVELEtBQUssQ0FBQyxlQUFlLENBQUMsTUFBYyxFQUFFLEtBQWE7UUFDakQsSUFBSSxDQUFDO1lBQ0gseUNBQXlDO1lBQ3pDLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEtBQUssYUFBYSxJQUFJLENBQUMsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO2dCQUNsRSxPQUFPLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUN4QyxDQUFDO1lBRUQsNERBQTREO1lBQzVELDREQUE0RDtZQUM1RCxPQUFPLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN4QyxDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNmLE9BQU8sQ0FBQyxLQUFLLENBQUMsc0NBQXNDLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDN0QsT0FBTyxJQUFJLENBQUM7UUFDZCxDQUFDO0lBQ0gsQ0FBQztJQUVPLHVCQUF1QixDQUFDLEtBQWEsRUFBRSxRQUFnQjtRQUM3RCxrQ0FBa0M7UUFDbEMsTUFBTSxVQUFVLEdBQUc7WUFDakI7Z0JBQ0UsS0FBSyxFQUFFLG1CQUFtQjtnQkFDMUIsUUFBUSxFQUFFLFVBQVU7Z0JBQ3BCLGNBQWMsRUFBRSxPQUFPO2dCQUN2QixJQUFJLEVBQUUsT0FBZ0I7YUFDdkI7WUFDRDtnQkFDRSxLQUFLLEVBQUUsdUJBQXVCO2dCQUM5QixRQUFRLEVBQUUsUUFBUTtnQkFDbEIsY0FBYyxFQUFFLE9BQU87Z0JBQ3ZCLElBQUksRUFBRSxXQUFvQjthQUMzQjtZQUNEO2dCQUNFLEtBQUssRUFBRSxvQkFBb0I7Z0JBQzNCLFFBQVEsRUFBRSxTQUFTO2dCQUNuQixjQUFjLEVBQUUsT0FBTztnQkFDdkIsSUFBSSxFQUFFLFFBQWlCO2FBQ3hCO1NBQ0YsQ0FBQztRQUVGLE1BQU0sSUFBSSxHQUFHLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxLQUFLLEtBQUssSUFBSSxDQUFDLENBQUMsUUFBUSxLQUFLLFFBQVEsQ0FBQyxDQUFDO1FBRWhGLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNWLE9BQU8sSUFBSSxDQUFDO1FBQ2QsQ0FBQztRQUVELE9BQU87WUFDTCxLQUFLLEVBQUUsSUFBSSxDQUFDLEtBQUs7WUFDakIsY0FBYyxFQUFFLElBQUksQ0FBQyxjQUFjO1lBQ25DLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSTtZQUNmLFNBQVMsRUFBRSxNQUFNO1lBQ2pCLFFBQVEsRUFBRSxNQUFNO1NBQ2pCLENBQUM7SUFDSixDQUFDO0lBRU8sa0JBQWtCLENBQUMsS0FBYTtRQUN0QyxvQ0FBb0M7UUFDcEMsTUFBTSxRQUFRLEdBQUc7WUFDZjtnQkFDRSxLQUFLLEVBQUUsbUJBQW1CO2dCQUMxQixjQUFjLEVBQUUsT0FBTztnQkFDdkIsSUFBSSxFQUFFLE9BQWdCO2dCQUN0QixTQUFTLEVBQUUsT0FBTztnQkFDbEIsUUFBUSxFQUFFLE1BQU07YUFDakI7WUFDRDtnQkFDRSxLQUFLLEVBQUUsdUJBQXVCO2dCQUM5QixjQUFjLEVBQUUsT0FBTztnQkFDdkIsSUFBSSxFQUFFLFdBQW9CO2dCQUMxQixTQUFTLEVBQUUsV0FBVztnQkFDdEIsUUFBUSxFQUFFLE1BQU07YUFDakI7WUFDRDtnQkFDRSxLQUFLLEVBQUUsb0JBQW9CO2dCQUMzQixjQUFjLEVBQUUsT0FBTztnQkFDdkIsSUFBSSxFQUFFLFFBQWlCO2dCQUN2QixTQUFTLEVBQUUsUUFBUTtnQkFDbkIsUUFBUSxFQUFFLE1BQU07YUFDakI7U0FDRixDQUFDO1FBRUYsT0FBTyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssS0FBSyxLQUFLLENBQUMsSUFBSSxJQUFJLENBQUM7SUFDdkQsQ0FBQztDQUNGO0FBL0dELGdDQStHQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIERlY2xhcmUgTm9kZS5qcyBnbG9iYWxzIGZvciBMYW1iZGEgZW52aXJvbm1lbnRcclxuZGVjbGFyZSBjb25zdCBwcm9jZXNzOiB7XHJcbiAgZW52OiB7XHJcbiAgICBOT0RFX0VOVj86IHN0cmluZztcclxuICAgIE44Tl9XRUJIT09LX1VSTD86IHN0cmluZztcclxuICAgIE44Tl9BUElfS0VZPzogc3RyaW5nO1xyXG4gIH07XHJcbn07XHJcblxyXG5kZWNsYXJlIGNvbnN0IGNvbnNvbGU6IHtcclxuICB3YXJuOiAobWVzc2FnZTogc3RyaW5nKSA9PiB2b2lkO1xyXG4gIGVycm9yOiAobWVzc2FnZTogc3RyaW5nLCAuLi5hcmdzOiBhbnlbXSkgPT4gdm9pZDtcclxufTtcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgTjhuVXNlciB7XHJcbiAgZW1haWw6IHN0cmluZztcclxuICBvcmdhbml6YXRpb25JZDogc3RyaW5nO1xyXG4gIHJvbGU/OiAnYWRtaW4nIHwgJ2RldmVsb3BlcicgfCAndmlld2VyJztcclxuICBmaXJzdE5hbWU/OiBzdHJpbmc7XHJcbiAgbGFzdE5hbWU/OiBzdHJpbmc7XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBOOG5TZXJ2aWNlIHtcclxuICBwcml2YXRlIG44bldlYmhvb2tVcmw6IHN0cmluZztcclxuICBwcml2YXRlIG44bkFwaUtleTogc3RyaW5nO1xyXG5cclxuICBjb25zdHJ1Y3RvcigpIHtcclxuICAgIHRoaXMubjhuV2ViaG9va1VybCA9IHByb2Nlc3MuZW52Lk44Tl9XRUJIT09LX1VSTCB8fCAnJztcclxuICAgIHRoaXMubjhuQXBpS2V5ID0gcHJvY2Vzcy5lbnYuTjhOX0FQSV9LRVkgfHwgJyc7XHJcblxyXG4gICAgaWYgKCF0aGlzLm44bldlYmhvb2tVcmwpIHtcclxuICAgICAgY29uc29sZS53YXJuKCdOOE5fV0VCSE9PS19VUkwgbm90IGNvbmZpZ3VyZWQnKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGFzeW5jIHZhbGlkYXRlQ3JlZGVudGlhbHMoZW1haWw6IHN0cmluZywgcGFzc3dvcmQ6IHN0cmluZyk6IFByb21pc2U8TjhuVXNlciB8IG51bGw+IHtcclxuICAgIHRyeSB7XHJcbiAgICAgIC8vIEZvciBkZXZlbG9wbWVudC90ZXN0aW5nLCB1c2UgbW9jayB2YWxpZGF0aW9uXHJcbiAgICAgIGlmIChwcm9jZXNzLmVudi5OT0RFX0VOViA9PT0gJ2RldmVsb3BtZW50JyB8fCAhdGhpcy5uOG5XZWJob29rVXJsKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMubW9ja1ZhbGlkYXRlQ3JlZGVudGlhbHMoZW1haWwsIHBhc3N3b3JkKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gSW4gcHJvZHVjdGlvbiwgdGhpcyB3b3VsZCBtYWtlIGFjdHVhbCBIVFRQIHJlcXVlc3QgdG8gbjhuXHJcbiAgICAgIC8vIEZvciBub3csIHVzaW5nIG1vY2sgZGF0YSB1bnRpbCBuOG4gaXMgcHJvcGVybHkgY29uZmlndXJlZFxyXG4gICAgICByZXR1cm4gdGhpcy5tb2NrVmFsaWRhdGVDcmVkZW50aWFscyhlbWFpbCwgcGFzc3dvcmQpO1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgdmFsaWRhdGluZyBjcmVkZW50aWFscyB3aXRoIG44bjonLCBlcnJvcik7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcignQXV0aGVudGljYXRpb24gc2VydmljZSB1bmF2YWlsYWJsZScpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgYXN5bmMgc3luY1VzZXJQcm9maWxlKHVzZXJJZDogc3RyaW5nLCBlbWFpbDogc3RyaW5nKTogUHJvbWlzZTxOOG5Vc2VyIHwgbnVsbD4ge1xyXG4gICAgdHJ5IHtcclxuICAgICAgLy8gRm9yIGRldmVsb3BtZW50L3Rlc3RpbmcsIHVzZSBtb2NrIGRhdGFcclxuICAgICAgaWYgKHByb2Nlc3MuZW52Lk5PREVfRU5WID09PSAnZGV2ZWxvcG1lbnQnIHx8ICF0aGlzLm44bldlYmhvb2tVcmwpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5tb2NrR2V0VXNlclByb2ZpbGUoZW1haWwpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBJbiBwcm9kdWN0aW9uLCB0aGlzIHdvdWxkIG1ha2UgYWN0dWFsIEhUVFAgcmVxdWVzdCB0byBuOG5cclxuICAgICAgLy8gRm9yIG5vdywgdXNpbmcgbW9jayBkYXRhIHVudGlsIG44biBpcyBwcm9wZXJseSBjb25maWd1cmVkXHJcbiAgICAgIHJldHVybiB0aGlzLm1vY2tHZXRVc2VyUHJvZmlsZShlbWFpbCk7XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBjb25zb2xlLmVycm9yKCdFcnJvciBzeW5jaW5nIHVzZXIgcHJvZmlsZSB3aXRoIG44bjonLCBlcnJvcik7XHJcbiAgICAgIHJldHVybiBudWxsO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBtb2NrVmFsaWRhdGVDcmVkZW50aWFscyhlbWFpbDogc3RyaW5nLCBwYXNzd29yZDogc3RyaW5nKTogTjhuVXNlciB8IG51bGwge1xyXG4gICAgLy8gTW9jayB2YWxpZGF0aW9uIGZvciBkZXZlbG9wbWVudFxyXG4gICAgY29uc3QgdmFsaWRVc2VycyA9IFtcclxuICAgICAge1xyXG4gICAgICAgIGVtYWlsOiAnYWRtaW5AZXhhbXBsZS5jb20nLFxyXG4gICAgICAgIHBhc3N3b3JkOiAnYWRtaW4xMjMnLFxyXG4gICAgICAgIG9yZ2FuaXphdGlvbklkOiAnb3JnLTEnLFxyXG4gICAgICAgIHJvbGU6ICdhZG1pbicgYXMgY29uc3QsXHJcbiAgICAgIH0sXHJcbiAgICAgIHtcclxuICAgICAgICBlbWFpbDogJ2RldmVsb3BlckBleGFtcGxlLmNvbScsXHJcbiAgICAgICAgcGFzc3dvcmQ6ICdkZXYxMjMnLFxyXG4gICAgICAgIG9yZ2FuaXphdGlvbklkOiAnb3JnLTEnLFxyXG4gICAgICAgIHJvbGU6ICdkZXZlbG9wZXInIGFzIGNvbnN0LFxyXG4gICAgICB9LFxyXG4gICAgICB7XHJcbiAgICAgICAgZW1haWw6ICd2aWV3ZXJAZXhhbXBsZS5jb20nLFxyXG4gICAgICAgIHBhc3N3b3JkOiAndmlldzEyMycsXHJcbiAgICAgICAgb3JnYW5pemF0aW9uSWQ6ICdvcmctMicsXHJcbiAgICAgICAgcm9sZTogJ3ZpZXdlcicgYXMgY29uc3QsXHJcbiAgICAgIH0sXHJcbiAgICBdO1xyXG5cclxuICAgIGNvbnN0IHVzZXIgPSB2YWxpZFVzZXJzLmZpbmQodSA9PiB1LmVtYWlsID09PSBlbWFpbCAmJiB1LnBhc3N3b3JkID09PSBwYXNzd29yZCk7XHJcbiAgICBcclxuICAgIGlmICghdXNlcikge1xyXG4gICAgICByZXR1cm4gbnVsbDtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBlbWFpbDogdXNlci5lbWFpbCxcclxuICAgICAgb3JnYW5pemF0aW9uSWQ6IHVzZXIub3JnYW5pemF0aW9uSWQsXHJcbiAgICAgIHJvbGU6IHVzZXIucm9sZSxcclxuICAgICAgZmlyc3ROYW1lOiAnVGVzdCcsXHJcbiAgICAgIGxhc3ROYW1lOiAnVXNlcicsXHJcbiAgICB9O1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBtb2NrR2V0VXNlclByb2ZpbGUoZW1haWw6IHN0cmluZyk6IE44blVzZXIgfCBudWxsIHtcclxuICAgIC8vIE1vY2sgcHJvZmlsZSBkYXRhIGZvciBkZXZlbG9wbWVudFxyXG4gICAgY29uc3QgcHJvZmlsZXMgPSBbXHJcbiAgICAgIHtcclxuICAgICAgICBlbWFpbDogJ2FkbWluQGV4YW1wbGUuY29tJyxcclxuICAgICAgICBvcmdhbml6YXRpb25JZDogJ29yZy0xJyxcclxuICAgICAgICByb2xlOiAnYWRtaW4nIGFzIGNvbnN0LFxyXG4gICAgICAgIGZpcnN0TmFtZTogJ0FkbWluJyxcclxuICAgICAgICBsYXN0TmFtZTogJ1VzZXInLFxyXG4gICAgICB9LFxyXG4gICAgICB7XHJcbiAgICAgICAgZW1haWw6ICdkZXZlbG9wZXJAZXhhbXBsZS5jb20nLFxyXG4gICAgICAgIG9yZ2FuaXphdGlvbklkOiAnb3JnLTEnLFxyXG4gICAgICAgIHJvbGU6ICdkZXZlbG9wZXInIGFzIGNvbnN0LFxyXG4gICAgICAgIGZpcnN0TmFtZTogJ0RldmVsb3BlcicsXHJcbiAgICAgICAgbGFzdE5hbWU6ICdVc2VyJyxcclxuICAgICAgfSxcclxuICAgICAge1xyXG4gICAgICAgIGVtYWlsOiAndmlld2VyQGV4YW1wbGUuY29tJyxcclxuICAgICAgICBvcmdhbml6YXRpb25JZDogJ29yZy0yJyxcclxuICAgICAgICByb2xlOiAndmlld2VyJyBhcyBjb25zdCxcclxuICAgICAgICBmaXJzdE5hbWU6ICdWaWV3ZXInLFxyXG4gICAgICAgIGxhc3ROYW1lOiAnVXNlcicsXHJcbiAgICAgIH0sXHJcbiAgICBdO1xyXG5cclxuICAgIHJldHVybiBwcm9maWxlcy5maW5kKHAgPT4gcC5lbWFpbCA9PT0gZW1haWwpIHx8IG51bGw7XHJcbiAgfVxyXG59Il19
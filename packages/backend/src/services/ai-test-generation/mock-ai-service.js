"use strict";
/**
 * Mock AI Service
 *
 * Simulates OpenAI API responses for testing without actual API calls.
 * Useful for development, testing, and CI/CD pipelines.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockAIService = void 0;
class MockAIService {
    /**
     * Generate a mock test specification
     */
    async generateTestSpecification(url, scenario) {
        // Simulate API delay
        await this.delay(500);
        const specification = {
            testName: `Test: ${scenario}`,
            description: `Automated test for ${scenario}`,
            steps: [
                {
                    action: 'navigate',
                    description: `Navigate to ${url}`,
                    elementDescription: 'Application URL',
                },
                {
                    action: 'click',
                    description: 'Click the login button',
                    elementDescription: 'Login button with id="login-button"',
                },
                {
                    action: 'type',
                    description: 'Enter username',
                    elementDescription: 'Username input field',
                    value: 'testuser@example.com',
                },
                {
                    action: 'type',
                    description: 'Enter password',
                    elementDescription: 'Password input field',
                    value: 'password123',
                },
                {
                    action: 'click',
                    description: 'Submit the form',
                    elementDescription: 'Submit button',
                },
                {
                    action: 'assert',
                    description: 'Verify user is redirected to dashboard',
                    elementDescription: 'Dashboard page',
                    assertion: {
                        type: 'visible',
                        expected: 'Dashboard',
                    },
                },
            ],
            tags: ['login', 'authentication', 'mock-generated'],
        };
        const tokens = {
            promptTokens: 250,
            completionTokens: 180,
            totalTokens: 430,
        };
        return { specification, tokens };
    }
    /**
     * Simulate API delay
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    /**
     * Check if mock mode is enabled
     */
    static isMockMode() {
        return process.env.OPENAI_API_KEY === 'MOCK' || !process.env.OPENAI_API_KEY;
    }
}
exports.MockAIService = MockAIService;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9jay1haS1zZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsibW9jay1haS1zZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7R0FLRzs7O0FBSUgsTUFBYSxhQUFhO0lBQ3hCOztPQUVHO0lBQ0gsS0FBSyxDQUFDLHlCQUF5QixDQUM3QixHQUFXLEVBQ1gsUUFBZ0I7UUFFaEIscUJBQXFCO1FBQ3JCLE1BQU0sSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUV0QixNQUFNLGFBQWEsR0FBc0I7WUFDdkMsUUFBUSxFQUFFLFNBQVMsUUFBUSxFQUFFO1lBQzdCLFdBQVcsRUFBRSxzQkFBc0IsUUFBUSxFQUFFO1lBQzdDLEtBQUssRUFBRTtnQkFDTDtvQkFDRSxNQUFNLEVBQUUsVUFBVTtvQkFDbEIsV0FBVyxFQUFFLGVBQWUsR0FBRyxFQUFFO29CQUNqQyxrQkFBa0IsRUFBRSxpQkFBaUI7aUJBQ3RDO2dCQUNEO29CQUNFLE1BQU0sRUFBRSxPQUFPO29CQUNmLFdBQVcsRUFBRSx3QkFBd0I7b0JBQ3JDLGtCQUFrQixFQUFFLHFDQUFxQztpQkFDMUQ7Z0JBQ0Q7b0JBQ0UsTUFBTSxFQUFFLE1BQU07b0JBQ2QsV0FBVyxFQUFFLGdCQUFnQjtvQkFDN0Isa0JBQWtCLEVBQUUsc0JBQXNCO29CQUMxQyxLQUFLLEVBQUUsc0JBQXNCO2lCQUM5QjtnQkFDRDtvQkFDRSxNQUFNLEVBQUUsTUFBTTtvQkFDZCxXQUFXLEVBQUUsZ0JBQWdCO29CQUM3QixrQkFBa0IsRUFBRSxzQkFBc0I7b0JBQzFDLEtBQUssRUFBRSxhQUFhO2lCQUNyQjtnQkFDRDtvQkFDRSxNQUFNLEVBQUUsT0FBTztvQkFDZixXQUFXLEVBQUUsaUJBQWlCO29CQUM5QixrQkFBa0IsRUFBRSxlQUFlO2lCQUNwQztnQkFDRDtvQkFDRSxNQUFNLEVBQUUsUUFBUTtvQkFDaEIsV0FBVyxFQUFFLHdDQUF3QztvQkFDckQsa0JBQWtCLEVBQUUsZ0JBQWdCO29CQUNwQyxTQUFTLEVBQUU7d0JBQ1QsSUFBSSxFQUFFLFNBQVM7d0JBQ2YsUUFBUSxFQUFFLFdBQVc7cUJBQ3RCO2lCQUNGO2FBQ0Y7WUFDRCxJQUFJLEVBQUUsQ0FBQyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsZ0JBQWdCLENBQUM7U0FDcEQsQ0FBQztRQUVGLE1BQU0sTUFBTSxHQUFlO1lBQ3pCLFlBQVksRUFBRSxHQUFHO1lBQ2pCLGdCQUFnQixFQUFFLEdBQUc7WUFDckIsV0FBVyxFQUFFLEdBQUc7U0FDakIsQ0FBQztRQUVGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxFQUFFLENBQUM7SUFDbkMsQ0FBQztJQUVEOztPQUVHO0lBQ0ssS0FBSyxDQUFDLEVBQVU7UUFDdEIsT0FBTyxJQUFJLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUN6RCxDQUFDO0lBRUQ7O09BRUc7SUFDSCxNQUFNLENBQUMsVUFBVTtRQUNmLE9BQU8sT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFjLEtBQUssTUFBTSxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUM7SUFDOUUsQ0FBQztDQUNGO0FBN0VELHNDQTZFQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiBNb2NrIEFJIFNlcnZpY2VcclxuICogXHJcbiAqIFNpbXVsYXRlcyBPcGVuQUkgQVBJIHJlc3BvbnNlcyBmb3IgdGVzdGluZyB3aXRob3V0IGFjdHVhbCBBUEkgY2FsbHMuXHJcbiAqIFVzZWZ1bCBmb3IgZGV2ZWxvcG1lbnQsIHRlc3RpbmcsIGFuZCBDSS9DRCBwaXBlbGluZXMuXHJcbiAqL1xyXG5cclxuaW1wb3J0IHsgVGVzdFNwZWNpZmljYXRpb24sIFRva2VuVXNhZ2UgfSBmcm9tICcuLi8uLi90eXBlcy9haS10ZXN0LWdlbmVyYXRpb24nO1xyXG5cclxuZXhwb3J0IGNsYXNzIE1vY2tBSVNlcnZpY2Uge1xyXG4gIC8qKlxyXG4gICAqIEdlbmVyYXRlIGEgbW9jayB0ZXN0IHNwZWNpZmljYXRpb25cclxuICAgKi9cclxuICBhc3luYyBnZW5lcmF0ZVRlc3RTcGVjaWZpY2F0aW9uKFxyXG4gICAgdXJsOiBzdHJpbmcsXHJcbiAgICBzY2VuYXJpbzogc3RyaW5nXHJcbiAgKTogUHJvbWlzZTx7IHNwZWNpZmljYXRpb246IFRlc3RTcGVjaWZpY2F0aW9uOyB0b2tlbnM6IFRva2VuVXNhZ2UgfT4ge1xyXG4gICAgLy8gU2ltdWxhdGUgQVBJIGRlbGF5XHJcbiAgICBhd2FpdCB0aGlzLmRlbGF5KDUwMCk7XHJcblxyXG4gICAgY29uc3Qgc3BlY2lmaWNhdGlvbjogVGVzdFNwZWNpZmljYXRpb24gPSB7XHJcbiAgICAgIHRlc3ROYW1lOiBgVGVzdDogJHtzY2VuYXJpb31gLFxyXG4gICAgICBkZXNjcmlwdGlvbjogYEF1dG9tYXRlZCB0ZXN0IGZvciAke3NjZW5hcmlvfWAsXHJcbiAgICAgIHN0ZXBzOiBbXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgYWN0aW9uOiAnbmF2aWdhdGUnLFxyXG4gICAgICAgICAgZGVzY3JpcHRpb246IGBOYXZpZ2F0ZSB0byAke3VybH1gLFxyXG4gICAgICAgICAgZWxlbWVudERlc2NyaXB0aW9uOiAnQXBwbGljYXRpb24gVVJMJyxcclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgIGFjdGlvbjogJ2NsaWNrJyxcclxuICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQ2xpY2sgdGhlIGxvZ2luIGJ1dHRvbicsXHJcbiAgICAgICAgICBlbGVtZW50RGVzY3JpcHRpb246ICdMb2dpbiBidXR0b24gd2l0aCBpZD1cImxvZ2luLWJ1dHRvblwiJyxcclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgIGFjdGlvbjogJ3R5cGUnLFxyXG4gICAgICAgICAgZGVzY3JpcHRpb246ICdFbnRlciB1c2VybmFtZScsXHJcbiAgICAgICAgICBlbGVtZW50RGVzY3JpcHRpb246ICdVc2VybmFtZSBpbnB1dCBmaWVsZCcsXHJcbiAgICAgICAgICB2YWx1ZTogJ3Rlc3R1c2VyQGV4YW1wbGUuY29tJyxcclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgIGFjdGlvbjogJ3R5cGUnLFxyXG4gICAgICAgICAgZGVzY3JpcHRpb246ICdFbnRlciBwYXNzd29yZCcsXHJcbiAgICAgICAgICBlbGVtZW50RGVzY3JpcHRpb246ICdQYXNzd29yZCBpbnB1dCBmaWVsZCcsXHJcbiAgICAgICAgICB2YWx1ZTogJ3Bhc3N3b3JkMTIzJyxcclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgIGFjdGlvbjogJ2NsaWNrJyxcclxuICAgICAgICAgIGRlc2NyaXB0aW9uOiAnU3VibWl0IHRoZSBmb3JtJyxcclxuICAgICAgICAgIGVsZW1lbnREZXNjcmlwdGlvbjogJ1N1Ym1pdCBidXR0b24nLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgYWN0aW9uOiAnYXNzZXJ0JyxcclxuICAgICAgICAgIGRlc2NyaXB0aW9uOiAnVmVyaWZ5IHVzZXIgaXMgcmVkaXJlY3RlZCB0byBkYXNoYm9hcmQnLFxyXG4gICAgICAgICAgZWxlbWVudERlc2NyaXB0aW9uOiAnRGFzaGJvYXJkIHBhZ2UnLFxyXG4gICAgICAgICAgYXNzZXJ0aW9uOiB7XHJcbiAgICAgICAgICAgIHR5cGU6ICd2aXNpYmxlJyxcclxuICAgICAgICAgICAgZXhwZWN0ZWQ6ICdEYXNoYm9hcmQnLFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICB9LFxyXG4gICAgICBdLFxyXG4gICAgICB0YWdzOiBbJ2xvZ2luJywgJ2F1dGhlbnRpY2F0aW9uJywgJ21vY2stZ2VuZXJhdGVkJ10sXHJcbiAgICB9O1xyXG5cclxuICAgIGNvbnN0IHRva2VuczogVG9rZW5Vc2FnZSA9IHtcclxuICAgICAgcHJvbXB0VG9rZW5zOiAyNTAsXHJcbiAgICAgIGNvbXBsZXRpb25Ub2tlbnM6IDE4MCxcclxuICAgICAgdG90YWxUb2tlbnM6IDQzMCxcclxuICAgIH07XHJcblxyXG4gICAgcmV0dXJuIHsgc3BlY2lmaWNhdGlvbiwgdG9rZW5zIH07XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBTaW11bGF0ZSBBUEkgZGVsYXlcclxuICAgKi9cclxuICBwcml2YXRlIGRlbGF5KG1zOiBudW1iZXIpOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIHJldHVybiBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgbXMpKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENoZWNrIGlmIG1vY2sgbW9kZSBpcyBlbmFibGVkXHJcbiAgICovXHJcbiAgc3RhdGljIGlzTW9ja01vZGUoKTogYm9vbGVhbiB7XHJcbiAgICByZXR1cm4gcHJvY2Vzcy5lbnYuT1BFTkFJX0FQSV9LRVkgPT09ICdNT0NLJyB8fCAhcHJvY2Vzcy5lbnYuT1BFTkFJX0FQSV9LRVk7XHJcbiAgfVxyXG59XHJcbiJdfQ==
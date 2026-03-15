"use strict";
/**
 * OpenAI API configuration for AI test generation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.OPENAI_CONFIG = void 0;
exports.getOpenAIApiKey = getOpenAIApiKey;
exports.getModelForOperation = getModelForOperation;
exports.calculateCost = calculateCost;
exports.isOpenAIConfigured = isOpenAIConfigured;
exports.getRetryDelay = getRetryDelay;
exports.isValidModel = isValidModel;
exports.getTimeout = getTimeout;
const client_secrets_manager_1 = require("@aws-sdk/client-secrets-manager");
const secretsClient = new client_secrets_manager_1.SecretsManagerClient({ region: process.env.AWS_REGION || 'us-east-1' });
let cachedApiKey = null;
exports.OPENAI_CONFIG = {
    // API Configuration
    apiKey: process.env.OPENAI_API_KEY || '',
    organization: process.env.OPENAI_ORGANIZATION || undefined,
    // Model Selection
    models: {
        default: 'gpt-4-turbo-preview',
        fallback: 'gpt-3.5-turbo',
        analysis: 'gpt-4-turbo-preview', // For complex web page analysis
        generation: 'gpt-4-turbo-preview', // For test case generation
    },
    // Model Parameters
    parameters: {
        temperature: 0.3, // Lower temperature for more deterministic outputs
        maxTokens: 4000, // Maximum tokens for completion
        topP: 1.0,
        frequencyPenalty: 0.0,
        presencePenalty: 0.0,
    },
    // Retry Configuration
    retry: {
        maxAttempts: 3,
        initialDelayMs: 1000, // 1 second
        maxDelayMs: 4000, // 4 seconds
        backoffMultiplier: 2, // Exponential backoff
    },
    // Circuit Breaker Configuration
    circuitBreaker: {
        failureThreshold: 5, // Open circuit after 5 consecutive failures
        resetTimeoutMs: 60000, // 60 seconds before attempting half-open
        halfOpenMaxAttempts: 1, // Number of test requests in half-open state
    },
    // Rate Limiting
    rateLimit: {
        requestsPerMinute: 60,
        tokensPerMinute: 90000,
    },
    // Timeout Configuration
    timeout: {
        requestTimeoutMs: 30000, // 30 seconds per request
        analysisTimeoutMs: 45000, // 45 seconds for analysis operations
        generationTimeoutMs: 30000, // 30 seconds for generation operations
    },
    // Pricing (USD per 1K tokens) - Update based on current OpenAI pricing
    pricing: {
        'gpt-4-turbo-preview': {
            prompt: 0.01, // $0.01 per 1K prompt tokens
            completion: 0.03, // $0.03 per 1K completion tokens
        },
        'gpt-3.5-turbo': {
            prompt: 0.0005, // $0.0005 per 1K prompt tokens
            completion: 0.0015, // $0.0015 per 1K completion tokens
        },
    },
    // Usage Limits (per user/project)
    limits: {
        perUser: {
            dailyRequests: 100,
            dailyTokens: 100000,
            dailyCost: 10.0, // $10 per day
        },
        perProject: {
            dailyRequests: 500,
            dailyTokens: 500000,
            dailyCost: 50.0, // $50 per day
        },
    },
    // Prompt Configuration
    prompts: {
        systemRole: 'You are an expert QA engineer specializing in web application testing. Your task is to analyze web pages and generate comprehensive, maintainable test cases.',
        maxContextLength: 8000, // Maximum tokens for context (analysis + scenario)
        includeExamples: true, // Include example test cases in prompts
        outputFormat: 'json', // Request JSON-formatted responses
    },
};
/**
 * Get OpenAI API key from Secrets Manager or environment
 * @throws Error if API key is not configured
 */
async function getOpenAIApiKey() {
    // Return cached key if available
    if (cachedApiKey) {
        return cachedApiKey;
    }
    // Check if using environment variable (for local development or mock mode)
    if (process.env.OPENAI_API_KEY) {
        cachedApiKey = process.env.OPENAI_API_KEY;
        return cachedApiKey;
    }
    // Retrieve from Secrets Manager
    try {
        const secretName = process.env.OPENAI_SECRET_NAME || 'aibts/openai-api-key';
        const command = new client_secrets_manager_1.GetSecretValueCommand({
            SecretId: secretName,
        });
        const response = await secretsClient.send(command);
        if (!response.SecretString) {
            throw new Error('OpenAI API key not found in Secrets Manager');
        }
        cachedApiKey = response.SecretString;
        return cachedApiKey;
    }
    catch (error) {
        throw new Error(`Failed to retrieve OpenAI API key: ${error instanceof Error ? error.message : String(error)}`);
    }
}
/**
 * Get model name for a specific operation
 */
function getModelForOperation(operation) {
    return exports.OPENAI_CONFIG.models[operation];
}
/**
 * Calculate cost for token usage
 */
function calculateCost(model, promptTokens, completionTokens) {
    const pricing = exports.OPENAI_CONFIG.pricing[model];
    if (!pricing) {
        // Use default pricing if model not found
        const defaultPricing = exports.OPENAI_CONFIG.pricing['gpt-4-turbo-preview'];
        return ((promptTokens / 1000) * defaultPricing.prompt +
            (completionTokens / 1000) * defaultPricing.completion);
    }
    return ((promptTokens / 1000) * pricing.prompt +
        (completionTokens / 1000) * pricing.completion);
}
/**
 * Check if API key is configured
 */
function isOpenAIConfigured() {
    return !!process.env.OPENAI_API_KEY;
}
/**
 * Get retry delay for attempt number
 */
function getRetryDelay(attemptNumber) {
    const { initialDelayMs, maxDelayMs, backoffMultiplier } = exports.OPENAI_CONFIG.retry;
    const delay = initialDelayMs * Math.pow(backoffMultiplier, attemptNumber - 1);
    return Math.min(delay, maxDelayMs);
}
/**
 * Validate model name
 */
function isValidModel(model) {
    return Object.values(exports.OPENAI_CONFIG.models).includes(model);
}
/**
 * Get timeout for operation type
 */
function getTimeout(operation) {
    switch (operation) {
        case 'request':
            return exports.OPENAI_CONFIG.timeout.requestTimeoutMs;
        case 'analysis':
            return exports.OPENAI_CONFIG.timeout.analysisTimeoutMs;
        case 'generation':
            return exports.OPENAI_CONFIG.timeout.generationTimeoutMs;
        default:
            return exports.OPENAI_CONFIG.timeout.requestTimeoutMs;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3BlbmFpLWNvbmZpZy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIm9wZW5haS1jb25maWcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOztHQUVHOzs7QUFtR0gsMENBOEJDO0FBS0Qsb0RBRUM7QUFLRCxzQ0FvQkM7QUFLRCxnREFFQztBQUtELHNDQUlDO0FBS0Qsb0NBRUM7QUFLRCxnQ0FXQztBQXRNRCw0RUFBOEY7QUFFOUYsTUFBTSxhQUFhLEdBQUcsSUFBSSw2Q0FBb0IsQ0FBQyxFQUFFLE1BQU0sRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsSUFBSSxXQUFXLEVBQUUsQ0FBQyxDQUFDO0FBQ2xHLElBQUksWUFBWSxHQUFrQixJQUFJLENBQUM7QUFFMUIsUUFBQSxhQUFhLEdBQUc7SUFDM0Isb0JBQW9CO0lBQ3BCLE1BQU0sRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLGNBQWMsSUFBSSxFQUFFO0lBQ3hDLFlBQVksRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLG1CQUFtQixJQUFJLFNBQVM7SUFFMUQsa0JBQWtCO0lBQ2xCLE1BQU0sRUFBRTtRQUNOLE9BQU8sRUFBRSxxQkFBcUI7UUFDOUIsUUFBUSxFQUFFLGVBQWU7UUFDekIsUUFBUSxFQUFFLHFCQUFxQixFQUFFLGdDQUFnQztRQUNqRSxVQUFVLEVBQUUscUJBQXFCLEVBQUUsMkJBQTJCO0tBQy9EO0lBRUQsbUJBQW1CO0lBQ25CLFVBQVUsRUFBRTtRQUNWLFdBQVcsRUFBRSxHQUFHLEVBQUUsbURBQW1EO1FBQ3JFLFNBQVMsRUFBRSxJQUFJLEVBQUUsZ0NBQWdDO1FBQ2pELElBQUksRUFBRSxHQUFHO1FBQ1QsZ0JBQWdCLEVBQUUsR0FBRztRQUNyQixlQUFlLEVBQUUsR0FBRztLQUNyQjtJQUVELHNCQUFzQjtJQUN0QixLQUFLLEVBQUU7UUFDTCxXQUFXLEVBQUUsQ0FBQztRQUNkLGNBQWMsRUFBRSxJQUFJLEVBQUUsV0FBVztRQUNqQyxVQUFVLEVBQUUsSUFBSSxFQUFFLFlBQVk7UUFDOUIsaUJBQWlCLEVBQUUsQ0FBQyxFQUFFLHNCQUFzQjtLQUM3QztJQUVELGdDQUFnQztJQUNoQyxjQUFjLEVBQUU7UUFDZCxnQkFBZ0IsRUFBRSxDQUFDLEVBQUUsNENBQTRDO1FBQ2pFLGNBQWMsRUFBRSxLQUFLLEVBQUUseUNBQXlDO1FBQ2hFLG1CQUFtQixFQUFFLENBQUMsRUFBRSw2Q0FBNkM7S0FDdEU7SUFFRCxnQkFBZ0I7SUFDaEIsU0FBUyxFQUFFO1FBQ1QsaUJBQWlCLEVBQUUsRUFBRTtRQUNyQixlQUFlLEVBQUUsS0FBSztLQUN2QjtJQUVELHdCQUF3QjtJQUN4QixPQUFPLEVBQUU7UUFDUCxnQkFBZ0IsRUFBRSxLQUFLLEVBQUUseUJBQXlCO1FBQ2xELGlCQUFpQixFQUFFLEtBQUssRUFBRSxxQ0FBcUM7UUFDL0QsbUJBQW1CLEVBQUUsS0FBSyxFQUFFLHVDQUF1QztLQUNwRTtJQUVELHVFQUF1RTtJQUN2RSxPQUFPLEVBQUU7UUFDUCxxQkFBcUIsRUFBRTtZQUNyQixNQUFNLEVBQUUsSUFBSSxFQUFFLDZCQUE2QjtZQUMzQyxVQUFVLEVBQUUsSUFBSSxFQUFFLGlDQUFpQztTQUNwRDtRQUNELGVBQWUsRUFBRTtZQUNmLE1BQU0sRUFBRSxNQUFNLEVBQUUsK0JBQStCO1lBQy9DLFVBQVUsRUFBRSxNQUFNLEVBQUUsbUNBQW1DO1NBQ3hEO0tBQ0Y7SUFFRCxrQ0FBa0M7SUFDbEMsTUFBTSxFQUFFO1FBQ04sT0FBTyxFQUFFO1lBQ1AsYUFBYSxFQUFFLEdBQUc7WUFDbEIsV0FBVyxFQUFFLE1BQU07WUFDbkIsU0FBUyxFQUFFLElBQUksRUFBRSxjQUFjO1NBQ2hDO1FBQ0QsVUFBVSxFQUFFO1lBQ1YsYUFBYSxFQUFFLEdBQUc7WUFDbEIsV0FBVyxFQUFFLE1BQU07WUFDbkIsU0FBUyxFQUFFLElBQUksRUFBRSxjQUFjO1NBQ2hDO0tBQ0Y7SUFFRCx1QkFBdUI7SUFDdkIsT0FBTyxFQUFFO1FBQ1AsVUFBVSxFQUFFLCtKQUErSjtRQUUzSyxnQkFBZ0IsRUFBRSxJQUFJLEVBQUUsbURBQW1EO1FBRTNFLGVBQWUsRUFBRSxJQUFJLEVBQUUsd0NBQXdDO1FBRS9ELFlBQVksRUFBRSxNQUFNLEVBQUUsbUNBQW1DO0tBQzFEO0NBQ08sQ0FBQztBQUVYOzs7R0FHRztBQUNJLEtBQUssVUFBVSxlQUFlO0lBQ25DLGlDQUFpQztJQUNqQyxJQUFJLFlBQVksRUFBRSxDQUFDO1FBQ2pCLE9BQU8sWUFBWSxDQUFDO0lBQ3RCLENBQUM7SUFFRCwyRUFBMkU7SUFDM0UsSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLGNBQWMsRUFBRSxDQUFDO1FBQy9CLFlBQVksR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQztRQUMxQyxPQUFPLFlBQVksQ0FBQztJQUN0QixDQUFDO0lBRUQsZ0NBQWdDO0lBQ2hDLElBQUksQ0FBQztRQUNILE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsa0JBQWtCLElBQUksc0JBQXNCLENBQUM7UUFDNUUsTUFBTSxPQUFPLEdBQUcsSUFBSSw4Q0FBcUIsQ0FBQztZQUN4QyxRQUFRLEVBQUUsVUFBVTtTQUNyQixDQUFDLENBQUM7UUFFSCxNQUFNLFFBQVEsR0FBRyxNQUFNLGFBQWEsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7UUFFbkQsSUFBSSxDQUFDLFFBQVEsQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUMzQixNQUFNLElBQUksS0FBSyxDQUFDLDZDQUE2QyxDQUFDLENBQUM7UUFDakUsQ0FBQztRQUVELFlBQVksR0FBRyxRQUFRLENBQUMsWUFBWSxDQUFDO1FBQ3JDLE9BQU8sWUFBWSxDQUFDO0lBQ3RCLENBQUM7SUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1FBQ2YsTUFBTSxJQUFJLEtBQUssQ0FBQyxzQ0FBc0MsS0FBSyxZQUFZLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUNsSCxDQUFDO0FBQ0gsQ0FBQztBQUVEOztHQUVHO0FBQ0gsU0FBZ0Isb0JBQW9CLENBQUMsU0FBb0M7SUFDdkUsT0FBTyxxQkFBYSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQztBQUN6QyxDQUFDO0FBRUQ7O0dBRUc7QUFDSCxTQUFnQixhQUFhLENBQzNCLEtBQWEsRUFDYixZQUFvQixFQUNwQixnQkFBd0I7SUFFeEIsTUFBTSxPQUFPLEdBQUcscUJBQWEsQ0FBQyxPQUFPLENBQUMsS0FBMkMsQ0FBQyxDQUFDO0lBRW5GLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUNiLHlDQUF5QztRQUN6QyxNQUFNLGNBQWMsR0FBRyxxQkFBYSxDQUFDLE9BQU8sQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO1FBQ3BFLE9BQU8sQ0FDTCxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUMsR0FBRyxjQUFjLENBQUMsTUFBTTtZQUM3QyxDQUFDLGdCQUFnQixHQUFHLElBQUksQ0FBQyxHQUFHLGNBQWMsQ0FBQyxVQUFVLENBQ3RELENBQUM7SUFDSixDQUFDO0lBRUQsT0FBTyxDQUNMLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQyxHQUFHLE9BQU8sQ0FBQyxNQUFNO1FBQ3RDLENBQUMsZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLEdBQUcsT0FBTyxDQUFDLFVBQVUsQ0FDL0MsQ0FBQztBQUNKLENBQUM7QUFFRDs7R0FFRztBQUNILFNBQWdCLGtCQUFrQjtJQUNoQyxPQUFPLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQztBQUN0QyxDQUFDO0FBRUQ7O0dBRUc7QUFDSCxTQUFnQixhQUFhLENBQUMsYUFBcUI7SUFDakQsTUFBTSxFQUFFLGNBQWMsRUFBRSxVQUFVLEVBQUUsaUJBQWlCLEVBQUUsR0FBRyxxQkFBYSxDQUFDLEtBQUssQ0FBQztJQUM5RSxNQUFNLEtBQUssR0FBRyxjQUFjLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsRUFBRSxhQUFhLEdBQUcsQ0FBQyxDQUFDLENBQUM7SUFDOUUsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxVQUFVLENBQUMsQ0FBQztBQUNyQyxDQUFDO0FBRUQ7O0dBRUc7QUFDSCxTQUFnQixZQUFZLENBQUMsS0FBYTtJQUN4QyxPQUFPLE1BQU0sQ0FBQyxNQUFNLENBQUMscUJBQWEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxRQUFRLENBQUMsS0FBWSxDQUFDLENBQUM7QUFDcEUsQ0FBQztBQUVEOztHQUVHO0FBQ0gsU0FBZ0IsVUFBVSxDQUFDLFNBQWdEO0lBQ3pFLFFBQVEsU0FBUyxFQUFFLENBQUM7UUFDbEIsS0FBSyxTQUFTO1lBQ1osT0FBTyxxQkFBYSxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQztRQUNoRCxLQUFLLFVBQVU7WUFDYixPQUFPLHFCQUFhLENBQUMsT0FBTyxDQUFDLGlCQUFpQixDQUFDO1FBQ2pELEtBQUssWUFBWTtZQUNmLE9BQU8scUJBQWEsQ0FBQyxPQUFPLENBQUMsbUJBQW1CLENBQUM7UUFDbkQ7WUFDRSxPQUFPLHFCQUFhLENBQUMsT0FBTyxDQUFDLGdCQUFnQixDQUFDO0lBQ2xELENBQUM7QUFDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIE9wZW5BSSBBUEkgY29uZmlndXJhdGlvbiBmb3IgQUkgdGVzdCBnZW5lcmF0aW9uXHJcbiAqL1xyXG5cclxuaW1wb3J0IHsgU2VjcmV0c01hbmFnZXJDbGllbnQsIEdldFNlY3JldFZhbHVlQ29tbWFuZCB9IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1zZWNyZXRzLW1hbmFnZXInO1xyXG5cclxuY29uc3Qgc2VjcmV0c0NsaWVudCA9IG5ldyBTZWNyZXRzTWFuYWdlckNsaWVudCh7IHJlZ2lvbjogcHJvY2Vzcy5lbnYuQVdTX1JFR0lPTiB8fCAndXMtZWFzdC0xJyB9KTtcclxubGV0IGNhY2hlZEFwaUtleTogc3RyaW5nIHwgbnVsbCA9IG51bGw7XHJcblxyXG5leHBvcnQgY29uc3QgT1BFTkFJX0NPTkZJRyA9IHtcclxuICAvLyBBUEkgQ29uZmlndXJhdGlvblxyXG4gIGFwaUtleTogcHJvY2Vzcy5lbnYuT1BFTkFJX0FQSV9LRVkgfHwgJycsXHJcbiAgb3JnYW5pemF0aW9uOiBwcm9jZXNzLmVudi5PUEVOQUlfT1JHQU5JWkFUSU9OIHx8IHVuZGVmaW5lZCxcclxuICBcclxuICAvLyBNb2RlbCBTZWxlY3Rpb25cclxuICBtb2RlbHM6IHtcclxuICAgIGRlZmF1bHQ6ICdncHQtNC10dXJiby1wcmV2aWV3JyxcclxuICAgIGZhbGxiYWNrOiAnZ3B0LTMuNS10dXJibycsXHJcbiAgICBhbmFseXNpczogJ2dwdC00LXR1cmJvLXByZXZpZXcnLCAvLyBGb3IgY29tcGxleCB3ZWIgcGFnZSBhbmFseXNpc1xyXG4gICAgZ2VuZXJhdGlvbjogJ2dwdC00LXR1cmJvLXByZXZpZXcnLCAvLyBGb3IgdGVzdCBjYXNlIGdlbmVyYXRpb25cclxuICB9LFxyXG4gIFxyXG4gIC8vIE1vZGVsIFBhcmFtZXRlcnNcclxuICBwYXJhbWV0ZXJzOiB7XHJcbiAgICB0ZW1wZXJhdHVyZTogMC4zLCAvLyBMb3dlciB0ZW1wZXJhdHVyZSBmb3IgbW9yZSBkZXRlcm1pbmlzdGljIG91dHB1dHNcclxuICAgIG1heFRva2VuczogNDAwMCwgLy8gTWF4aW11bSB0b2tlbnMgZm9yIGNvbXBsZXRpb25cclxuICAgIHRvcFA6IDEuMCxcclxuICAgIGZyZXF1ZW5jeVBlbmFsdHk6IDAuMCxcclxuICAgIHByZXNlbmNlUGVuYWx0eTogMC4wLFxyXG4gIH0sXHJcbiAgXHJcbiAgLy8gUmV0cnkgQ29uZmlndXJhdGlvblxyXG4gIHJldHJ5OiB7XHJcbiAgICBtYXhBdHRlbXB0czogMyxcclxuICAgIGluaXRpYWxEZWxheU1zOiAxMDAwLCAvLyAxIHNlY29uZFxyXG4gICAgbWF4RGVsYXlNczogNDAwMCwgLy8gNCBzZWNvbmRzXHJcbiAgICBiYWNrb2ZmTXVsdGlwbGllcjogMiwgLy8gRXhwb25lbnRpYWwgYmFja29mZlxyXG4gIH0sXHJcbiAgXHJcbiAgLy8gQ2lyY3VpdCBCcmVha2VyIENvbmZpZ3VyYXRpb25cclxuICBjaXJjdWl0QnJlYWtlcjoge1xyXG4gICAgZmFpbHVyZVRocmVzaG9sZDogNSwgLy8gT3BlbiBjaXJjdWl0IGFmdGVyIDUgY29uc2VjdXRpdmUgZmFpbHVyZXNcclxuICAgIHJlc2V0VGltZW91dE1zOiA2MDAwMCwgLy8gNjAgc2Vjb25kcyBiZWZvcmUgYXR0ZW1wdGluZyBoYWxmLW9wZW5cclxuICAgIGhhbGZPcGVuTWF4QXR0ZW1wdHM6IDEsIC8vIE51bWJlciBvZiB0ZXN0IHJlcXVlc3RzIGluIGhhbGYtb3BlbiBzdGF0ZVxyXG4gIH0sXHJcbiAgXHJcbiAgLy8gUmF0ZSBMaW1pdGluZ1xyXG4gIHJhdGVMaW1pdDoge1xyXG4gICAgcmVxdWVzdHNQZXJNaW51dGU6IDYwLFxyXG4gICAgdG9rZW5zUGVyTWludXRlOiA5MDAwMCxcclxuICB9LFxyXG4gIFxyXG4gIC8vIFRpbWVvdXQgQ29uZmlndXJhdGlvblxyXG4gIHRpbWVvdXQ6IHtcclxuICAgIHJlcXVlc3RUaW1lb3V0TXM6IDMwMDAwLCAvLyAzMCBzZWNvbmRzIHBlciByZXF1ZXN0XHJcbiAgICBhbmFseXNpc1RpbWVvdXRNczogNDUwMDAsIC8vIDQ1IHNlY29uZHMgZm9yIGFuYWx5c2lzIG9wZXJhdGlvbnNcclxuICAgIGdlbmVyYXRpb25UaW1lb3V0TXM6IDMwMDAwLCAvLyAzMCBzZWNvbmRzIGZvciBnZW5lcmF0aW9uIG9wZXJhdGlvbnNcclxuICB9LFxyXG4gIFxyXG4gIC8vIFByaWNpbmcgKFVTRCBwZXIgMUsgdG9rZW5zKSAtIFVwZGF0ZSBiYXNlZCBvbiBjdXJyZW50IE9wZW5BSSBwcmljaW5nXHJcbiAgcHJpY2luZzoge1xyXG4gICAgJ2dwdC00LXR1cmJvLXByZXZpZXcnOiB7XHJcbiAgICAgIHByb21wdDogMC4wMSwgLy8gJDAuMDEgcGVyIDFLIHByb21wdCB0b2tlbnNcclxuICAgICAgY29tcGxldGlvbjogMC4wMywgLy8gJDAuMDMgcGVyIDFLIGNvbXBsZXRpb24gdG9rZW5zXHJcbiAgICB9LFxyXG4gICAgJ2dwdC0zLjUtdHVyYm8nOiB7XHJcbiAgICAgIHByb21wdDogMC4wMDA1LCAvLyAkMC4wMDA1IHBlciAxSyBwcm9tcHQgdG9rZW5zXHJcbiAgICAgIGNvbXBsZXRpb246IDAuMDAxNSwgLy8gJDAuMDAxNSBwZXIgMUsgY29tcGxldGlvbiB0b2tlbnNcclxuICAgIH0sXHJcbiAgfSxcclxuICBcclxuICAvLyBVc2FnZSBMaW1pdHMgKHBlciB1c2VyL3Byb2plY3QpXHJcbiAgbGltaXRzOiB7XHJcbiAgICBwZXJVc2VyOiB7XHJcbiAgICAgIGRhaWx5UmVxdWVzdHM6IDEwMCxcclxuICAgICAgZGFpbHlUb2tlbnM6IDEwMDAwMCxcclxuICAgICAgZGFpbHlDb3N0OiAxMC4wLCAvLyAkMTAgcGVyIGRheVxyXG4gICAgfSxcclxuICAgIHBlclByb2plY3Q6IHtcclxuICAgICAgZGFpbHlSZXF1ZXN0czogNTAwLFxyXG4gICAgICBkYWlseVRva2VuczogNTAwMDAwLFxyXG4gICAgICBkYWlseUNvc3Q6IDUwLjAsIC8vICQ1MCBwZXIgZGF5XHJcbiAgICB9LFxyXG4gIH0sXHJcbiAgXHJcbiAgLy8gUHJvbXB0IENvbmZpZ3VyYXRpb25cclxuICBwcm9tcHRzOiB7XHJcbiAgICBzeXN0ZW1Sb2xlOiAnWW91IGFyZSBhbiBleHBlcnQgUUEgZW5naW5lZXIgc3BlY2lhbGl6aW5nIGluIHdlYiBhcHBsaWNhdGlvbiB0ZXN0aW5nLiBZb3VyIHRhc2sgaXMgdG8gYW5hbHl6ZSB3ZWIgcGFnZXMgYW5kIGdlbmVyYXRlIGNvbXByZWhlbnNpdmUsIG1haW50YWluYWJsZSB0ZXN0IGNhc2VzLicsXHJcbiAgICBcclxuICAgIG1heENvbnRleHRMZW5ndGg6IDgwMDAsIC8vIE1heGltdW0gdG9rZW5zIGZvciBjb250ZXh0IChhbmFseXNpcyArIHNjZW5hcmlvKVxyXG4gICAgXHJcbiAgICBpbmNsdWRlRXhhbXBsZXM6IHRydWUsIC8vIEluY2x1ZGUgZXhhbXBsZSB0ZXN0IGNhc2VzIGluIHByb21wdHNcclxuICAgIFxyXG4gICAgb3V0cHV0Rm9ybWF0OiAnanNvbicsIC8vIFJlcXVlc3QgSlNPTi1mb3JtYXR0ZWQgcmVzcG9uc2VzXHJcbiAgfSxcclxufSBhcyBjb25zdDtcclxuXHJcbi8qKlxyXG4gKiBHZXQgT3BlbkFJIEFQSSBrZXkgZnJvbSBTZWNyZXRzIE1hbmFnZXIgb3IgZW52aXJvbm1lbnRcclxuICogQHRocm93cyBFcnJvciBpZiBBUEkga2V5IGlzIG5vdCBjb25maWd1cmVkXHJcbiAqL1xyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2V0T3BlbkFJQXBpS2V5KCk6IFByb21pc2U8c3RyaW5nPiB7XHJcbiAgLy8gUmV0dXJuIGNhY2hlZCBrZXkgaWYgYXZhaWxhYmxlXHJcbiAgaWYgKGNhY2hlZEFwaUtleSkge1xyXG4gICAgcmV0dXJuIGNhY2hlZEFwaUtleTtcclxuICB9XHJcbiAgXHJcbiAgLy8gQ2hlY2sgaWYgdXNpbmcgZW52aXJvbm1lbnQgdmFyaWFibGUgKGZvciBsb2NhbCBkZXZlbG9wbWVudCBvciBtb2NrIG1vZGUpXHJcbiAgaWYgKHByb2Nlc3MuZW52Lk9QRU5BSV9BUElfS0VZKSB7XHJcbiAgICBjYWNoZWRBcGlLZXkgPSBwcm9jZXNzLmVudi5PUEVOQUlfQVBJX0tFWTtcclxuICAgIHJldHVybiBjYWNoZWRBcGlLZXk7XHJcbiAgfVxyXG4gIFxyXG4gIC8vIFJldHJpZXZlIGZyb20gU2VjcmV0cyBNYW5hZ2VyXHJcbiAgdHJ5IHtcclxuICAgIGNvbnN0IHNlY3JldE5hbWUgPSBwcm9jZXNzLmVudi5PUEVOQUlfU0VDUkVUX05BTUUgfHwgJ2FpYnRzL29wZW5haS1hcGkta2V5JztcclxuICAgIGNvbnN0IGNvbW1hbmQgPSBuZXcgR2V0U2VjcmV0VmFsdWVDb21tYW5kKHtcclxuICAgICAgU2VjcmV0SWQ6IHNlY3JldE5hbWUsXHJcbiAgICB9KTtcclxuICAgIFxyXG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBzZWNyZXRzQ2xpZW50LnNlbmQoY29tbWFuZCk7XHJcbiAgICBcclxuICAgIGlmICghcmVzcG9uc2UuU2VjcmV0U3RyaW5nKSB7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcignT3BlbkFJIEFQSSBrZXkgbm90IGZvdW5kIGluIFNlY3JldHMgTWFuYWdlcicpO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICBjYWNoZWRBcGlLZXkgPSByZXNwb25zZS5TZWNyZXRTdHJpbmc7XHJcbiAgICByZXR1cm4gY2FjaGVkQXBpS2V5O1xyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICB0aHJvdyBuZXcgRXJyb3IoYEZhaWxlZCB0byByZXRyaWV2ZSBPcGVuQUkgQVBJIGtleTogJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcil9YCk7XHJcbiAgfVxyXG59XHJcblxyXG4vKipcclxuICogR2V0IG1vZGVsIG5hbWUgZm9yIGEgc3BlY2lmaWMgb3BlcmF0aW9uXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gZ2V0TW9kZWxGb3JPcGVyYXRpb24ob3BlcmF0aW9uOiAnYW5hbHlzaXMnIHwgJ2dlbmVyYXRpb24nKTogc3RyaW5nIHtcclxuICByZXR1cm4gT1BFTkFJX0NPTkZJRy5tb2RlbHNbb3BlcmF0aW9uXTtcclxufVxyXG5cclxuLyoqXHJcbiAqIENhbGN1bGF0ZSBjb3N0IGZvciB0b2tlbiB1c2FnZVxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGNhbGN1bGF0ZUNvc3QoXHJcbiAgbW9kZWw6IHN0cmluZyxcclxuICBwcm9tcHRUb2tlbnM6IG51bWJlcixcclxuICBjb21wbGV0aW9uVG9rZW5zOiBudW1iZXJcclxuKTogbnVtYmVyIHtcclxuICBjb25zdCBwcmljaW5nID0gT1BFTkFJX0NPTkZJRy5wcmljaW5nW21vZGVsIGFzIGtleW9mIHR5cGVvZiBPUEVOQUlfQ09ORklHLnByaWNpbmddO1xyXG4gIFxyXG4gIGlmICghcHJpY2luZykge1xyXG4gICAgLy8gVXNlIGRlZmF1bHQgcHJpY2luZyBpZiBtb2RlbCBub3QgZm91bmRcclxuICAgIGNvbnN0IGRlZmF1bHRQcmljaW5nID0gT1BFTkFJX0NPTkZJRy5wcmljaW5nWydncHQtNC10dXJiby1wcmV2aWV3J107XHJcbiAgICByZXR1cm4gKFxyXG4gICAgICAocHJvbXB0VG9rZW5zIC8gMTAwMCkgKiBkZWZhdWx0UHJpY2luZy5wcm9tcHQgK1xyXG4gICAgICAoY29tcGxldGlvblRva2VucyAvIDEwMDApICogZGVmYXVsdFByaWNpbmcuY29tcGxldGlvblxyXG4gICAgKTtcclxuICB9XHJcbiAgXHJcbiAgcmV0dXJuIChcclxuICAgIChwcm9tcHRUb2tlbnMgLyAxMDAwKSAqIHByaWNpbmcucHJvbXB0ICtcclxuICAgIChjb21wbGV0aW9uVG9rZW5zIC8gMTAwMCkgKiBwcmljaW5nLmNvbXBsZXRpb25cclxuICApO1xyXG59XHJcblxyXG4vKipcclxuICogQ2hlY2sgaWYgQVBJIGtleSBpcyBjb25maWd1cmVkXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gaXNPcGVuQUlDb25maWd1cmVkKCk6IGJvb2xlYW4ge1xyXG4gIHJldHVybiAhIXByb2Nlc3MuZW52Lk9QRU5BSV9BUElfS0VZO1xyXG59XHJcblxyXG4vKipcclxuICogR2V0IHJldHJ5IGRlbGF5IGZvciBhdHRlbXB0IG51bWJlclxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGdldFJldHJ5RGVsYXkoYXR0ZW1wdE51bWJlcjogbnVtYmVyKTogbnVtYmVyIHtcclxuICBjb25zdCB7IGluaXRpYWxEZWxheU1zLCBtYXhEZWxheU1zLCBiYWNrb2ZmTXVsdGlwbGllciB9ID0gT1BFTkFJX0NPTkZJRy5yZXRyeTtcclxuICBjb25zdCBkZWxheSA9IGluaXRpYWxEZWxheU1zICogTWF0aC5wb3coYmFja29mZk11bHRpcGxpZXIsIGF0dGVtcHROdW1iZXIgLSAxKTtcclxuICByZXR1cm4gTWF0aC5taW4oZGVsYXksIG1heERlbGF5TXMpO1xyXG59XHJcblxyXG4vKipcclxuICogVmFsaWRhdGUgbW9kZWwgbmFtZVxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGlzVmFsaWRNb2RlbChtb2RlbDogc3RyaW5nKTogYm9vbGVhbiB7XHJcbiAgcmV0dXJuIE9iamVjdC52YWx1ZXMoT1BFTkFJX0NPTkZJRy5tb2RlbHMpLmluY2x1ZGVzKG1vZGVsIGFzIGFueSk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBHZXQgdGltZW91dCBmb3Igb3BlcmF0aW9uIHR5cGVcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXRUaW1lb3V0KG9wZXJhdGlvbjogJ3JlcXVlc3QnIHwgJ2FuYWx5c2lzJyB8ICdnZW5lcmF0aW9uJyk6IG51bWJlciB7XHJcbiAgc3dpdGNoIChvcGVyYXRpb24pIHtcclxuICAgIGNhc2UgJ3JlcXVlc3QnOlxyXG4gICAgICByZXR1cm4gT1BFTkFJX0NPTkZJRy50aW1lb3V0LnJlcXVlc3RUaW1lb3V0TXM7XHJcbiAgICBjYXNlICdhbmFseXNpcyc6XHJcbiAgICAgIHJldHVybiBPUEVOQUlfQ09ORklHLnRpbWVvdXQuYW5hbHlzaXNUaW1lb3V0TXM7XHJcbiAgICBjYXNlICdnZW5lcmF0aW9uJzpcclxuICAgICAgcmV0dXJuIE9QRU5BSV9DT05GSUcudGltZW91dC5nZW5lcmF0aW9uVGltZW91dE1zO1xyXG4gICAgZGVmYXVsdDpcclxuICAgICAgcmV0dXJuIE9QRU5BSV9DT05GSUcudGltZW91dC5yZXF1ZXN0VGltZW91dE1zO1xyXG4gIH1cclxufVxyXG4iXX0=
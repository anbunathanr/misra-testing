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
 * Get OpenAI API key from environment
 * @throws Error if API key is not configured
 */
function getOpenAIApiKey() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    return apiKey;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3BlbmFpLWNvbmZpZy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIm9wZW5haS1jb25maWcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOztHQUVHOzs7QUE4RkgsMENBUUM7QUFLRCxvREFFQztBQUtELHNDQW9CQztBQUtELGdEQUVDO0FBS0Qsc0NBSUM7QUFLRCxvQ0FFQztBQUtELGdDQVdDO0FBM0tZLFFBQUEsYUFBYSxHQUFHO0lBQzNCLG9CQUFvQjtJQUNwQixNQUFNLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFjLElBQUksRUFBRTtJQUN4QyxZQUFZLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsSUFBSSxTQUFTO0lBRTFELGtCQUFrQjtJQUNsQixNQUFNLEVBQUU7UUFDTixPQUFPLEVBQUUscUJBQXFCO1FBQzlCLFFBQVEsRUFBRSxlQUFlO1FBQ3pCLFFBQVEsRUFBRSxxQkFBcUIsRUFBRSxnQ0FBZ0M7UUFDakUsVUFBVSxFQUFFLHFCQUFxQixFQUFFLDJCQUEyQjtLQUMvRDtJQUVELG1CQUFtQjtJQUNuQixVQUFVLEVBQUU7UUFDVixXQUFXLEVBQUUsR0FBRyxFQUFFLG1EQUFtRDtRQUNyRSxTQUFTLEVBQUUsSUFBSSxFQUFFLGdDQUFnQztRQUNqRCxJQUFJLEVBQUUsR0FBRztRQUNULGdCQUFnQixFQUFFLEdBQUc7UUFDckIsZUFBZSxFQUFFLEdBQUc7S0FDckI7SUFFRCxzQkFBc0I7SUFDdEIsS0FBSyxFQUFFO1FBQ0wsV0FBVyxFQUFFLENBQUM7UUFDZCxjQUFjLEVBQUUsSUFBSSxFQUFFLFdBQVc7UUFDakMsVUFBVSxFQUFFLElBQUksRUFBRSxZQUFZO1FBQzlCLGlCQUFpQixFQUFFLENBQUMsRUFBRSxzQkFBc0I7S0FDN0M7SUFFRCxnQ0FBZ0M7SUFDaEMsY0FBYyxFQUFFO1FBQ2QsZ0JBQWdCLEVBQUUsQ0FBQyxFQUFFLDRDQUE0QztRQUNqRSxjQUFjLEVBQUUsS0FBSyxFQUFFLHlDQUF5QztRQUNo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LEVBQUUsR0FBRyxxQkFBYSxDQUFDLEtBQUssQ0FBQztJQUM5RSxNQUFNLEtBQUssR0FBRyxjQUFjLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsRUFBRSxhQUFhLEdBQUcsQ0FBQyxDQUFDLENBQUM7SUFDOUUsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxVQUFVLENBQUMsQ0FBQztBQUNyQyxDQUFDO0FBRUQ7O0dBRUc7QUFDSCxTQUFnQixZQUFZLENBQUMsS0FBYTtJQUN4QyxPQUFPLE1BQU0sQ0FBQyxNQUFNLENBQUMscUJBQWEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDN0QsQ0FBQztBQUVEOztHQUVHO0FBQ0gsU0FBZ0IsVUFBVSxDQUFDLFNBQWdEO0lBQ3pFLFFBQVEsU0FBUyxFQUFFLENBQUM7UUFDbEIsS0FBSyxTQUFTO1lBQ1osT0FBTyxxQkFBYSxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQztRQUNoRCxLQUFLLFVBQVU7WUFDYixPQUFPLHFCQUFhLENBQUMsT0FBTyxDQUFDLGlCQUFpQixDQUFDO1FBQ2pELEtBQUssWUFBWTtZQUNmLE9BQU8scUJBQWEsQ0FBQyxPQUFPLENBQUMsbUJBQW1CLENBQUM7UUFDbkQ7WUFDRSxPQUFPLHFCQUFhLENBQUMsT0FBTyxDQUFDLGdCQUFnQixDQUFDO0lBQ2xELENBQUM7QUFDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIE9wZW5BSSBBUEkgY29uZmlndXJhdGlvbiBmb3IgQUkgdGVzdCBnZW5lcmF0aW9uXHJcbiAqL1xyXG5cclxuZXhwb3J0IGNvbnN0IE9QRU5BSV9DT05GSUcgPSB7XHJcbiAgLy8gQVBJIENvbmZpZ3VyYXRpb25cclxuICBhcGlLZXk6IHByb2Nlc3MuZW52Lk9QRU5BSV9BUElfS0VZIHx8ICcnLFxyXG4gIG9yZ2FuaXphdGlvbjogcHJvY2Vzcy5lbnYuT1BFTkFJX09SR0FOSVpBVElPTiB8fCB1bmRlZmluZWQsXHJcbiAgXHJcbiAgLy8gTW9kZWwgU2VsZWN0aW9uXHJcbiAgbW9kZWxzOiB7XHJcbiAgICBkZWZhdWx0OiAnZ3B0LTQtdHVyYm8tcHJldmlldycsXHJcbiAgICBmYWxsYmFjazogJ2dwdC0zLjUtdHVyYm8nLFxyXG4gICAgYW5hbHlzaXM6ICdncHQtNC10dXJiby1wcmV2aWV3JywgLy8gRm9yIGNvbXBsZXggd2ViIHBhZ2UgYW5hbHlzaXNcclxuICAgIGdlbmVyYXRpb246ICdncHQtNC10dXJiby1wcmV2aWV3JywgLy8gRm9yIHRlc3QgY2FzZSBnZW5lcmF0aW9uXHJcbiAgfSxcclxuICBcclxuICAvLyBNb2RlbCBQYXJhbWV0ZXJzXHJcbiAgcGFyYW1ldGVyczoge1xyXG4gICAgdGVtcGVyYXR1cmU6IDAuMywgLy8gTG93ZXIgdGVtcGVyYXR1cmUgZm9yIG1vcmUgZGV0ZXJtaW5pc3RpYyBvdXRwdXRzXHJcbiAgICBtYXhUb2tlbnM6IDQwMDAsIC8vIE1heGltdW0gdG9rZW5zIGZvciBjb21wbGV0aW9uXHJcbiAgICB0b3BQOiAxLjAsXHJcbiAgICBmcmVxdWVuY3lQZW5hbHR5OiAwLjAsXHJcbiAgICBwcmVzZW5jZVBlbmFsdHk6IDAuMCxcclxuICB9LFxyXG4gIFxyXG4gIC8vIFJldHJ5IENvbmZpZ3VyYXRpb25cclxuICByZXRyeToge1xyXG4gICAgbWF4QXR0ZW1wdHM6IDMsXHJcbiAgICBpbml0aWFsRGVsYXlNczogMTAwMCwgLy8gMSBzZWNvbmRcclxuICAgIG1heERlbGF5TXM6IDQwMDAsIC8vIDQgc2Vjb25kc1xyXG4gICAgYmFja29mZk11bHRpcGxpZXI6IDIsIC8vIEV4cG9uZW50aWFsIGJhY2tvZmZcclxuICB9LFxyXG4gIFxyXG4gIC8vIENpcmN1aXQgQnJlYWtlciBDb25maWd1cmF0aW9uXHJcbiAgY2lyY3VpdEJyZWFrZXI6IHtcclxuICAgIGZhaWx1cmVUaHJlc2hvbGQ6IDUsIC8vIE9wZW4gY2lyY3VpdCBhZnRlciA1IGNvbnNlY3V0aXZlIGZhaWx1cmVzXHJcbiAgICByZXNldFRpbWVvdXRNczogNjAwMDAsIC8vIDYwIHNlY29uZHMgYmVmb3JlIGF0dGVtcHRpbmcgaGFsZi1vcGVuXHJcbiAgICBoYWxmT3Blbk1heEF0dGVtcHRzOiAxLCAvLyBOdW1iZXIgb2YgdGVzdCByZXF1ZXN0cyBpbiBoYWxmLW9wZW4gc3RhdGVcclxuICB9LFxyXG4gIFxyXG4gIC8vIFJhdGUgTGltaXRpbmdcclxuICByYXRlTGltaXQ6IHtcclxuICAgIHJlcXVlc3RzUGVyTWludXRlOiA2MCxcclxuICAgIHRva2Vuc1Blck1pbnV0ZTogOTAwMDAsXHJcbiAgfSxcclxuICBcclxuICAvLyBUaW1lb3V0IENvbmZpZ3VyYXRpb25cclxuICB0aW1lb3V0OiB7XHJcbiAgICByZXF1ZXN0VGltZW91dE1zOiAzMDAwMCwgLy8gMzAgc2Vjb25kcyBwZXIgcmVxdWVzdFxyXG4gICAgYW5hbHlzaXNUaW1lb3V0TXM6IDQ1MDAwLCAvLyA0NSBzZWNvbmRzIGZvciBhbmFseXNpcyBvcGVyYXRpb25zXHJcbiAgICBnZW5lcmF0aW9uVGltZW91dE1zOiAzMDAwMCwgLy8gMzAgc2Vjb25kcyBmb3IgZ2VuZXJhdGlvbiBvcGVyYXRpb25zXHJcbiAgfSxcclxuICBcclxuICAvLyBQcmljaW5nIChVU0QgcGVyIDFLIHRva2VucykgLSBVcGRhdGUgYmFzZWQgb24gY3VycmVudCBPcGVuQUkgcHJpY2luZ1xyXG4gIHByaWNpbmc6IHtcclxuICAgICdncHQtNC10dXJiby1wcmV2aWV3Jzoge1xyXG4gICAgICBwcm9tcHQ6IDAuMDEsIC8vICQwLjAxIHBlciAxSyBwcm9tcHQgdG9rZW5zXHJcbiAgICAgIGNvbXBsZXRpb246IDAuMDMsIC8vICQwLjAzIHBlciAxSyBjb21wbGV0aW9uIHRva2Vuc1xyXG4gICAgfSxcclxuICAgICdncHQtMy41LXR1cmJvJzoge1xyXG4gICAgICBwcm9tcHQ6IDAuMDAwNSwgLy8gJDAuMDAwNSBwZXIgMUsgcHJvbXB0IHRva2Vuc1xyXG4gICAgICBjb21wbGV0aW9uOiAwLjAwMTUsIC8vICQwLjAwMTUgcGVyIDFLIGNvbXBsZXRpb24gdG9rZW5zXHJcbiAgICB9LFxyXG4gIH0sXHJcbiAgXHJcbiAgLy8gVXNhZ2UgTGltaXRzIChwZXIgdXNlci9wcm9qZWN0KVxyXG4gIGxpbWl0czoge1xyXG4gICAgcGVyVXNlcjoge1xyXG4gICAgICBkYWlseVJlcXVlc3RzOiAxMDAsXHJcbiAgICAgIGRhaWx5VG9rZW5zOiAxMDAwMDAsXHJcbiAgICAgIGRhaWx5Q29zdDogMTAuMCwgLy8gJDEwIHBlciBkYXlcclxuICAgIH0sXHJcbiAgICBwZXJQcm9qZWN0OiB7XHJcbiAgICAgIGRhaWx5UmVxdWVzdHM6IDUwMCxcclxuICAgICAgZGFpbHlUb2tlbnM6IDUwMDAwMCxcclxuICAgICAgZGFpbHlDb3N0OiA1MC4wLCAvLyAkNTAgcGVyIGRheVxyXG4gICAgfSxcclxuICB9LFxyXG4gIFxyXG4gIC8vIFByb21wdCBDb25maWd1cmF0aW9uXHJcbiAgcHJvbXB0czoge1xyXG4gICAgc3lzdGVtUm9sZTogJ1lvdSBhcmUgYW4gZXhwZXJ0IFFBIGVuZ2luZWVyIHNwZWNpYWxpemluZyBpbiB3ZWIgYXBwbGljYXRpb24gdGVzdGluZy4gWW91ciB0YXNrIGlzIHRvIGFuYWx5emUgd2ViIHBhZ2VzIGFuZCBnZW5lcmF0ZSBjb21wcmVoZW5zaXZlLCBtYWludGFpbmFibGUgdGVzdCBjYXNlcy4nLFxyXG4gICAgXHJcbiAgICBtYXhDb250ZXh0TGVuZ3RoOiA4MDAwLCAvLyBNYXhpbXVtIHRva2VucyBmb3IgY29udGV4dCAoYW5hbHlzaXMgKyBzY2VuYXJpbylcclxuICAgIFxyXG4gICAgaW5jbHVkZUV4YW1wbGVzOiB0cnVlLCAvLyBJbmNsdWRlIGV4YW1wbGUgdGVzdCBjYXNlcyBpbiBwcm9tcHRzXHJcbiAgICBcclxuICAgIG91dHB1dEZvcm1hdDogJ2pzb24nLCAvLyBSZXF1ZXN0IEpTT04tZm9ybWF0dGVkIHJlc3BvbnNlc1xyXG4gIH0sXHJcbn0gYXMgY29uc3Q7XHJcblxyXG4vKipcclxuICogR2V0IE9wZW5BSSBBUEkga2V5IGZyb20gZW52aXJvbm1lbnRcclxuICogQHRocm93cyBFcnJvciBpZiBBUEkga2V5IGlzIG5vdCBjb25maWd1cmVkXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gZ2V0T3BlbkFJQXBpS2V5KCk6IHN0cmluZyB7XHJcbiAgY29uc3QgYXBpS2V5ID0gcHJvY2Vzcy5lbnYuT1BFTkFJX0FQSV9LRVk7XHJcbiAgXHJcbiAgaWYgKCFhcGlLZXkpIHtcclxuICAgIHRocm93IG5ldyBFcnJvcignT1BFTkFJX0FQSV9LRVkgZW52aXJvbm1lbnQgdmFyaWFibGUgaXMgbm90IHNldCcpO1xyXG4gIH1cclxuICBcclxuICByZXR1cm4gYXBpS2V5O1xyXG59XHJcblxyXG4vKipcclxuICogR2V0IG1vZGVsIG5hbWUgZm9yIGEgc3BlY2lmaWMgb3BlcmF0aW9uXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gZ2V0TW9kZWxGb3JPcGVyYXRpb24ob3BlcmF0aW9uOiAnYW5hbHlzaXMnIHwgJ2dlbmVyYXRpb24nKTogc3RyaW5nIHtcclxuICByZXR1cm4gT1BFTkFJX0NPTkZJRy5tb2RlbHNbb3BlcmF0aW9uXTtcclxufVxyXG5cclxuLyoqXHJcbiAqIENhbGN1bGF0ZSBjb3N0IGZvciB0b2tlbiB1c2FnZVxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGNhbGN1bGF0ZUNvc3QoXHJcbiAgbW9kZWw6IHN0cmluZyxcclxuICBwcm9tcHRUb2tlbnM6IG51bWJlcixcclxuICBjb21wbGV0aW9uVG9rZW5zOiBudW1iZXJcclxuKTogbnVtYmVyIHtcclxuICBjb25zdCBwcmljaW5nID0gT1BFTkFJX0NPTkZJRy5wcmljaW5nW21vZGVsIGFzIGtleW9mIHR5cGVvZiBPUEVOQUlfQ09ORklHLnByaWNpbmddO1xyXG4gIFxyXG4gIGlmICghcHJpY2luZykge1xyXG4gICAgLy8gVXNlIGRlZmF1bHQgcHJpY2luZyBpZiBtb2RlbCBub3QgZm91bmRcclxuICAgIGNvbnN0IGRlZmF1bHRQcmljaW5nID0gT1BFTkFJX0NPTkZJRy5wcmljaW5nWydncHQtNC10dXJiby1wcmV2aWV3J107XHJcbiAgICByZXR1cm4gKFxyXG4gICAgICAocHJvbXB0VG9rZW5zIC8gMTAwMCkgKiBkZWZhdWx0UHJpY2luZy5wcm9tcHQgK1xyXG4gICAgICAoY29tcGxldGlvblRva2VucyAvIDEwMDApICogZGVmYXVsdFByaWNpbmcuY29tcGxldGlvblxyXG4gICAgKTtcclxuICB9XHJcbiAgXHJcbiAgcmV0dXJuIChcclxuICAgIChwcm9tcHRUb2tlbnMgLyAxMDAwKSAqIHByaWNpbmcucHJvbXB0ICtcclxuICAgIChjb21wbGV0aW9uVG9rZW5zIC8gMTAwMCkgKiBwcmljaW5nLmNvbXBsZXRpb25cclxuICApO1xyXG59XHJcblxyXG4vKipcclxuICogQ2hlY2sgaWYgQVBJIGtleSBpcyBjb25maWd1cmVkXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gaXNPcGVuQUlDb25maWd1cmVkKCk6IGJvb2xlYW4ge1xyXG4gIHJldHVybiAhIXByb2Nlc3MuZW52Lk9QRU5BSV9BUElfS0VZO1xyXG59XHJcblxyXG4vKipcclxuICogR2V0IHJldHJ5IGRlbGF5IGZvciBhdHRlbXB0IG51bWJlclxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGdldFJldHJ5RGVsYXkoYXR0ZW1wdE51bWJlcjogbnVtYmVyKTogbnVtYmVyIHtcclxuICBjb25zdCB7IGluaXRpYWxEZWxheU1zLCBtYXhEZWxheU1zLCBiYWNrb2ZmTXVsdGlwbGllciB9ID0gT1BFTkFJX0NPTkZJRy5yZXRyeTtcclxuICBjb25zdCBkZWxheSA9IGluaXRpYWxEZWxheU1zICogTWF0aC5wb3coYmFja29mZk11bHRpcGxpZXIsIGF0dGVtcHROdW1iZXIgLSAxKTtcclxuICByZXR1cm4gTWF0aC5taW4oZGVsYXksIG1heERlbGF5TXMpO1xyXG59XHJcblxyXG4vKipcclxuICogVmFsaWRhdGUgbW9kZWwgbmFtZVxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGlzVmFsaWRNb2RlbChtb2RlbDogc3RyaW5nKTogYm9vbGVhbiB7XHJcbiAgcmV0dXJuIE9iamVjdC52YWx1ZXMoT1BFTkFJX0NPTkZJRy5tb2RlbHMpLmluY2x1ZGVzKG1vZGVsKTtcclxufVxyXG5cclxuLyoqXHJcbiAqIEdldCB0aW1lb3V0IGZvciBvcGVyYXRpb24gdHlwZVxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGdldFRpbWVvdXQob3BlcmF0aW9uOiAncmVxdWVzdCcgfCAnYW5hbHlzaXMnIHwgJ2dlbmVyYXRpb24nKTogbnVtYmVyIHtcclxuICBzd2l0Y2ggKG9wZXJhdGlvbikge1xyXG4gICAgY2FzZSAncmVxdWVzdCc6XHJcbiAgICAgIHJldHVybiBPUEVOQUlfQ09ORklHLnRpbWVvdXQucmVxdWVzdFRpbWVvdXRNcztcclxuICAgIGNhc2UgJ2FuYWx5c2lzJzpcclxuICAgICAgcmV0dXJuIE9QRU5BSV9DT05GSUcudGltZW91dC5hbmFseXNpc1RpbWVvdXRNcztcclxuICAgIGNhc2UgJ2dlbmVyYXRpb24nOlxyXG4gICAgICByZXR1cm4gT1BFTkFJX0NPTkZJRy50aW1lb3V0LmdlbmVyYXRpb25UaW1lb3V0TXM7XHJcbiAgICBkZWZhdWx0OlxyXG4gICAgICByZXR1cm4gT1BFTkFJX0NPTkZJRy50aW1lb3V0LnJlcXVlc3RUaW1lb3V0TXM7XHJcbiAgfVxyXG59XHJcbiJdfQ==
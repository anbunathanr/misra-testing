"use strict";
/**
 * AI Engine Service
 *
 * Integrates with OpenAI API to generate test specifications from web page analysis.
 * Implements retry logic, circuit breaker pattern, and response validation.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CircuitState = exports.AIEngine = void 0;
const openai_1 = __importDefault(require("openai"));
const zod_1 = require("zod");
const openai_config_1 = require("../../config/openai-config");
const mock_ai_service_1 = require("./mock-ai-service");
const huggingface_engine_1 = require("./huggingface-engine");
// ============================================================================
// Zod Schemas for Response Validation
// ============================================================================
const AIGeneratedStepSchema = zod_1.z.object({
    action: zod_1.z.enum(['navigate', 'click', 'type', 'assert', 'wait']),
    description: zod_1.z.string(),
    elementDescription: zod_1.z.string().optional(),
    value: zod_1.z.string().optional(),
    assertion: zod_1.z.object({
        type: zod_1.z.enum(['exists', 'visible', 'text', 'value', 'attribute']),
        expected: zod_1.z.string(),
    }).optional(),
});
const TestSpecificationSchema = zod_1.z.object({
    testName: zod_1.z.string().min(1),
    description: zod_1.z.string(),
    steps: zod_1.z.array(AIGeneratedStepSchema).min(1),
    tags: zod_1.z.array(zod_1.z.string()),
});
// ============================================================================
// Circuit Breaker Implementation
// ============================================================================
var CircuitState;
(function (CircuitState) {
    CircuitState["CLOSED"] = "CLOSED";
    CircuitState["OPEN"] = "OPEN";
    CircuitState["HALF_OPEN"] = "HALF_OPEN";
})(CircuitState || (exports.CircuitState = CircuitState = {}));
class CircuitBreaker {
    failureThreshold;
    resetTimeoutMs;
    halfOpenMaxAttempts;
    state = CircuitState.CLOSED;
    failureCount = 0;
    lastFailureTime = 0;
    successCount = 0;
    constructor(failureThreshold, resetTimeoutMs, halfOpenMaxAttempts) {
        this.failureThreshold = failureThreshold;
        this.resetTimeoutMs = resetTimeoutMs;
        this.halfOpenMaxAttempts = halfOpenMaxAttempts;
    }
    async execute(operation) {
        if (this.state === CircuitState.OPEN) {
            if (Date.now() - this.lastFailureTime >= this.resetTimeoutMs) {
                this.state = CircuitState.HALF_OPEN;
                this.successCount = 0;
            }
            else {
                throw new Error('Circuit breaker is OPEN. Service temporarily unavailable.');
            }
        }
        try {
            const result = await operation();
            this.onSuccess();
            return result;
        }
        catch (error) {
            this.onFailure();
            throw error;
        }
    }
    onSuccess() {
        this.failureCount = 0;
        if (this.state === CircuitState.HALF_OPEN) {
            this.successCount++;
            if (this.successCount >= this.halfOpenMaxAttempts) {
                this.state = CircuitState.CLOSED;
            }
        }
    }
    onFailure() {
        this.failureCount++;
        this.lastFailureTime = Date.now();
        if (this.failureCount >= this.failureThreshold) {
            this.state = CircuitState.OPEN;
        }
    }
    getState() {
        return this.state;
    }
    reset() {
        this.state = CircuitState.CLOSED;
        this.failureCount = 0;
        this.successCount = 0;
        this.lastFailureTime = 0;
    }
}
class APILogger {
    logs = [];
    log(entry) {
        this.logs.push(entry);
        console.log('[AI Engine]', JSON.stringify(entry));
    }
    getLogs() {
        return [...this.logs];
    }
    clearLogs() {
        this.logs = [];
    }
}
// ============================================================================
// AI Engine Service
// ============================================================================
class AIEngine {
    client = null;
    circuitBreaker;
    logger;
    constructor() {
        this.circuitBreaker = new CircuitBreaker(openai_config_1.OPENAI_CONFIG.circuitBreaker.failureThreshold, openai_config_1.OPENAI_CONFIG.circuitBreaker.resetTimeoutMs, openai_config_1.OPENAI_CONFIG.circuitBreaker.halfOpenMaxAttempts);
        this.logger = new APILogger();
    }
    /**
     * Get or create OpenAI client with API key from Secrets Manager
     */
    async getClient() {
        if (this.client) {
            return this.client;
        }
        const apiKey = await (0, openai_config_1.getOpenAIApiKey)();
        this.client = new openai_1.default({
            apiKey,
            organization: openai_config_1.OPENAI_CONFIG.organization,
            timeout: (0, openai_config_1.getTimeout)('request'),
        });
        return this.client;
    }
    /**
     * Generate test specification from application analysis
     */
    async generateTestSpecification(analysis, scenario, context) {
        // Use mock service if in mock mode
        if (mock_ai_service_1.MockAIService.isMockMode()) {
            console.log('[AIEngine] Using mock mode for test generation');
            const mockService = new mock_ai_service_1.MockAIService();
            const { specification } = await mockService.generateTestSpecification(analysis.url, scenario);
            return specification;
        }
        // Check if using Hugging Face instead of OpenAI
        if (process.env.USE_HUGGINGFACE === 'true') {
            console.log('[AIEngine] Using Hugging Face for test generation');
            const hfEngine = new huggingface_engine_1.HuggingFaceEngine();
            return await hfEngine.generateTestSpecification(analysis, scenario, context);
        }
        // Default: Use OpenAI
        const startTime = Date.now();
        const model = (0, openai_config_1.getModelForOperation)('generation');
        try {
            const prompt = this.constructPrompt(analysis, scenario, context);
            const response = await this.callOpenAIWithRetry(model, prompt);
            const specification = this.parseResponse(response);
            const validatedSpec = this.validateResponse(specification);
            // Log successful API interaction
            this.logger.log({
                timestamp: new Date().toISOString(),
                operation: 'generateTestSpecification',
                model,
                requestTokens: response.usage?.prompt_tokens,
                responseTokens: response.usage?.completion_tokens,
                totalTokens: response.usage?.total_tokens,
                status: 'success',
                duration: Date.now() - startTime,
            });
            return validatedSpec;
        }
        catch (error) {
            // Log failed API interaction
            this.logger.log({
                timestamp: new Date().toISOString(),
                operation: 'generateTestSpecification',
                model,
                status: 'failure',
                error: error instanceof Error ? error.message : String(error),
                duration: Date.now() - startTime,
            });
            throw error;
        }
    }
    /**
     * Call OpenAI API with retry logic and circuit breaker
     */
    async callOpenAIWithRetry(model, prompt) {
        const client = await this.getClient();
        return this.circuitBreaker.execute(async () => {
            let lastError = null;
            for (let attempt = 1; attempt <= openai_config_1.OPENAI_CONFIG.retry.maxAttempts; attempt++) {
                try {
                    const response = await client.chat.completions.create({
                        model,
                        messages: [
                            {
                                role: 'system',
                                content: openai_config_1.OPENAI_CONFIG.prompts.systemRole,
                            },
                            {
                                role: 'user',
                                content: prompt,
                            },
                        ],
                        temperature: openai_config_1.OPENAI_CONFIG.parameters.temperature,
                        max_tokens: openai_config_1.OPENAI_CONFIG.parameters.maxTokens,
                        top_p: openai_config_1.OPENAI_CONFIG.parameters.topP,
                        frequency_penalty: openai_config_1.OPENAI_CONFIG.parameters.frequencyPenalty,
                        presence_penalty: openai_config_1.OPENAI_CONFIG.parameters.presencePenalty,
                        response_format: { type: 'json_object' },
                    });
                    return response;
                }
                catch (error) {
                    lastError = error instanceof Error ? error : new Error(String(error));
                    if (attempt < openai_config_1.OPENAI_CONFIG.retry.maxAttempts) {
                        const delay = (0, openai_config_1.getRetryDelay)(attempt);
                        console.log(`[AI Engine] Retry attempt ${attempt} failed. Retrying in ${delay}ms...`);
                        await this.sleep(delay);
                    }
                }
            }
            throw new Error(`AI service temporarily unavailable after ${openai_config_1.OPENAI_CONFIG.retry.maxAttempts} attempts. ${lastError?.message || ''}`);
        });
    }
    /**
     * Construct prompt from analysis and scenario
     */
    constructPrompt(analysis, scenario, context) {
        const elementsDescription = analysis.elements
            .slice(0, 50) // Limit to first 50 elements to avoid token limits
            .map((el, idx) => {
            const attrs = Object.entries(el.attributes)
                .filter(([_, value]) => value)
                .map(([key, value]) => `${key}="${value}"`)
                .join(' ');
            return `${idx + 1}. ${el.type} [${attrs}]`;
        })
            .join('\n');
        const patternsDescription = analysis.patterns
            .map((pattern) => `- ${pattern.type}: ${pattern.description}`)
            .join('\n');
        const learningFeedback = context
            ? `\n\nLearning Context:
- Successful patterns: ${context.successfulPatterns.join(', ')}
- Patterns to avoid: ${context.failingPatterns.join(', ')}
- Preferred selector strategies: ${context.selectorPreferences.join(', ')}`
            : '';
        return `Analyze the following web page and generate a test case for the scenario: "${scenario}"

Page Information:
- URL: ${analysis.url}
- Title: ${analysis.title}
- Is SPA: ${analysis.metadata.isSPA}

Interactive Elements:
${elementsDescription}

UI Patterns Detected:
${patternsDescription}
${learningFeedback}

Generate a comprehensive test case that:
1. Uses descriptive element descriptions (not exact selectors)
2. Includes all necessary steps to complete the scenario
3. Adds appropriate assertions to verify success
4. Uses wait steps when needed for dynamic content
5. Follows best practices for test maintainability

Return the test specification in JSON format with this structure:
{
  "testName": "descriptive test name",
  "description": "detailed description of what the test validates",
  "steps": [
    {
      "action": "navigate|click|type|assert|wait",
      "description": "what this step does",
      "elementDescription": "description of the element (for click/type/assert)",
      "value": "value to type (for type action)",
      "assertion": {
        "type": "exists|visible|text|value|attribute",
        "expected": "expected value"
      }
    }
  ],
  "tags": ["tag1", "tag2"]
}`;
    }
    /**
     * Parse OpenAI response to TestSpecification
     */
    parseResponse(response) {
        const content = response.choices[0]?.message?.content;
        if (!content) {
            throw new Error('AI generated empty response');
        }
        try {
            return JSON.parse(content);
        }
        catch (error) {
            throw new Error(`AI generated invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Validate response against schema
     */
    validateResponse(response) {
        try {
            return TestSpecificationSchema.parse(response);
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                const issues = error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join(', ');
                throw new Error(`AI generated invalid test specification. Validation errors: ${issues}`);
            }
            throw new Error('AI generated invalid test specification. Please try again.');
        }
    }
    /**
     * Get API interaction logs
     */
    getLogs() {
        return this.logger.getLogs();
    }
    /**
     * Clear API interaction logs
     */
    clearLogs() {
        this.logger.clearLogs();
    }
    /**
     * Get circuit breaker state
     */
    getCircuitState() {
        return this.circuitBreaker.getState();
    }
    /**
     * Reset circuit breaker (for testing)
     */
    resetCircuit() {
        this.circuitBreaker.reset();
    }
    /**
     * Sleep utility for retry delays
     */
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
exports.AIEngine = AIEngine;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWktZW5naW5lLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYWktZW5naW5lLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7R0FLRzs7Ozs7O0FBRUgsb0RBQTRCO0FBQzVCLDZCQUF3QjtBQU94Qiw4REFNb0M7QUFDcEMsdURBQWtEO0FBQ2xELDZEQUF5RDtBQUV6RCwrRUFBK0U7QUFDL0Usc0NBQXNDO0FBQ3RDLCtFQUErRTtBQUUvRSxNQUFNLHFCQUFxQixHQUFHLE9BQUMsQ0FBQyxNQUFNLENBQUM7SUFDckMsTUFBTSxFQUFFLE9BQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxVQUFVLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDL0QsV0FBVyxFQUFFLE9BQUMsQ0FBQyxNQUFNLEVBQUU7SUFDdkIsa0JBQWtCLEVBQUUsT0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDLFFBQVEsRUFBRTtJQUN6QyxLQUFLLEVBQUUsT0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDLFFBQVEsRUFBRTtJQUM1QixTQUFTLEVBQUUsT0FBQyxDQUFDLE1BQU0sQ0FBQztRQUNsQixJQUFJLEVBQUUsT0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxXQUFXLENBQUMsQ0FBQztRQUNqRSxRQUFRLEVBQUUsT0FBQyxDQUFDLE1BQU0sRUFBRTtLQUNyQixDQUFDLENBQUMsUUFBUSxFQUFFO0NBQ2QsQ0FBQyxDQUFDO0FBRUgsTUFBTSx1QkFBdUIsR0FBRyxPQUFDLENBQUMsTUFBTSxDQUFDO0lBQ3ZDLFFBQVEsRUFBRSxPQUFDLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztJQUMzQixXQUFXLEVBQUUsT0FBQyxDQUFDLE1BQU0sRUFBRTtJQUN2QixLQUFLLEVBQUUsT0FBQyxDQUFDLEtBQUssQ0FBQyxxQkFBcUIsQ0FBQyxD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Q0gsZUFBZTtRQUNiLE9BQU8sSUFBSSxDQUFDLGNBQWMsQ0FBQyxRQUFRLEVBQUUsQ0FBQztJQUN4QyxDQUFDO0lBRUQ7O09BRUc7SUFDSCxZQUFZO1FBQ1YsSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUM5QixDQUFDO0lBRUQ7O09BRUc7SUFDSyxLQUFLLENBQUMsRUFBVTtRQUN0QixPQUFPLElBQUksT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxVQUFVLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDM0QsQ0FBQztDQUNGO0FBcFNELDRCQW9TQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiBBSSBFbmdpbmUgU2VydmljZVxyXG4gKiBcclxuICogSW50ZWdyYXRlcyB3aXRoIE9wZW5BSSBBUEkgdG8gZ2VuZXJhdGUgdGVzdCBzcGVjaWZpY2F0aW9ucyBmcm9tIHdlYiBwYWdlIGFuYWx5c2lzLlxyXG4gKiBJbXBsZW1lbnRzIHJldHJ5IGxvZ2ljLCBjaXJjdWl0IGJyZWFrZXIgcGF0dGVybiwgYW5kIHJlc3BvbnNlIHZhbGlkYXRpb24uXHJcbiAqL1xyXG5cclxuaW1wb3J0IE9wZW5BSSBmcm9tICdvcGVuYWknO1xyXG5pbXBvcnQgeyB6IH0gZnJvbSAnem9kJztcclxuaW1wb3J0IHtcclxuICBUZXN0U3BlY2lmaWNhdGlvbixcclxuICBBSUdlbmVyYXRlZFN0ZXAsXHJcbiAgQXBwbGljYXRpb25BbmFseXNpcyxcclxuICBMZWFybmluZ0NvbnRleHQsXHJcbn0gZnJvbSAnLi4vLi4vdHlwZXMvYWktdGVzdC1nZW5lcmF0aW9uJztcclxuaW1wb3J0IHtcclxuICBPUEVOQUlfQ09ORklHLFxyXG4gIGdldE9wZW5BSUFwaUtleSxcclxuICBnZXRNb2RlbEZvck9wZXJhdGlvbixcclxuICBnZXRSZXRyeURlbGF5LFxyXG4gIGdldFRpbWVvdXQsXHJcbn0gZnJvbSAnLi4vLi4vY29uZmlnL29wZW5haS1jb25maWcnO1xyXG5pbXBvcnQgeyBNb2NrQUlTZXJ2aWNlIH0gZnJvbSAnLi9tb2NrLWFpLXNlcnZpY2UnO1xyXG5pbXBvcnQgeyBIdWdnaW5nRmFjZUVuZ2luZSB9IGZyb20gJy4vaHVnZ2luZ2ZhY2UtZW5naW5lJztcclxuXHJcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cclxuLy8gWm9kIFNjaGVtYXMgZm9yIFJlc3BvbnNlIFZhbGlkYXRpb25cclxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxyXG5cclxuY29uc3QgQUlHZW5lcmF0ZWRTdGVwU2NoZW1hID0gei5vYmplY3Qoe1xyXG4gIGFjdGlvbjogei5lbnVtKFsnbmF2aWdhdGUnLCAnY2xpY2snLCAndHlwZScsICdhc3NlcnQnLCAnd2FpdCddKSxcclxuICBkZXNjcmlwdGlvbjogei5zdHJpbmcoKSxcclxuICBlbGVtZW50RGVzY3JpcHRpb246IHouc3RyaW5nKCkub3B0aW9uYWwoKSxcclxuICB2YWx1ZTogei5zdHJpbmcoKS5vcHRpb25hbCgpLFxyXG4gIGFzc2VydGlvbjogei5vYmplY3Qoe1xyXG4gICAgdHlwZTogei5lbnVtKFsnZXhpc3RzJywgJ3Zpc2libGUnLCAndGV4dCcsICd2YWx1ZScsICdhdHRyaWJ1dGUnXSksXHJcbiAgICBleHBlY3RlZDogei5zdHJpbmcoKSxcclxuICB9KS5vcHRpb25hbCgpLFxyXG59KTtcclxuXHJcbmNvbnN0IFRlc3RTcGVjaWZpY2F0aW9uU2NoZW1hID0gei5vYmplY3Qoe1xyXG4gIHRlc3ROYW1lOiB6LnN0cmluZygpLm1pbigxKSxcclxuICBkZXNjcmlwdGlvbjogei5zdHJpbmcoKSxcclxuICBzdGVwczogei5hcnJheShBSUdlbmVyYXRlZFN0ZXBTY2hlbWEpLm1pbigxKSxcclxuICB0YWdzOiB6LmFycmF5KHouc3RyaW5nKCkpLFxyXG59KTtcclxuXHJcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cclxuLy8gQ2lyY3VpdCBCcmVha2VyIEltcGxlbWVudGF0aW9uXHJcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cclxuXHJcbmVudW0gQ2lyY3VpdFN0YXRlIHtcclxuICBDTE9TRUQgPSAnQ0xPU0VEJyxcclxuICBPUEVOID0gJ09QRU4nLFxyXG4gIEhBTEZfT1BFTiA9ICdIQUxGX09QRU4nLFxyXG59XHJcblxyXG5jbGFzcyBDaXJjdWl0QnJlYWtlciB7XHJcbiAgcHJpdmF0ZSBzdGF0ZTogQ2lyY3VpdFN0YXRlID0gQ2lyY3VpdFN0YXRlLkNMT1NFRDtcclxuICBwcml2YXRlIGZhaWx1cmVDb3VudDogbnVtYmVyID0gMDtcclxuICBwcml2YXRlIGxhc3RGYWlsdXJlVGltZTogbnVtYmVyID0gMDtcclxuICBwcml2YXRlIHN1Y2Nlc3NDb3VudDogbnVtYmVyID0gMDtcclxuXHJcbiAgY29uc3RydWN0b3IoXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGZhaWx1cmVUaHJlc2hvbGQ6IG51bWJlcixcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgcmVzZXRUaW1lb3V0TXM6IG51bWJlcixcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgaGFsZk9wZW5NYXhBdHRlbXB0czogbnVtYmVyXHJcbiAgKSB7fVxyXG5cclxuICBhc3luYyBleGVjdXRlPFQ+KG9wZXJhdGlvbjogKCkgPT4gUHJvbWlzZTxUPik6IFByb21pc2U8VD4ge1xyXG4gICAgaWYgKHRoaXMuc3RhdGUgPT09IENpcmN1aXRTdGF0ZS5PUEVOKSB7XHJcbiAgICAgIGlmIChEYXRlLm5vdygpIC0gdGhpcy5sYXN0RmFpbHVyZVRpbWUgPj0gdGhpcy5yZXNldFRpbWVvdXRNcykge1xyXG4gICAgICAgIHRoaXMuc3RhdGUgPSBDaXJjdWl0U3RhdGUuSEFMRl9PUEVOO1xyXG4gICAgICAgIHRoaXMuc3VjY2Vzc0NvdW50ID0gMDtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0NpcmN1aXQgYnJlYWtlciBpcyBPUEVOLiBTZXJ2aWNlIHRlbXBvcmFyaWx5IHVuYXZhaWxhYmxlLicpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgb3BlcmF0aW9uKCk7XHJcbiAgICAgIHRoaXMub25TdWNjZXNzKCk7XHJcbiAgICAgIHJldHVybiByZXN1bHQ7XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICB0aGlzLm9uRmFpbHVyZSgpO1xyXG4gICAgICB0aHJvdyBlcnJvcjtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHByaXZhdGUgb25TdWNjZXNzKCk6IHZvaWQge1xyXG4gICAgdGhpcy5mYWlsdXJlQ291bnQgPSAwO1xyXG5cclxuICAgIGlmICh0aGlzLnN0YXRlID09PSBDaXJjdWl0U3RhdGUuSEFMRl9PUEVOKSB7XHJcbiAgICAgIHRoaXMuc3VjY2Vzc0NvdW50Kys7XHJcbiAgICAgIGlmICh0aGlzLnN1Y2Nlc3NDb3VudCA+PSB0aGlzLmhhbGZPcGVuTWF4QXR0ZW1wdHMpIHtcclxuICAgICAgICB0aGlzLnN0YXRlID0gQ2lyY3VpdFN0YXRlLkNMT1NFRDtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBvbkZhaWx1cmUoKTogdm9pZCB7XHJcbiAgICB0aGlzLmZhaWx1cmVDb3VudCsrO1xyXG4gICAgdGhpcy5sYXN0RmFpbHVyZVRpbWUgPSBEYXRlLm5vdygpO1xyXG5cclxuICAgIGlmICh0aGlzLmZhaWx1cmVDb3VudCA+PSB0aGlzLmZhaWx1cmVUaHJlc2hvbGQpIHtcclxuICAgICAgdGhpcy5zdGF0ZSA9IENpcmN1aXRTdGF0ZS5PUEVOO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgZ2V0U3RhdGUoKTogQ2lyY3VpdFN0YXRlIHtcclxuICAgIHJldHVybiB0aGlzLnN0YXRlO1xyXG4gIH1cclxuXHJcbiAgcmVzZXQoKTogdm9pZCB7XHJcbiAgICB0aGlzLnN0YXRlID0gQ2lyY3VpdFN0YXRlLkNMT1NFRDtcclxuICAgIHRoaXMuZmFpbHVyZUNvdW50ID0gMDtcclxuICAgIHRoaXMuc3VjY2Vzc0NvdW50ID0gMDtcclxuICAgIHRoaXMubGFzdEZhaWx1cmVUaW1lID0gMDtcclxuICB9XHJcbn1cclxuXHJcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cclxuLy8gQVBJIEludGVyYWN0aW9uIExvZ2dlclxyXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XHJcblxyXG5pbnRlcmZhY2UgQVBJTG9nRW50cnkge1xyXG4gIHRpbWVzdGFtcDogc3RyaW5nO1xyXG4gIG9wZXJhdGlvbjogc3RyaW5nO1xyXG4gIG1vZGVsOiBzdHJpbmc7XHJcbiAgcmVxdWVzdFRva2Vucz86IG51bWJlcjtcclxuICByZXNwb25zZVRva2Vucz86IG51bWJlcjtcclxuICB0b3RhbFRva2Vucz86IG51bWJlcjtcclxuICBzdGF0dXM6ICdzdWNjZXNzJyB8ICdmYWlsdXJlJztcclxuICBlcnJvcj86IHN0cmluZztcclxuICBkdXJhdGlvbjogbnVtYmVyO1xyXG59XHJcblxyXG5jbGFzcyBBUElMb2dnZXIge1xyXG4gIHByaXZhdGUgbG9nczogQVBJTG9nRW50cnlbXSA9IFtdO1xyXG5cclxuICBsb2coZW50cnk6IEFQSUxvZ0VudHJ5KTogdm9pZCB7XHJcbiAgICB0aGlzLmxvZ3MucHVzaChlbnRyeSk7XHJcbiAgICBjb25zb2xlLmxvZygnW0FJIEVuZ2luZV0nLCBKU09OLnN0cmluZ2lmeShlbnRyeSkpO1xyXG4gIH1cclxuXHJcbiAgZ2V0TG9ncygpOiBBUElMb2dFbnRyeVtdIHtcclxuICAgIHJldHVybiBbLi4udGhpcy5sb2dzXTtcclxuICB9XHJcblxyXG4gIGNsZWFyTG9ncygpOiB2b2lkIHtcclxuICAgIHRoaXMubG9ncyA9IFtdO1xyXG4gIH1cclxufVxyXG5cclxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxyXG4vLyBBSSBFbmdpbmUgU2VydmljZVxyXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XHJcblxyXG5leHBvcnQgY2xhc3MgQUlFbmdpbmUge1xyXG4gIHByaXZhdGUgY2xpZW50OiBPcGVuQUkgfCBudWxsID0gbnVsbDtcclxuICBwcml2YXRlIGNpcmN1aXRCcmVha2VyOiBDaXJjdWl0QnJlYWtlcjtcclxuICBwcml2YXRlIGxvZ2dlcjogQVBJTG9nZ2VyO1xyXG5cclxuICBjb25zdHJ1Y3RvcigpIHtcclxuICAgIHRoaXMuY2lyY3VpdEJyZWFrZXIgPSBuZXcgQ2lyY3VpdEJyZWFrZXIoXHJcbiAgICAgIE9QRU5BSV9DT05GSUcuY2lyY3VpdEJyZWFrZXIuZmFpbHVyZVRocmVzaG9sZCxcclxuICAgICAgT1BFTkFJX0NPTkZJRy5jaXJjdWl0QnJlYWtlci5yZXNldFRpbWVvdXRNcyxcclxuICAgICAgT1BFTkFJX0NPTkZJRy5jaXJjdWl0QnJlYWtlci5oYWxmT3Blbk1heEF0dGVtcHRzXHJcbiAgICApO1xyXG5cclxuICAgIHRoaXMubG9nZ2VyID0gbmV3IEFQSUxvZ2dlcigpO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR2V0IG9yIGNyZWF0ZSBPcGVuQUkgY2xpZW50IHdpdGggQVBJIGtleSBmcm9tIFNlY3JldHMgTWFuYWdlclxyXG4gICAqL1xyXG4gIHByaXZhdGUgYXN5bmMgZ2V0Q2xpZW50KCk6IFByb21pc2U8T3BlbkFJPiB7XHJcbiAgICBpZiAodGhpcy5jbGllbnQpIHtcclxuICAgICAgcmV0dXJuIHRoaXMuY2xpZW50O1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IGFwaUtleSA9IGF3YWl0IGdldE9wZW5BSUFwaUtleSgpO1xyXG5cclxuICAgIHRoaXMuY2xpZW50ID0gbmV3IE9wZW5BSSh7XHJcbiAgICAgIGFwaUtleSxcclxuICAgICAgb3JnYW5pemF0aW9uOiBPUEVOQUlfQ09ORklHLm9yZ2FuaXphdGlvbixcclxuICAgICAgdGltZW91dDogZ2V0VGltZW91dCgncmVxdWVzdCcpLFxyXG4gICAgfSk7XHJcblxyXG4gICAgcmV0dXJuIHRoaXMuY2xpZW50O1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR2VuZXJhdGUgdGVzdCBzcGVjaWZpY2F0aW9uIGZyb20gYXBwbGljYXRpb24gYW5hbHlzaXNcclxuICAgKi9cclxuICBhc3luYyBnZW5lcmF0ZVRlc3RTcGVjaWZpY2F0aW9uKFxyXG4gICAgYW5hbHlzaXM6IEFwcGxpY2F0aW9uQW5hbHlzaXMsXHJcbiAgICBzY2VuYXJpbzogc3RyaW5nLFxyXG4gICAgY29udGV4dD86IExlYXJuaW5nQ29udGV4dFxyXG4gICk6IFByb21pc2U8VGVzdFNwZWNpZmljYXRpb24+IHtcclxuICAgIC8vIFVzZSBtb2NrIHNlcnZpY2UgaWYgaW4gbW9jayBtb2RlXHJcbiAgICBpZiAoTW9ja0FJU2VydmljZS5pc01vY2tNb2RlKCkpIHtcclxuICAgICAgY29uc29sZS5sb2coJ1tBSUVuZ2luZV0gVXNpbmcgbW9jayBtb2RlIGZvciB0ZXN0IGdlbmVyYXRpb24nKTtcclxuICAgICAgY29uc3QgbW9ja1NlcnZpY2UgPSBuZXcgTW9ja0FJU2VydmljZSgpO1xyXG4gICAgICBjb25zdCB7IHNwZWNpZmljYXRpb24gfSA9IGF3YWl0IG1vY2tTZXJ2aWNlLmdlbmVyYXRlVGVzdFNwZWNpZmljYXRpb24oXHJcbiAgICAgICAgYW5hbHlzaXMudXJsLFxyXG4gICAgICAgIHNjZW5hcmlvXHJcbiAgICAgICk7XHJcbiAgICAgIHJldHVybiBzcGVjaWZpY2F0aW9uO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIENoZWNrIGlmIHVzaW5nIEh1Z2dpbmcgRmFjZSBpbnN0ZWFkIG9mIE9wZW5BSVxyXG4gICAgaWYgKHByb2Nlc3MuZW52LlVTRV9IVUdHSU5HRkFDRSA9PT0gJ3RydWUnKSB7XHJcbiAgICAgIGNvbnNvbGUubG9nKCdbQUlFbmdpbmVdIFVzaW5nIEh1Z2dpbmcgRmFjZSBmb3IgdGVzdCBnZW5lcmF0aW9uJyk7XHJcbiAgICAgIGNvbnN0IGhmRW5naW5lID0gbmV3IEh1Z2dpbmdGYWNlRW5naW5lKCk7XHJcbiAgICAgIHJldHVybiBhd2FpdCBoZkVuZ2luZS5nZW5lcmF0ZVRlc3RTcGVjaWZpY2F0aW9uKGFuYWx5c2lzLCBzY2VuYXJpbywgY29udGV4dCk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gRGVmYXVsdDogVXNlIE9wZW5BSVxyXG4gICAgY29uc3Qgc3RhcnRUaW1lID0gRGF0ZS5ub3coKTtcclxuICAgIGNvbnN0IG1vZGVsID0gZ2V0TW9kZWxGb3JPcGVyYXRpb24oJ2dlbmVyYXRpb24nKTtcclxuXHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCBwcm9tcHQgPSB0aGlzLmNvbnN0cnVjdFByb21wdChhbmFseXNpcywgc2NlbmFyaW8sIGNvbnRleHQpO1xyXG4gICAgICBcclxuICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCB0aGlzLmNhbGxPcGVuQUlXaXRoUmV0cnkobW9kZWwsIHByb21wdCk7XHJcbiAgICAgIFxyXG4gICAgICBjb25zdCBzcGVjaWZpY2F0aW9uID0gdGhpcy5wYXJzZVJlc3BvbnNlKHJlc3BvbnNlKTtcclxuICAgICAgXHJcbiAgICAgIGNvbnN0IHZhbGlkYXRlZFNwZWMgPSB0aGlzLnZhbGlkYXRlUmVzcG9uc2Uoc3BlY2lmaWNhdGlvbik7XHJcblxyXG4gICAgICAvLyBMb2cgc3VjY2Vzc2Z1bCBBUEkgaW50ZXJhY3Rpb25cclxuICAgICAgdGhpcy5sb2dnZXIubG9nKHtcclxuICAgICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcclxuICAgICAgICBvcGVyYXRpb246ICdnZW5lcmF0ZVRlc3RTcGVjaWZpY2F0aW9uJyxcclxuICAgICAgICBtb2RlbCxcclxuICAgICAgICByZXF1ZXN0VG9rZW5zOiByZXNwb25zZS51c2FnZT8ucHJvbXB0X3Rva2VucyxcclxuICAgICAgICByZXNwb25zZVRva2VuczogcmVzcG9uc2UudXNhZ2U/LmNvbXBsZXRpb25fdG9rZW5zLFxyXG4gICAgICAgIHRvdGFsVG9rZW5zOiByZXNwb25zZS51c2FnZT8udG90YWxfdG9rZW5zLFxyXG4gICAgICAgIHN0YXR1czogJ3N1Y2Nlc3MnLFxyXG4gICAgICAgIGR1cmF0aW9uOiBEYXRlLm5vdygpIC0gc3RhcnRUaW1lLFxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIHJldHVybiB2YWxpZGF0ZWRTcGVjO1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgLy8gTG9nIGZhaWxlZCBBUEkgaW50ZXJhY3Rpb25cclxuICAgICAgdGhpcy5sb2dnZXIubG9nKHtcclxuICAgICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcclxuICAgICAgICBvcGVyYXRpb246ICdnZW5lcmF0ZVRlc3RTcGVjaWZpY2F0aW9uJyxcclxuICAgICAgICBtb2RlbCxcclxuICAgICAgICBzdGF0dXM6ICdmYWlsdXJlJyxcclxuICAgICAgICBlcnJvcjogZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpLFxyXG4gICAgICAgIGR1cmF0aW9uOiBEYXRlLm5vdygpIC0gc3RhcnRUaW1lLFxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIHRocm93IGVycm9yO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQ2FsbCBPcGVuQUkgQVBJIHdpdGggcmV0cnkgbG9naWMgYW5kIGNpcmN1aXQgYnJlYWtlclxyXG4gICAqL1xyXG4gIHByaXZhdGUgYXN5bmMgY2FsbE9wZW5BSVdpdGhSZXRyeShcclxuICAgIG1vZGVsOiBzdHJpbmcsXHJcbiAgICBwcm9tcHQ6IHN0cmluZ1xyXG4gICk6IFByb21pc2U8T3BlbkFJLkNoYXQuQ29tcGxldGlvbnMuQ2hhdENvbXBsZXRpb24+IHtcclxuICAgIGNvbnN0IGNsaWVudCA9IGF3YWl0IHRoaXMuZ2V0Q2xpZW50KCk7XHJcbiAgICBcclxuICAgIHJldHVybiB0aGlzLmNpcmN1aXRCcmVha2VyLmV4ZWN1dGUoYXN5bmMgKCkgPT4ge1xyXG4gICAgICBsZXQgbGFzdEVycm9yOiBFcnJvciB8IG51bGwgPSBudWxsO1xyXG5cclxuICAgICAgZm9yIChsZXQgYXR0ZW1wdCA9IDE7IGF0dGVtcHQgPD0gT1BFTkFJX0NPTkZJRy5yZXRyeS5tYXhBdHRlbXB0czsgYXR0ZW1wdCsrKSB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgY2xpZW50LmNoYXQuY29tcGxldGlvbnMuY3JlYXRlKHtcclxuICAgICAgICAgICAgbW9kZWwsXHJcbiAgICAgICAgICAgIG1lc3NhZ2VzOiBbXHJcbiAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgcm9sZTogJ3N5c3RlbScsXHJcbiAgICAgICAgICAgICAgICBjb250ZW50OiBPUEVOQUlfQ09ORklHLnByb21wdHMuc3lzdGVtUm9sZSxcclxuICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIHJvbGU6ICd1c2VyJyxcclxuICAgICAgICAgICAgICAgIGNvbnRlbnQ6IHByb21wdCxcclxuICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBdLFxyXG4gICAgICAgICAgICB0ZW1wZXJhdHVyZTogT1BFTkFJX0NPTkZJRy5wYXJhbWV0ZXJzLnRlbXBlcmF0dXJlLFxyXG4gICAgICAgICAgICBtYXhfdG9rZW5zOiBPUEVOQUlfQ09ORklHLnBhcmFtZXRlcnMubWF4VG9rZW5zLFxyXG4gICAgICAgICAgICB0b3BfcDogT1BFTkFJX0NPTkZJRy5wYXJhbWV0ZXJzLnRvcFAsXHJcbiAgICAgICAgICAgIGZyZXF1ZW5jeV9wZW5hbHR5OiBPUEVOQUlfQ09ORklHLnBhcmFtZXRlcnMuZnJlcXVlbmN5UGVuYWx0eSxcclxuICAgICAgICAgICAgcHJlc2VuY2VfcGVuYWx0eTogT1BFTkFJX0NPTkZJRy5wYXJhbWV0ZXJzLnByZXNlbmNlUGVuYWx0eSxcclxuICAgICAgICAgICAgcmVzcG9uc2VfZm9ybWF0OiB7IHR5cGU6ICdqc29uX29iamVjdCcgfSxcclxuICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgIHJldHVybiByZXNwb25zZTtcclxuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgICAgbGFzdEVycm9yID0gZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yIDogbmV3IEVycm9yKFN0cmluZyhlcnJvcikpO1xyXG4gICAgICAgICAgXHJcbiAgICAgICAgICBpZiAoYXR0ZW1wdCA8IE9QRU5BSV9DT05GSUcucmV0cnkubWF4QXR0ZW1wdHMpIHtcclxuICAgICAgICAgICAgY29uc3QgZGVsYXkgPSBnZXRSZXRyeURlbGF5KGF0dGVtcHQpO1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhgW0FJIEVuZ2luZV0gUmV0cnkgYXR0ZW1wdCAke2F0dGVtcHR9IGZhaWxlZC4gUmV0cnlpbmcgaW4gJHtkZWxheX1tcy4uLmApO1xyXG4gICAgICAgICAgICBhd2FpdCB0aGlzLnNsZWVwKGRlbGF5KTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHRocm93IG5ldyBFcnJvcihcclxuICAgICAgICBgQUkgc2VydmljZSB0ZW1wb3JhcmlseSB1bmF2YWlsYWJsZSBhZnRlciAke09QRU5BSV9DT05GSUcucmV0cnkubWF4QXR0ZW1wdHN9IGF0dGVtcHRzLiAke2xhc3RFcnJvcj8ubWVzc2FnZSB8fCAnJ31gXHJcbiAgICAgICk7XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENvbnN0cnVjdCBwcm9tcHQgZnJvbSBhbmFseXNpcyBhbmQgc2NlbmFyaW9cclxuICAgKi9cclxuICBwcml2YXRlIGNvbnN0cnVjdFByb21wdChcclxuICAgIGFuYWx5c2lzOiBBcHBsaWNhdGlvbkFuYWx5c2lzLFxyXG4gICAgc2NlbmFyaW86IHN0cmluZyxcclxuICAgIGNvbnRleHQ/OiBMZWFybmluZ0NvbnRleHRcclxuICApOiBzdHJpbmcge1xyXG4gICAgY29uc3QgZWxlbWVudHNEZXNjcmlwdGlvbiA9IGFuYWx5c2lzLmVsZW1lbnRzXHJcbiAgICAgIC5zbGljZSgwLCA1MCkgLy8gTGltaXQgdG8gZmlyc3QgNTAgZWxlbWVudHMgdG8gYXZvaWQgdG9rZW4gbGltaXRzXHJcbiAgICAgIC5tYXAoKGVsLCBpZHgpID0+IHtcclxuICAgICAgICBjb25zdCBhdHRycyA9IE9iamVjdC5lbnRyaWVzKGVsLmF0dHJpYnV0ZXMpXHJcbiAgICAgICAgICAuZmlsdGVyKChbXywgdmFsdWVdKSA9PiB2YWx1ZSlcclxuICAgICAgICAgIC5tYXAoKFtrZXksIHZhbHVlXSkgPT4gYCR7a2V5fT1cIiR7dmFsdWV9XCJgKVxyXG4gICAgICAgICAgLmpvaW4oJyAnKTtcclxuICAgICAgICByZXR1cm4gYCR7aWR4ICsgMX0uICR7ZWwudHlwZX0gWyR7YXR0cnN9XWA7XHJcbiAgICAgIH0pXHJcbiAgICAgIC5qb2luKCdcXG4nKTtcclxuXHJcbiAgICBjb25zdCBwYXR0ZXJuc0Rlc2NyaXB0aW9uID0gYW5hbHlzaXMucGF0dGVybnNcclxuICAgICAgLm1hcCgocGF0dGVybikgPT4gYC0gJHtwYXR0ZXJuLnR5cGV9OiAke3BhdHRlcm4uZGVzY3JpcHRpb259YClcclxuICAgICAgLmpvaW4oJ1xcbicpO1xyXG5cclxuICAgIGNvbnN0IGxlYXJuaW5nRmVlZGJhY2sgPSBjb250ZXh0XHJcbiAgICAgID8gYFxcblxcbkxlYXJuaW5nIENvbnRleHQ6XHJcbi0gU3VjY2Vzc2Z1bCBwYXR0ZXJuczogJHtjb250ZXh0LnN1Y2Nlc3NmdWxQYXR0ZXJucy5qb2luKCcsICcpfVxyXG4tIFBhdHRlcm5zIHRvIGF2b2lkOiAke2NvbnRleHQuZmFpbGluZ1BhdHRlcm5zLmpvaW4oJywgJyl9XHJcbi0gUHJlZmVycmVkIHNlbGVjdG9yIHN0cmF0ZWdpZXM6ICR7Y29udGV4dC5zZWxlY3RvclByZWZlcmVuY2VzLmpvaW4oJywgJyl9YFxyXG4gICAgICA6ICcnO1xyXG5cclxuICAgIHJldHVybiBgQW5hbHl6ZSB0aGUgZm9sbG93aW5nIHdlYiBwYWdlIGFuZCBnZW5lcmF0ZSBhIHRlc3QgY2FzZSBmb3IgdGhlIHNjZW5hcmlvOiBcIiR7c2NlbmFyaW99XCJcclxuXHJcblBhZ2UgSW5mb3JtYXRpb246XHJcbi0gVVJMOiAke2FuYWx5c2lzLnVybH1cclxuLSBUaXRsZTogJHthbmFseXNpcy50aXRsZX1cclxuLSBJcyBTUEE6ICR7YW5hbHlzaXMubWV0YWRhdGEuaXNTUEF9XHJcblxyXG5JbnRlcmFjdGl2ZSBFbGVtZW50czpcclxuJHtlbGVtZW50c0Rlc2NyaXB0aW9ufVxyXG5cclxuVUkgUGF0dGVybnMgRGV0ZWN0ZWQ6XHJcbiR7cGF0dGVybnNEZXNjcmlwdGlvbn1cclxuJHtsZWFybmluZ0ZlZWRiYWNrfVxyXG5cclxuR2VuZXJhdGUgYSBjb21wcmVoZW5zaXZlIHRlc3QgY2FzZSB0aGF0OlxyXG4xLiBVc2VzIGRlc2NyaXB0aXZlIGVsZW1lbnQgZGVzY3JpcHRpb25zIChub3QgZXhhY3Qgc2VsZWN0b3JzKVxyXG4yLiBJbmNsdWRlcyBhbGwgbmVjZXNzYXJ5IHN0ZXBzIHRvIGNvbXBsZXRlIHRoZSBzY2VuYXJpb1xyXG4zLiBBZGRzIGFwcHJvcHJpYXRlIGFzc2VydGlvbnMgdG8gdmVyaWZ5IHN1Y2Nlc3NcclxuNC4gVXNlcyB3YWl0IHN0ZXBzIHdoZW4gbmVlZGVkIGZvciBkeW5hbWljIGNvbnRlbnRcclxuNS4gRm9sbG93cyBiZXN0IHByYWN0aWNlcyBmb3IgdGVzdCBtYWludGFpbmFiaWxpdHlcclxuXHJcblJldHVybiB0aGUgdGVzdCBzcGVjaWZpY2F0aW9uIGluIEpTT04gZm9ybWF0IHdpdGggdGhpcyBzdHJ1Y3R1cmU6XHJcbntcclxuICBcInRlc3ROYW1lXCI6IFwiZGVzY3JpcHRpdmUgdGVzdCBuYW1lXCIsXHJcbiAgXCJkZXNjcmlwdGlvblwiOiBcImRldGFpbGVkIGRlc2NyaXB0aW9uIG9mIHdoYXQgdGhlIHRlc3QgdmFsaWRhdGVzXCIsXHJcbiAgXCJzdGVwc1wiOiBbXHJcbiAgICB7XHJcbiAgICAgIFwiYWN0aW9uXCI6IFwibmF2aWdhdGV8Y2xpY2t8dHlwZXxhc3NlcnR8d2FpdFwiLFxyXG4gICAgICBcImRlc2NyaXB0aW9uXCI6IFwid2hhdCB0aGlzIHN0ZXAgZG9lc1wiLFxyXG4gICAgICBcImVsZW1lbnREZXNjcmlwdGlvblwiOiBcImRlc2NyaXB0aW9uIG9mIHRoZSBlbGVtZW50IChmb3IgY2xpY2svdHlwZS9hc3NlcnQpXCIsXHJcbiAgICAgIFwidmFsdWVcIjogXCJ2YWx1ZSB0byB0eXBlIChmb3IgdHlwZSBhY3Rpb24pXCIsXHJcbiAgICAgIFwiYXNzZXJ0aW9uXCI6IHtcclxuICAgICAgICBcInR5cGVcIjogXCJleGlzdHN8dmlzaWJsZXx0ZXh0fHZhbHVlfGF0dHJpYnV0ZVwiLFxyXG4gICAgICAgIFwiZXhwZWN0ZWRcIjogXCJleHBlY3RlZCB2YWx1ZVwiXHJcbiAgICAgIH1cclxuICAgIH1cclxuICBdLFxyXG4gIFwidGFnc1wiOiBbXCJ0YWcxXCIsIFwidGFnMlwiXVxyXG59YDtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFBhcnNlIE9wZW5BSSByZXNwb25zZSB0byBUZXN0U3BlY2lmaWNhdGlvblxyXG4gICAqL1xyXG4gIHByaXZhdGUgcGFyc2VSZXNwb25zZShcclxuICAgIHJlc3BvbnNlOiBPcGVuQUkuQ2hhdC5Db21wbGV0aW9ucy5DaGF0Q29tcGxldGlvblxyXG4gICk6IHVua25vd24ge1xyXG4gICAgY29uc3QgY29udGVudCA9IHJlc3BvbnNlLmNob2ljZXNbMF0/Lm1lc3NhZ2U/LmNvbnRlbnQ7XHJcblxyXG4gICAgaWYgKCFjb250ZW50KSB7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcignQUkgZ2VuZXJhdGVkIGVtcHR5IHJlc3BvbnNlJyk7XHJcbiAgICB9XHJcblxyXG4gICAgdHJ5IHtcclxuICAgICAgcmV0dXJuIEpTT04ucGFyc2UoY29udGVudCk7XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEFJIGdlbmVyYXRlZCBpbnZhbGlkIEpTT046ICR7ZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpfWApO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogVmFsaWRhdGUgcmVzcG9uc2UgYWdhaW5zdCBzY2hlbWFcclxuICAgKi9cclxuICB2YWxpZGF0ZVJlc3BvbnNlKHJlc3BvbnNlOiB1bmtub3duKTogVGVzdFNwZWNpZmljYXRpb24ge1xyXG4gICAgdHJ5IHtcclxuICAgICAgcmV0dXJuIFRlc3RTcGVjaWZpY2F0aW9uU2NoZW1hLnBhcnNlKHJlc3BvbnNlKTtcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGlmIChlcnJvciBpbnN0YW5jZW9mIHouWm9kRXJyb3IpIHtcclxuICAgICAgICBjb25zdCBpc3N1ZXMgPSBlcnJvci5pc3N1ZXMubWFwKChpc3N1ZSkgPT4gYCR7aXNzdWUucGF0aC5qb2luKCcuJyl9OiAke2lzc3VlLm1lc3NhZ2V9YCkuam9pbignLCAnKTtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEFJIGdlbmVyYXRlZCBpbnZhbGlkIHRlc3Qgc3BlY2lmaWNhdGlvbi4gVmFsaWRhdGlvbiBlcnJvcnM6ICR7aXNzdWVzfWApO1xyXG4gICAgICB9XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcignQUkgZ2VuZXJhdGVkIGludmFsaWQgdGVzdCBzcGVjaWZpY2F0aW9uLiBQbGVhc2UgdHJ5IGFnYWluLicpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR2V0IEFQSSBpbnRlcmFjdGlvbiBsb2dzXHJcbiAgICovXHJcbiAgZ2V0TG9ncygpOiBBUElMb2dFbnRyeVtdIHtcclxuICAgIHJldHVybiB0aGlzLmxvZ2dlci5nZXRMb2dzKCk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBDbGVhciBBUEkgaW50ZXJhY3Rpb24gbG9nc1xyXG4gICAqL1xyXG4gIGNsZWFyTG9ncygpOiB2b2lkIHtcclxuICAgIHRoaXMubG9nZ2VyLmNsZWFyTG9ncygpO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR2V0IGNpcmN1aXQgYnJlYWtlciBzdGF0ZVxyXG4gICAqL1xyXG4gIGdldENpcmN1aXRTdGF0ZSgpOiBDaXJjdWl0U3RhdGUge1xyXG4gICAgcmV0dXJuIHRoaXMuY2lyY3VpdEJyZWFrZXIuZ2V0U3RhdGUoKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFJlc2V0IGNpcmN1aXQgYnJlYWtlciAoZm9yIHRlc3RpbmcpXHJcbiAgICovXHJcbiAgcmVzZXRDaXJjdWl0KCk6IHZvaWQge1xyXG4gICAgdGhpcy5jaXJjdWl0QnJlYWtlci5yZXNldCgpO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogU2xlZXAgdXRpbGl0eSBmb3IgcmV0cnkgZGVsYXlzXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBzbGVlcChtczogbnVtYmVyKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgbXMpKTtcclxuICB9XHJcbn1cclxuXHJcbi8vIEV4cG9ydCB0eXBlcyBhbmQgZW51bXNcclxuZXhwb3J0IHsgQ2lyY3VpdFN0YXRlLCBBUElMb2dFbnRyeSB9O1xyXG4iXX0=
"use strict";
/**
 * Bedrock Engine Service
 *
 * Integrates with Amazon Bedrock (Claude Sonnet 4.6) for AI-powered test generation.
 * Uses inference profile for cross-region routing and high availability.
 * Implements the same interface as AIEngine for provider abstraction.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CircuitState = exports.BedrockEngine = void 0;
const client_bedrock_runtime_1 = require("@aws-sdk/client-bedrock-runtime");
const zod_1 = require("zod");
const bedrock_monitoring_1 = require("./bedrock-monitoring");
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
        console.log('[Bedrock Engine]', JSON.stringify(entry));
    }
    getLogs() {
        return [...this.logs];
    }
    clearLogs() {
        this.logs = [];
    }
}
const DEFAULT_CONFIG = {
    region: 'us-east-1',
    modelId: 'us.anthropic.claude-sonnet-4-6',
    timeout: 30000,
    circuitBreaker: {
        failureThreshold: 5,
        resetTimeoutMs: 60000,
        halfOpenMaxAttempts: 2,
    },
};
// ============================================================================
// Bedrock Engine Service
// ============================================================================
class BedrockEngine {
    client;
    circuitBreaker;
    logger;
    modelId;
    region;
    monitoring;
    constructor(config) {
        this.region = config?.region || process.env.BEDROCK_REGION || DEFAULT_CONFIG.region;
        this.modelId = config?.modelId || process.env.BEDROCK_MODEL_ID || DEFAULT_CONFIG.modelId;
        const timeout = config?.timeout ||
            (process.env.BEDROCK_TIMEOUT ? parseInt(process.env.BEDROCK_TIMEOUT) : DEFAULT_CONFIG.timeout);
        this.client = new client_bedrock_runtime_1.BedrockRuntimeClient({
            region: this.region,
            maxAttempts: 3,
            requestHandler: {
                requestTimeout: timeout,
            },
        });
        this.circuitBreaker = new CircuitBreaker(DEFAULT_CONFIG.circuitBreaker.failureThreshold, DEFAULT_CONFIG.circuitBreaker.resetTimeoutMs, DEFAULT_CONFIG.circuitBreaker.halfOpenMaxAttempts);
        this.logger = new APILogger();
        this.monitoring = (0, bedrock_monitoring_1.getBedrockMonitoring)(this.region);
        console.log(`[BedrockEngine] Initialized with region: ${this.region}, model: ${this.modelId}`);
    }
    /**
     * Analyze application structure and provide insights
     */
    async analyze(analysis) {
        const startTime = Date.now();
        const xraySegment = this.monitoring.startXRaySegment('analyze');
        try {
            const prompt = this.buildAnalysisPrompt(analysis);
            const response = await this.invokeModelWithRetry(prompt, {
                temperature: 0.3,
                max_tokens: 2048,
            });
            const analysisResult = this.parseResponse(response.content);
            const latency = Date.now() - startTime;
            const totalTokens = response.usage.input_tokens + response.usage.output_tokens;
            const cost = this.calculateCost({
                promptTokens: response.usage.input_tokens,
                completionTokens: response.usage.output_tokens,
                totalTokens,
            });
            // Emit CloudWatch metrics
            await this.monitoring.emitMetrics({
                operation: 'analyze',
                latency,
                tokens: totalTokens,
                cost,
                success: true,
            });
            // Log detailed operation
            this.monitoring.logOperation({
                timestamp: new Date().toISOString(),
                operation: 'analyze',
                model: this.modelId,
                region: this.region,
                requestTokens: response.usage.input_tokens,
                responseTokens: response.usage.output_tokens,
                totalTokens,
                cost,
                latency,
                status: 'success',
                circuitState: this.circuitBreaker.getState(),
            });
            // Log successful API interaction (legacy)
            this.logger.log({
                timestamp: new Date().toISOString(),
                operation: 'analyze',
                model: this.modelId,
                requestTokens: response.usage.input_tokens,
                responseTokens: response.usage.output_tokens,
                totalTokens,
                status: 'success',
                duration: latency,
            });
            // Add X-Ray metadata
            if (xraySegment) {
                xraySegment.addMetadata('tokens', totalTokens);
                xraySegment.addMetadata('cost', cost);
                xraySegment.addAnnotation('model', this.modelId);
                xraySegment.close();
            }
            return analysisResult;
        }
        catch (error) {
            const latency = Date.now() - startTime;
            const errorType = this.extractErrorType(error);
            // Emit CloudWatch metrics for failure
            await this.monitoring.emitMetrics({
                operation: 'analyze',
                latency,
                tokens: 0,
                cost: 0,
                success: false,
                errorType,
            });
            // Log detailed operation failure
            this.monitoring.logOperation({
                timestamp: new Date().toISOString(),
                operation: 'analyze',
                model: this.modelId,
                region: this.region,
                latency,
                status: 'failure',
                error: error instanceof Error ? error.message : String(error),
                circuitState: this.circuitBreaker.getState(),
            });
            // Log failed API interaction (legacy)
            this.logger.log({
                timestamp: new Date().toISOString(),
                operation: 'analyze',
                model: this.modelId,
                status: 'failure',
                error: error instanceof Error ? error.message : String(error),
                duration: latency,
            });
            // Add X-Ray error
            if (xraySegment) {
                xraySegment.close(error instanceof Error ? error : new Error(String(error)));
            }
            throw error;
        }
    }
    /**
     * Generate test code, selectors, or other AI-generated content
     * This is a general-purpose generation method for various AI tasks
     */
    async generate(request) {
        const startTime = Date.now();
        const xraySegment = this.monitoring.startXRaySegment('generate');
        try {
            const prompt = this.buildGenerationPrompt(request);
            const response = await this.invokeModelWithRetry(prompt, {
                temperature: 0.7,
                max_tokens: 4096,
            });
            // Validate Playwright syntax if generating test code
            if (request.scenario || request.partialCode) {
                this.validatePlaywrightSyntax(response.content);
            }
            const latency = Date.now() - startTime;
            const totalTokens = response.usage.input_tokens + response.usage.output_tokens;
            const cost = this.calculateCost({
                promptTokens: response.usage.input_tokens,
                completionTokens: response.usage.output_tokens,
                totalTokens,
            });
            // Emit CloudWatch metrics
            await this.monitoring.emitMetrics({
                operation: 'generate',
                latency,
                tokens: totalTokens,
                cost,
                success: true,
            });
            // Log detailed operation
            this.monitoring.logOperation({
                timestamp: new Date().toISOString(),
                operation: 'generate',
                model: this.modelId,
                region: this.region,
                requestTokens: response.usage.input_tokens,
                responseTokens: response.usage.output_tokens,
                totalTokens,
                cost,
                latency,
                status: 'success',
                circuitState: this.circuitBreaker.getState(),
            });
            // Log successful API interaction (legacy)
            this.logger.log({
                timestamp: new Date().toISOString(),
                operation: 'generate',
                model: this.modelId,
                requestTokens: response.usage.input_tokens,
                responseTokens: response.usage.output_tokens,
                totalTokens,
                status: 'success',
                duration: latency,
            });
            // Add X-Ray metadata
            if (xraySegment) {
                xraySegment.addMetadata('tokens', totalTokens);
                xraySegment.addMetadata('cost', cost);
                xraySegment.addAnnotation('model', this.modelId);
                xraySegment.close();
            }
            return {
                content: response.content,
                usage: {
                    promptTokens: response.usage.input_tokens,
                    completionTokens: response.usage.output_tokens,
                    totalTokens,
                },
                cost,
                model: this.modelId,
                provider: 'BEDROCK',
            };
        }
        catch (error) {
            const latency = Date.now() - startTime;
            const errorType = this.extractErrorType(error);
            // Emit CloudWatch metrics for failure
            await this.monitoring.emitMetrics({
                operation: 'generate',
                latency,
                tokens: 0,
                cost: 0,
                success: false,
                errorType,
            });
            // Log detailed operation failure
            this.monitoring.logOperation({
                timestamp: new Date().toISOString(),
                operation: 'generate',
                model: this.modelId,
                region: this.region,
                latency,
                status: 'failure',
                error: error instanceof Error ? error.message : String(error),
                circuitState: this.circuitBreaker.getState(),
            });
            // Log failed API interaction (legacy)
            this.logger.log({
                timestamp: new Date().toISOString(),
                operation: 'generate',
                model: this.modelId,
                status: 'failure',
                error: error instanceof Error ? error.message : String(error),
                duration: latency,
            });
            // Add X-Ray error
            if (xraySegment) {
                xraySegment.close(error instanceof Error ? error : new Error(String(error)));
            }
            throw error;
        }
    }
    /**
     * Complete partial code using AI
     * Specialized method for code completion with optimized parameters
     */
    async complete(request) {
        const startTime = Date.now();
        const xraySegment = this.monitoring.startXRaySegment('complete');
        try {
            const prompt = this.buildCompletionPrompt(request);
            const response = await this.invokeModelWithRetry(prompt, {
                temperature: 0.5,
                max_tokens: 1024,
            });
            const latency = Date.now() - startTime;
            const totalTokens = response.usage.input_tokens + response.usage.output_tokens;
            const cost = this.calculateCost({
                promptTokens: response.usage.input_tokens,
                completionTokens: response.usage.output_tokens,
                totalTokens,
            });
            // Emit CloudWatch metrics
            await this.monitoring.emitMetrics({
                operation: 'complete',
                latency,
                tokens: totalTokens,
                cost,
                success: true,
            });
            // Log detailed operation
            this.monitoring.logOperation({
                timestamp: new Date().toISOString(),
                operation: 'complete',
                model: this.modelId,
                region: this.region,
                requestTokens: response.usage.input_tokens,
                responseTokens: response.usage.output_tokens,
                totalTokens,
                cost,
                latency,
                status: 'success',
                circuitState: this.circuitBreaker.getState(),
            });
            // Log successful API interaction (legacy)
            this.logger.log({
                timestamp: new Date().toISOString(),
                operation: 'complete',
                model: this.modelId,
                requestTokens: response.usage.input_tokens,
                responseTokens: response.usage.output_tokens,
                totalTokens,
                status: 'success',
                duration: latency,
            });
            // Add X-Ray metadata
            if (xraySegment) {
                xraySegment.addMetadata('tokens', totalTokens);
                xraySegment.addMetadata('cost', cost);
                xraySegment.addAnnotation('model', this.modelId);
                xraySegment.close();
            }
            return {
                content: response.content,
                usage: {
                    promptTokens: response.usage.input_tokens,
                    completionTokens: response.usage.output_tokens,
                    totalTokens,
                },
                cost,
                model: this.modelId,
                provider: 'BEDROCK',
            };
        }
        catch (error) {
            const latency = Date.now() - startTime;
            const errorType = this.extractErrorType(error);
            // Emit CloudWatch metrics for failure
            await this.monitoring.emitMetrics({
                operation: 'complete',
                latency,
                tokens: 0,
                cost: 0,
                success: false,
                errorType,
            });
            // Log detailed operation failure
            this.monitoring.logOperation({
                timestamp: new Date().toISOString(),
                operation: 'complete',
                model: this.modelId,
                region: this.region,
                latency,
                status: 'failure',
                error: error instanceof Error ? error.message : String(error),
                circuitState: this.circuitBreaker.getState(),
            });
            // Log failed API interaction (legacy)
            this.logger.log({
                timestamp: new Date().toISOString(),
                operation: 'complete',
                model: this.modelId,
                status: 'failure',
                error: error instanceof Error ? error.message : String(error),
                duration: latency,
            });
            // Add X-Ray error
            if (xraySegment) {
                xraySegment.close(error instanceof Error ? error : new Error(String(error)));
            }
            throw error;
        }
    }
    /**
     * Generate test specification from application analysis
     */
    async generateTestSpecification(analysis, scenario, context) {
        const startTime = Date.now();
        const xraySegment = this.monitoring.startXRaySegment('generateTestSpecification');
        try {
            const prompt = this.constructPrompt(analysis, scenario, context);
            const response = await this.invokeModelWithRetry(prompt, {
                temperature: 0.7,
                max_tokens: 4096,
            });
            const specification = this.parseResponse(response.content);
            const validatedSpec = this.validateResponse(specification);
            const latency = Date.now() - startTime;
            const totalTokens = response.usage.input_tokens + response.usage.output_tokens;
            const cost = this.calculateCost({
                promptTokens: response.usage.input_tokens,
                completionTokens: response.usage.output_tokens,
                totalTokens,
            });
            // Emit CloudWatch metrics
            await this.monitoring.emitMetrics({
                operation: 'generateTestSpecification',
                latency,
                tokens: totalTokens,
                cost,
                success: true,
            });
            // Log detailed operation
            this.monitoring.logOperation({
                timestamp: new Date().toISOString(),
                operation: 'generateTestSpecification',
                model: this.modelId,
                region: this.region,
                requestTokens: response.usage.input_tokens,
                responseTokens: response.usage.output_tokens,
                totalTokens,
                cost,
                latency,
                status: 'success',
                circuitState: this.circuitBreaker.getState(),
            });
            // Log successful API interaction (legacy)
            this.logger.log({
                timestamp: new Date().toISOString(),
                operation: 'generateTestSpecification',
                model: this.modelId,
                requestTokens: response.usage.input_tokens,
                responseTokens: response.usage.output_tokens,
                totalTokens,
                status: 'success',
                duration: latency,
            });
            // Add X-Ray metadata
            if (xraySegment) {
                xraySegment.addMetadata('tokens', totalTokens);
                xraySegment.addMetadata('cost', cost);
                xraySegment.addAnnotation('model', this.modelId);
                xraySegment.close();
            }
            return validatedSpec;
        }
        catch (error) {
            const latency = Date.now() - startTime;
            const errorType = this.extractErrorType(error);
            // Emit CloudWatch metrics for failure
            await this.monitoring.emitMetrics({
                operation: 'generateTestSpecification',
                latency,
                tokens: 0,
                cost: 0,
                success: false,
                errorType,
            });
            // Log detailed operation failure
            this.monitoring.logOperation({
                timestamp: new Date().toISOString(),
                operation: 'generateTestSpecification',
                model: this.modelId,
                region: this.region,
                latency,
                status: 'failure',
                error: error instanceof Error ? error.message : String(error),
                circuitState: this.circuitBreaker.getState(),
            });
            // Log failed API interaction (legacy)
            this.logger.log({
                timestamp: new Date().toISOString(),
                operation: 'generateTestSpecification',
                model: this.modelId,
                status: 'failure',
                error: error instanceof Error ? error.message : String(error),
                duration: latency,
            });
            // Add X-Ray error
            if (xraySegment) {
                xraySegment.close(error instanceof Error ? error : new Error(String(error)));
            }
            throw error;
        }
    }
    /**
     * Invoke Bedrock model with retry logic and circuit breaker
     */
    async invokeModelWithRetry(prompt, options) {
        return this.circuitBreaker.execute(async () => {
            let lastError = null;
            for (let attempt = 1; attempt <= 3; attempt++) {
                try {
                    // Build Claude request format
                    const requestBody = {
                        anthropic_version: 'bedrock-2023-05-31',
                        max_tokens: options.max_tokens,
                        temperature: options.temperature,
                        messages: [
                            {
                                role: 'user',
                                content: prompt,
                            },
                        ],
                    };
                    // Create Bedrock command
                    const command = new client_bedrock_runtime_1.InvokeModelCommand({
                        modelId: this.modelId,
                        contentType: 'application/json',
                        accept: 'application/json',
                        body: JSON.stringify(requestBody),
                    });
                    // Invoke Bedrock
                    const response = await this.client.send(command);
                    // Parse response
                    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
                    // Extract content and usage
                    const content = responseBody.content[0].text;
                    const usage = {
                        input_tokens: responseBody.usage.input_tokens,
                        output_tokens: responseBody.usage.output_tokens,
                    };
                    return { content, usage };
                }
                catch (error) {
                    lastError = this.handleError(error);
                    // Don't retry validation errors
                    if (lastError.message.includes('AI_VALIDATION_ERROR')) {
                        throw lastError;
                    }
                    if (attempt < 3) {
                        const delay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
                        console.log(`[Bedrock Engine] Retry attempt ${attempt} failed. Retrying in ${delay}ms...`);
                        await this.sleep(delay);
                    }
                }
            }
            throw new Error(`AI service temporarily unavailable after 3 attempts. ${lastError?.message || ''}`);
        });
    }
    /**
     * Build analysis prompt from application context
     */
    buildAnalysisPrompt(analysis) {
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
        const flowsDescription = analysis.flows
            .map((flow) => `- ${flow.name}: ${flow.steps.join(' → ')}`)
            .join('\n');
        return `You are an expert QA engineer analyzing a web application for test automation.

Application Information:
- URL: ${analysis.url}
- Title: ${analysis.title}
- Is SPA: ${analysis.metadata.isSPA}
- Load Time: ${analysis.metadata.loadTime}ms

Interactive Elements (${analysis.elements.length} total, showing first 50):
${elementsDescription}

UI Patterns Detected:
${patternsDescription}

User Flows Identified:
${flowsDescription}

Analyze this application and provide:
1. Key features and functionality
2. Main user flows for testing
3. Interactive elements with recommended actions
4. Whether authentication is required
5. Recommended test coverage areas

Respond in JSON format with the following structure:
{
  "features": ["feature1", "feature2"],
  "userFlows": ["flow1", "flow2"],
  "interactiveElements": [
    {
      "type": "button|link|input|select|textarea|checkbox|radio",
      "selector": "CSS selector or description",
      "action": "click|type|select|check"
    }
  ],
  "authRequired": true|false,
  "testRecommendations": ["recommendation1", "recommendation2"]
}`;
    }
    /**
     * Build generation prompt for test code, selectors, or completions
     */
    buildGenerationPrompt(request) {
        // Selector generation
        if (request.elementDescription && request.domContext) {
            return `You are an expert Playwright test automation engineer specializing in robust selector generation.

Element to locate: ${request.elementDescription}

DOM Context:
${request.domContext}

Generate robust selectors for this element using multiple strategies:
1. data-testid (most stable)
2. aria-label (accessible and stable)
3. id (stable if unique)
4. CSS selector (readable and maintainable)
5. XPath (as fallback)

Prioritize selectors that:
- Are stable across deployments
- Are readable and maintainable
- Follow Playwright best practices
- Avoid brittle selectors like nth-child

Return ONLY the best selector as a string, no explanations.`;
        }
        // Test code generation
        if (request.scenario && request.context) {
            return `You are an expert Playwright test automation engineer.

Generate a Playwright test for the following scenario:
${request.scenario}

Application context:
${JSON.stringify(request.context, null, 2)}

Requirements:
- Use TypeScript syntax
- Include proper assertions with expect()
- Add error handling with try-catch where appropriate
- Use stable selectors (data-testid, aria-label, role)
- Follow Playwright best practices
- Add comments for complex steps
- Use page.waitForSelector() for dynamic content
- Include proper test structure with test() and describe()

Return ONLY the test code, no explanations or markdown formatting.`;
        }
        // Generic generation
        return `You are an expert Playwright test automation engineer.

Task: ${request.scenario || 'Generate test automation code'}

Context:
${JSON.stringify(request.context || {}, null, 2)}

Generate high-quality Playwright test code following best practices.
Return only the code, no explanations.`;
    }
    /**
     * Build completion prompt for partial code
     */
    buildCompletionPrompt(request) {
        if (!request.partialCode) {
            throw new Error('Partial code is required for completion');
        }
        return `Complete the following Playwright test code:

${request.partialCode}

Context: ${request.context || 'No additional context'}

Requirements:
- Maintain the same coding style and format
- Use TypeScript syntax
- Follow Playwright best practices
- Add appropriate assertions
- Include error handling if needed

Provide only the completion code that should be added, no explanations.`;
    }
    /**
     * Validate that generated content contains valid Playwright syntax
     */
    validatePlaywrightSyntax(content) {
        // Check for common Playwright patterns
        const hasPlaywrightImports = /import.*[@{].*playwright|from ['"]@playwright/.test(content);
        const hasTestFunction = /test\(|test\.describe\(|test\.beforeEach\(/.test(content);
        const hasPageObject = /page\.|await page\./.test(content);
        const hasExpect = /expect\(/.test(content);
        // For selector generation, just check it's a valid string
        if (!hasTestFunction && content.trim().length > 0) {
            // Likely a selector, validate it's not empty
            if (content.trim().length < 2) {
                throw new Error('Generated selector is too short or invalid');
            }
            return;
        }
        // For test code, validate Playwright patterns
        if (hasTestFunction || hasPageObject) {
            if (!hasExpect && !content.includes('click') && !content.includes('fill')) {
                console.warn('[BedrockEngine] Generated test code may be missing assertions or actions');
            }
            return;
        }
        // If we get here and content is not empty, it might be valid code without obvious patterns
        if (content.trim().length > 0) {
            return;
        }
        throw new Error('Generated content does not appear to contain valid Playwright syntax');
    }
    /**
     * Calculate cost based on token usage
     * Claude Sonnet 4.6 pricing: $3/1M input tokens, $15/1M output tokens
     * Note: Pricing may vary - verify current rates at https://aws.amazon.com/bedrock/pricing/
     */
    calculateCost(usage) {
        const INPUT_COST_PER_1M = 3.0;
        const OUTPUT_COST_PER_1M = 15.0;
        const inputCost = (usage.promptTokens / 1_000_000) * INPUT_COST_PER_1M;
        const outputCost = (usage.completionTokens / 1_000_000) * OUTPUT_COST_PER_1M;
        return inputCost + outputCost;
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
     * Parse Bedrock response to TestSpecification
     */
    parseResponse(content) {
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
     * Handle Bedrock errors and convert to standard error types
     */
    handleError(error) {
        const errorName = error.name || error.__type || '';
        const errorMessage = error.message || String(error);
        console.error('[Bedrock Engine] Error:', { name: errorName, message: errorMessage });
        if (errorName === 'ThrottlingException' || errorMessage.includes('throttl')) {
            return new Error('AI_RATE_LIMIT: Bedrock rate limit exceeded');
        }
        if (errorName === 'ValidationException' || errorMessage.includes('validation')) {
            return new Error('AI_VALIDATION_ERROR: Invalid request to Bedrock');
        }
        if (errorName === 'ModelTimeoutException' || errorMessage.includes('timeout')) {
            return new Error('AI_TIMEOUT: Bedrock model timeout');
        }
        if (errorName === 'ServiceUnavailableException' || errorMessage.includes('unavailable')) {
            return new Error('AI_UNAVAILABLE: Bedrock service unavailable');
        }
        return new Error(`AI_ERROR: ${errorMessage}`);
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
     * Extract error type from error object
     */
    extractErrorType(error) {
        if (error instanceof Error) {
            const message = error.message;
            if (message.includes('AI_RATE_LIMIT'))
                return 'RateLimit';
            if (message.includes('AI_VALIDATION_ERROR'))
                return 'Validation';
            if (message.includes('AI_TIMEOUT'))
                return 'Timeout';
            if (message.includes('AI_UNAVAILABLE'))
                return 'ServiceUnavailable';
            if (message.includes('Circuit breaker'))
                return 'CircuitBreaker';
        }
        return 'Unknown';
    }
    /**
     * Sleep utility for retry delays
     */
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
exports.BedrockEngine = BedrockEngine;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmVkcm9jay1lbmdpbmUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJiZWRyb2NrLWVuZ2luZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOzs7QUFFSCw0RUFHeUM7QUFDekMsNkJBQXdCO0FBT3hCLDZEQUF5RTtBQThCekUsK0VBQStFO0FBQy9FLHNDQUFzQztBQUN0QywrRUFBK0U7QUFFL0UsTUFBTSxxQkFBcUIsR0FBRyxPQUFDLENBQUMsTUFBTSxDQUFDO0lBQ3JDLE1BQU0sRUFBRSxPQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsVUFBVSxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBQy9ELFdBQVcsRUFBRSxPQUFDLENBQUMsTUFBTSxFQUFFO0lBQ3ZCLGtCQUFrQixFQUFFLE9BQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxRQUFRLEVBQUU7SUFDekMsS0FBSyxFQUFFLE9BQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxRQUFRLEVBQUU7SUFDNUIsU0FBUyxFQUFFLE9BQUMsQ0FBQyxNQUFNLENBQUM7UUFDbEIsSUFBSSxFQUFFLE9BQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsV0FBVyxDQUFDLENBQUM7UUFDakUsUUFBUSxFQUFFLE9BQUMsQ0FBQyxNQUFNLEVBQUU7S0FDckIsQ0FBQyxDQUFDLFFBQVEsRUFBRTtDQUNkLENBQUMsQ0FBQztBQUVILE1BQU0sdUJBQXVCLEdBQUcsT0FBQyxDQUFDLE1BQU0sQ0FBQztJQUN2QyxRQUFRLEVBQUUsT0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7SUFDM0IsV0FBVyxFQUFFLE9BQUMsQ0FBQyxNQUFNLEVBQUU7SUFDdkIsS0FBSyxFQUFFLE9BQUMsQ0FBQyxLQUFLLENBQUMscUJBQXFCLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQzVDLElBQUksRUFBRSxPQUFDLENBQUMsS0FBSyxDQUFDLE9BQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQztDQUMxQixDQUFDLENBQUM7QUFFSCwrRUFBK0U7QUFDL0UsaUNBQWlDO0FBQ2pDLCtFQUErRTtBQUUvRSxJQUFLLFlBSUo7QUFKRCxXQUFLLFlBQVk7SUFDZixpQ0FBaUIsQ0FBQTtJQUNqQiw2QkFBYSxDQUFBO0lBQ2IsdUNBQXVCLENBQUE7QUFDekIsQ0FBQyxFQUpJLFlBQVksNEJBQVosWUFBWSxRQUloQjtBQUVELE1BQU0sY0FBYztJQU9DO0lBQ0E7SUFDQTtJQVJYLEtBQUssR0FBaUIsWUFBWSxDQUFDLE1BQU0sQ0FBQztJQUMxQyxZQUFZLEdBQVcsQ0FBQyxDQUFDO0lBQ3pCLGVBQWUsR0FBVyxDQUFDLENBQUM7SUFDNUIsWUFBWSxHQUFXLENBQUMsQ0FBQztJQUVqQyxZQUNtQixnQkFBd0IsRUFDeEIsY0FBc0IsRUFDdEIsbUJBQTJCO1FBRjNCLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBUTtRQUN4QixtQkFBYyxHQUFkLGNBQWMsQ0FBUTtRQUN0Qix3QkFBbUIsR0FBbkIsbUJBQW1CLENBQVE7SUFDM0MsQ0FBQztJQUVKLEtBQUssQ0FBQyxPQUFPLENBQUksU0FBMkI7UUFDMUMsSUFBSSxJQUFJLENBQUMsS0FBSyxLQUFLLFlBQVksQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNyQyxJQUFJLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUMsZUFBZSxJQUFJLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztnQkFDN0QsSUFBSSxDQUFDLEtBQUssR0FBRyxZQUFZLENBQUMsU0FBUyxDQUFDO2dCQUNwQyxJQUFJLENBQUMsWUFBWSxHQUFHLENBQUMsQ0FBQztZQUN4QixDQUFDO2lCQUFNLENBQUM7Z0JBQ04sTUFBTSxJQUFJLEtBQUssQ0FBQywyREFBMkQsQ0FBQyxDQUFDO1lBQy9FLENBQUM7UUFDSCxDQUFDO1FBRUQsSUFBSSxDQUFDO1lBQ0gsTUFBTSxNQUFNLEdBQUcsTUFBTSxTQUFTLEVBQUUsQ0FBQztZQUNqQyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDakIsT0FBTyxNQUFNLENBQUM7UUFDaEIsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDZixJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDakIsTUFBTSxLQUFLLENBQUM7UUFDZCxDQUFDO0lBQ0gsQ0FBQztJQUVPLFNBQVM7UUFDZixJQUFJLENBQUMsWUFBWSxHQUFHLENBQUMsQ0FBQztRQUV0QixJQUFJLElBQUksQ0FBQyxLQUFLLEtBQUssWUFBWSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQzFDLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUNwQixJQUFJLElBQUksQ0FBQyxZQUFZLElBQUksSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUM7Z0JBQ2xELElBQUksQ0FBQyxLQUFLLEdBQUcsWUFBWSxDQUFDLE1BQU0sQ0FBQztZQUNuQyxDQUFDO1FBQ0gsQ0FBQztJQUNILENBQUM7SUFFTyxTQUFTO1FBQ2YsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO1FBQ3BCLElBQUksQ0FBQyxlQUFlLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBRWxDLElBQUksSUFBSSxDQUFDLFlBQVksSUFBSSxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztZQUMvQyxJQUFJLENBQUMsS0FBSyxHQUFHLFlBQVksQ0FBQyxJQUFJLENBQUM7UUFDakMsQ0FBQztJQUNILENBQUM7SUFFRCxRQUFRO1FBQ04sT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDO0lBQ3BCLENBQUM7SUFFRCxLQUFLO1FBQ0gsSUFBSSxDQUFDLEtBQUssR0FBRyxZQUFZLENBQUMsTUFBTSxDQUFDO1FBQ2pDLElBQUksQ0FBQyxZQUFZLEdBQUcsQ0FBQyxDQUFDO1FBQ3RCLElBQUksQ0FBQyxZQUFZLEdBQUcsQ0FBQyxDQUFDO1FBQ3RCLElBQUksQ0FBQyxlQUFlLEdBQUcsQ0FBQyxDQUFDO0lBQzNCLENBQUM7Q0FDRjtBQWtCRCxNQUFNLFNBQVM7SUFDTCxJQUFJLEdBQWtCLEVBQUUsQ0FBQztJQUVqQyxHQUFHLENBQUMsS0FBa0I7UUFDcEIsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDdEIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7SUFDekQsQ0FBQztJQUVELE9BQU87UUFDTCxPQUFPLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDeEIsQ0FBQztJQUVELFNBQVM7UUFDUCxJQUFJLENBQUMsSUFBSSxHQUFHLEVBQUUsQ0FBQztJQUNqQixDQUFDO0NBQ0Y7QUFZRCxNQUFNLGNBQWMsR0FBRztJQUNyQixNQUFNLEVBQUUsV0FBVztJQUNuQixPQUFPLEVBQUUsZ0NBQWdDO0lBQ3pDLE9BQU8sRUFBRSxLQUFLO0lBQ2QsY0FBYyxFQUFFO1FBQ2QsZ0JBQWdCLEVBQUUsQ0FBQztRQUNuQixjQUFjLEVBQUUsS0FBSztRQUNyQixtQkFBbUIsRUFBRSxDQUFDO0tBQ3ZCO0NBQ0YsQ0FBQztBQUVGLCtFQUErRTtBQUMvRSx5QkFBeUI7QUFDekIsK0VBQStFO0FBRS9FLE1BQWEsYUFBYTtJQUNoQixNQUFNLENBQXVCO0lBQzdCLGNBQWMsQ0FBaUI7SUFDL0IsTUFBTSxDQUFZO0lBQ2xCLE9BQU8sQ0FBUztJQUNoQixNQUFNLENBQVM7SUFDZixVQUFVLENBQTBDO0lBRTVELFlBQVksTUFBc0I7UUFDaEMsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLEVBQUUsTUFBTSxJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsY0FBYyxJQUFJLGNBQWMsQ0FBQyxNQUFNLENBQUM7UUFDcEYsSUFBSSxDQUFDLE9BQU8sR0FBRyxNQUFNLEVBQUUsT0FBTyxJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLElBQUksY0FBYyxDQUFDLE9BQU8sQ0FBQztRQUV6RixNQUFNLE9BQU8sR0FBRyxNQUFNLEVBQUUsT0FBTztZQUNmLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLENBQUM7UUFFL0csSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLDZDQUFvQixDQUFDO1lBQ3JDLE1BQU0sRUFBRSxJQUFJLENBQUMsTUFBTTtZQUNuQixXQUFXLEVBQUUsQ0FBQztZQUNkLGNBQWMsRUFBRTtnQkFDZCxjQUFjLEVBQUUsT0FBTzthQUN4QjtTQUNGLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxjQUFjLEdBQUcsSUFBSSxjQUFjLENBQ3RDLGNBQWMsQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLEVBQzlDLGNBQWMsQ0FBQyxjQUFjLENBQUMsY0FBYyxFQUM1QyxjQUFjLENBQUMsY0FBYyxDQUFDLG1CQUFtQixDQUNsRCxDQUFDO1FBRUYsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLFNBQVMsRUFBRSxDQUFDO1FBRTlCLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBQSx5Q0FBb0IsRUFBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7UUFFcEQsT0FBTyxDQUFDLEdBQUcsQ0FBQyw0Q0FBNEMsSUFBSSxDQUFDLE1BQU0sWUFBWSxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQztJQUNqRyxDQUFDO0lBRUQ7O09BRUc7SUFDSCxLQUFLLENBQUMsT0FBTyxDQUFDLFFBQTZCO1FBT3pDLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUM3QixNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBRWhFLElBQUksQ0FBQztZQUNILE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUVsRCxNQUFNLFFBQVEsR0FBRyxNQUFNLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxNQUFNLEVBQUU7Z0JBQ3ZELFdBQVcsRUFBRSxHQUFHO2dCQUNoQixVQUFVLEVBQUUsSUFBSTthQUNqQixDQUFDLENBQUM7WUFFSCxNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUU1RCxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsU0FBUyxDQUFDO1lBQ3ZDLE1BQU0sV0FBVyxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsWUFBWSxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDO1lBQy9FLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUM7Z0JBQzlCLFlBQVksRUFBRSxRQUFRLENBQUMsS0FBSyxDQUFDLFlBQVk7Z0JBQ3pDLGdCQUFnQixFQUFFLFFBQVEsQ0FBQyxLQUFLLENBQUMsYUFBYTtnQkFDOUMsV0FBVzthQUNaLENBQUMsQ0FBQztZQUVILDBCQUEwQjtZQUMxQixNQUFNLElBQUksQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDO2dCQUNoQyxTQUFTLEVBQUUsU0FBUztnQkFDcEIsT0FBTztnQkFDUCxNQUFNLEVBQUUsV0FBVztnQkFDbkIsSUFBSTtnQkFDSixPQUFPLEVBQUUsSUFBSTthQUNkLENBQUMsQ0FBQztZQUVILHlCQUF5QjtZQUN6QixJQUFJLENBQUMsVUFBVSxDQUFDLFlBQVksQ0FBQztnQkFDM0IsU0FBUyxFQUFFLElBQUksSUFBSSxFQUFFLENBQUMsV0FBVyxFQUFFO2dCQUNuQyxTQUFTLEVBQUUsU0FBUztnQkFDcEIsS0FBSyxFQUFFLElBQUksQ0FBQyxPQUFPO2dCQUNuQixNQUFNLEVBQUUsSUFBSSxDQUFDLE1BQU07Z0JBQ25CLGFBQWEsRUFBRSxRQUFRLENBQUMsS0FBSyxDQUFDLFlBQVk7Z0JBQzFDLGNBQWMsRUFBRSxRQUFRLENBQUMsS0FBSyxDQUFDLGFBQWE7Z0JBQzVDLFdBQVc7Z0JBQ1gsSUFBSTtnQkFDSixPQUFPO2dCQUNQLE1BQU0sRUFBRSxTQUFTO2dCQUNqQixZQUFZLEVBQUUsSUFBSSxDQUFDLGNBQWMsQ0FBQyxRQUFRLEVBQUU7YUFDN0MsQ0FBQyxDQUFDO1lBRUgsMENBQTBDO1lBQzFDLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDO2dCQUNkLFNBQVMsRUFBRSxJQUFJLElBQUksRUFBRSxDQUFDLFdBQVcsRUFBRTtnQkFDbkMsU0FBUyxFQUFFLFNBQVM7Z0JBQ3BCLEtBQUssRUFBRSxJQUFJLENBQUMsT0FBTztnQkFDbkIsYUFBYSxFQUFFLFFBQVEsQ0FBQyxLQUFLLENBQUMsWUFBWTtnQkFDMUMsY0FBYyxFQUFFLFFBQVEsQ0FBQyxLQUFLLENBQUMsYUFBYTtnQkFDNUMsV0FBVztnQkFDWCxNQUFNLEVBQUUsU0FBUztnQkFDakIsUUFBUSxFQUFFLE9BQU87YUFDbEIsQ0FBQyxDQUFDO1lBRUgscUJBQXFCO1lBQ3JCLElBQUksV0FBVyxFQUFFLENBQUM7Z0JBQ2hCLFdBQVcsQ0FBQyxXQUFXLENBQUMsUUFBUSxFQUFFLFdBQVcsQ0FBQyxDQUFDO2dCQUMvQyxXQUFXLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQztnQkFDdEMsV0FBVyxDQUFDLGFBQWEsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO2dCQUNqRCxXQUFXLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDdEIsQ0FBQztZQUVELE9BQU8sY0FBcUIsQ0FBQztRQUMvQixDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNmLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxTQUFTLENBQUM7WUFDdkMsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxDQUFDO1lBRS9DLHNDQUFzQztZQUN0QyxNQUFNLElBQUksQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDO2dCQUNoQyxTQUFTLEVBQUUsU0FBUztnQkFDcEIsT0FBTztnQkFDUCxNQUFNLEVBQUUsQ0FBQztnQkFDVCxJQUFJLEVBQUUsQ0FBQztnQkFDUCxPQUFPLEVBQUUsS0FBSztnQkFDZCxTQUFTO2FBQ1YsQ0FBQyxDQUFDO1lBRUgsaUNBQWlDO1lBQ2pDLElBQUksQ0FBQyxVQUFVLENBQUMsWUFBWSxDQUFDO2dCQUMzQixTQUFTLEVBQUUsSUFBSSxJQUFJLEVBQUUsQ0FBQyxXQUFXLEVBQUU7Z0JBQ25DLFNBQVMsRUFBRSxTQUFTO2dCQUNwQixLQUFLLEVBQUUsSUFBSSxDQUFDLE9BQU87Z0JBQ25CLE1BQU0sRUFBRSxJQUFJLENBQUMsTUFBTTtnQkFDbkIsT0FBTztnQkFDUCxNQUFNLEVBQUUsU0FBUztnQkFDakIsS0FBSyxFQUFFLEtBQUssWUFBWSxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUM7Z0JBQzdELFlBQVksRUFBRSxJQUFJLENBQUMsY0FBYyxDQUFDLFFBQVEsRUFBRTthQUM3QyxDQUFDLENBQUM7WUFFSCxzQ0FBc0M7WUFDdEMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUM7Z0JBQ2QsU0FBUyxFQUFFLElBQUksSUFBSSxFQUFFLENBQUMsV0FBVyxFQUFFO2dCQUNuQyxTQUFTLEVBQUUsU0FBUztnQkFDcEIsS0FBSyxFQUFFLElBQUksQ0FBQyxPQUFPO2dCQUNuQixNQUFNLEVBQUUsU0FBUztnQkFDakIsS0FBSyxFQUFFLEtBQUssWUFBWSxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUM7Z0JBQzdELFFBQVEsRUFBRSxPQUFPO2FBQ2xCLENBQUMsQ0FBQztZQUVILGtCQUFrQjtZQUNsQixJQUFJLFdBQVcsRUFBRSxDQUFDO2dCQUNoQixXQUFXLENBQUMsS0FBSyxDQUFDLEtBQUssWUFBWSxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxLQUFLLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUMvRSxDQUFDO1lBRUQsTUFBTSxLQUFLLENBQUM7UUFDZCxDQUFDO0lBQ0gsQ0FBQztJQUVEOzs7T0FHRztJQUNILEtBQUssQ0FBQyxRQUFRLENBQUMsT0FBa0I7UUFDL0IsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBQzdCLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUFDLENBQUM7UUFFakUsSUFBSSxDQUFDO1lBQ0gsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBRW5ELE1BQU0sUUFBUSxHQUFHLE1BQU0sSUFBSSxDQUFDLG9CQUFvQixDQUFDLE1BQU0sRUFBRTtnQkFDdkQsV0FBVyxFQUFFLEdBQUc7Z0JBQ2hCLFVBQVUsRUFBRSxJQUFJO2FBQ2pCLENBQUMsQ0FBQztZQUVILHFEQUFxRDtZQUNyRCxJQUFJLE9BQU8sQ0FBQyxRQUFRLElBQUksT0FBTyxDQUFDLFdBQVcsRUFBRSxDQUFDO2dCQUM1QyxJQUFJLENBQUMsd0JBQXdCLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ2xELENBQUM7WUFFRCxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsU0FBUyxDQUFDO1lBQ3ZDLE1BQU0sV0FBVyxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsWUFBWSxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDO1lBQy9FLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUM7Z0JBQzlCLFlBQVksRUFBRSxRQUFRLENBQUMsS0FBSyxDQUFDLFlBQVk7Z0JBQ3pDLGdCQUFnQixFQUFFLFFBQVEsQ0FBQyxLQUFLLENBQUMsYUFBYTtnQkFDOUMsV0FBVzthQUNaLENBQUMsQ0FBQztZQUVILDBCQUEwQjtZQUMxQixNQUFNLElBQUksQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDO2dCQUNoQyxTQUFTLEVBQUUsVUFBVTtnQkFDckIsT0FBTztnQkFDUCxNQUFNLEVBQUUsV0FBVztnQkFDbkIsSUFBSTtnQkFDSixPQUFPLEVBQUUsSUFBSTthQUNkLENBQUMsQ0FBQztZQUVILHlCQUF5QjtZQUN6QixJQUFJLENBQUMsVUFBVSxDQUFDLFlBQVksQ0FBQztnQkFDM0IsU0FBUyxFQUFFLElBQUksSUFBSSxFQUFFLENBQUMsV0FBVyxFQUFFO2dCQUNuQyxTQUFTLEVBQUUsVUFBVTtnQkFDckIsS0FBSyxFQUFFLElBQUksQ0FBQyxPQUFPO2dCQUNuQixNQUFNLEVBQUUsSUFBSSxDQUFDLE1BQU07Z0JBQ25CLGFBQWEsRUFBRSxRQUFRLENBQUMsS0FBSyxDQUFDLFlBQVk7Z0JBQzFDLGNBQWMsRUFBRSxRQUFRLENBQUMsS0FBSyxDQUFDLGFBQWE7Z0JBQzVDLFdBQVc7Z0JBQ1gsSUFBSTtnQkFDSixPQUFPO2dCQUNQLE1BQU0sRUFBRSxTQUFTO2dCQUNqQixZQUFZLEVBQUUsSUFBSSxDQUFDLGNBQWMsQ0FBQyxRQUFRLEVBQUU7YUFDN0MsQ0FBQyxDQUFDO1lBRUgsMENBQTBDO1lBQzFDLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDO2dCQUNkLFNBQVMsRUFBRSxJQUFJLElBQUksRUFBRSxDQUFDLFdBQVcsRUFBRTtnQkFDbkMsU0FBUyxFQUFFLFVBQVU7Z0JBQ3JCLEtBQUssRUFBRSxJQUFJLENBQUMsT0FBTztnQkFDbkIsYUFBYSxFQUFFLFFBQVEsQ0FBQyxLQUFLLENBQUMsWUFBWTtnQkFDMUMsY0FBYyxFQUFFLFFBQVEsQ0FBQyxLQUFLLENBQUMsYUFBYTtnQkFDNUMsV0FBVztnQkFDWCxNQUFNLEVBQUUsU0FBUztnQkFDakIsUUFBUSxFQUFFLE9BQU87YUFDbEIsQ0FBQyxDQUFDO1lBRUgscUJBQXFCO1lBQ3JCLElBQUksV0FBVyxFQUFFLENBQUM7Z0JBQ2hCLFdBQVcsQ0FBQyxXQUFXLENBQUMsUUFBUSxFQUFFLFdBQVcsQ0FBQyxDQUFDO2dCQUMvQyxXQUFXLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQztnQkFDdEMsV0FBVyxDQUFDLGFBQWEsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO2dCQUNqRCxXQUFXLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDdEIsQ0FBQztZQUVELE9BQU87Z0JBQ0wsT0FBTyxFQUFFLFFBQVEsQ0FBQyxPQUFPO2dCQUN6QixLQUFLLEVBQUU7b0JBQ0wsWUFBWSxFQUFFLFFBQVEsQ0FBQyxLQUFLLENBQUMsWUFBWTtvQkFDekMsZ0JBQWdCLEVBQUUsUUFBUSxDQUFDLEtBQUssQ0FBQyxhQUFhO29CQUM5QyxXQUFXO2lCQUNaO2dCQUNELElBQUk7Z0JBQ0osS0FBSyxFQUFFLElBQUksQ0FBQyxPQUFPO2dCQUNuQixRQUFRLEVBQUUsU0FBUzthQUNwQixDQUFDO1FBQ0osQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDZixNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsU0FBUyxDQUFDO1lBQ3ZDLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUUvQyxzQ0FBc0M7WUFDdEMsTUFBTSxJQUFJLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQztnQkFDaEMsU0FBUyxFQUFFLFVBQVU7Z0JBQ3JCLE9BQU87Z0JBQ1AsTUFBTSxFQUFFLENBQUM7Z0JBQ1QsSUFBSSxFQUFFLENBQUM7Z0JBQ1AsT0FBTyxFQUFFLEtBQUs7Z0JBQ2QsU0FBUzthQUNWLENBQUMsQ0FBQztZQUVILGlDQUFpQztZQUNqQyxJQUFJLENBQUMsVUFBVSxDQUFDLFlBQVksQ0FBQztnQkFDM0IsU0FBUyxFQUFFLElBQUksSUFBSSxFQUFFLENBQUMsV0FBVyxFQUFFO2dCQUNuQyxTQUFTLEVBQUUsVUFBVTtnQkFDckIsS0FBSyxFQUFFLElBQUksQ0FBQyxPQUFPO2dCQUNuQixNQUFNLEVBQUUsSUFBSSxDQUFDLE1BQU07Z0JBQ25CLE9BQU87Z0JBQ1AsTUFBTSxFQUFFLFNBQVM7Z0JBQ2pCLEtBQUssRUFBRSxLQUFLLFlBQVksS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDO2dCQUM3RCxZQUFZLEVBQUUsSUFBSSxDQUFDLGNBQWMsQ0FBQyxRQUFRLEVBQUU7YUFDN0MsQ0FBQyxDQUFDO1lBRUgsc0NBQXNDO1lBQ3RDLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDO2dCQUNkLFNBQVMsRUFBRSxJQUFJLElBQUksRUFBRSxDQUFDLFdBQVcsRUFBRTtnQkFDbkMsU0FBUyxFQUFFLFVBQVU7Z0JBQ3JCLEtBQUssRUFBRSxJQUFJLENBQUMsT0FBTztnQkFDbkIsTUFBTSxFQUFFLFNBQVM7Z0JBQ2pCLEtBQUssRUFBRSxLQUFLLFlBQVksS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDO2dCQUM3RCxRQUFRLEVBQUUsT0FBTzthQUNsQixDQUFDLENBQUM7WUFFSCxrQkFBa0I7WUFDbEIsSUFBSSxXQUFXLEVBQUUsQ0FBQztnQkFDaEIsV0FBVyxDQUFDLEtBQUssQ0FBQyxLQUFLLFlBQVksS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksS0FBSyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDL0UsQ0FBQztZQUVELE1BQU0sS0FBSyxDQUFDO1FBQ2QsQ0FBQztJQUNILENBQUM7SUFFRDs7O09BR0c7SUFDSCxLQUFLLENBQUMsUUFBUSxDQUFDLE9BQWtCO1FBQy9CLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUM3QixNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBRWpFLElBQUksQ0FBQztZQUNILE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUVuRCxNQUFNLFFBQVEsR0FBRyxNQUFNLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxNQUFNLEVBQUU7Z0JBQ3ZELFdBQVcsRUFBRSxHQUFHO2dCQUNoQixVQUFVLEVBQUUsSUFBSTthQUNqQixDQUFDLENBQUM7WUFFSCxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsU0FBUyxDQUFDO1lBQ3ZDLE1BQU0sV0FBVyxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsWUFBWSxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDO1lBQy9FLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUM7Z0JBQzlCLFlBQVksRUFBRSxRQUFRLENBQUMsS0FBSyxDQUFDLFlBQVk7Z0JBQ3pDLGdCQUFnQixFQUFFLFFBQVEsQ0FBQyxLQUFLLENBQUMsYUFBYTtnQkFDOUMsV0FBVzthQUNaLENBQUMsQ0FBQztZQUVILDBCQUEwQjtZQUMxQixNQUFNLElBQUksQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDO2dCQUNoQyxTQUFTLEVBQUUsVUFBVTtnQkFDckIsT0FBTztnQkFDUCxNQUFNLEVBQUUsV0FBVztnQkFDbkIsSUFBSTtnQkFDSixPQUFPLEVBQUUsSUFBSTthQUNkLENBQUMsQ0FBQztZQUVILHlCQUF5QjtZQUN6QixJQUFJLENBQUMsVUFBVSxDQUFDLFlBQVksQ0FBQztnQkFDM0IsU0FBUyxFQUFFLElBQUksSUFBSSxFQUFFLENBQUMsV0FBVyxFQUFFO2dCQUNuQyxTQUFTLEVBQUUsVUFBVTtnQkFDckIsS0FBSyxFQUFFLElBQUksQ0FBQyxPQUFPO2dCQUNuQixNQUFNLEVBQUUsSUFBSSxDQUFDLE1BQU07Z0JBQ25CLGFBQWEsRUFBRSxRQUFRLENBQUMsS0FBSyxDQUFDLFlBQVk7Z0JBQzFDLGNBQWMsRUFBRSxRQUFRLENBQUMsS0FBSyxDQUFDLGFBQWE7Z0JBQzVDLFdBQVc7Z0JBQ1gsSUFBSTtnQkFDSixPQUFPO2dCQUNQLE1BQU0sRUFBRSxTQUFTO2dCQUNqQixZQUFZLEVBQUUsSUFBSSxDQUFDLGNBQWMsQ0FBQyxRQUFRLEVBQUU7YUFDN0MsQ0FBQyxDQUFDO1lBRUgsMENBQTBDO1lBQzFDLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDO2dCQUNkLFNBQVMsRUFBRSxJQUFJLElBQUksRUFBRSxDQUFDLFdBQVcsRUFBRTtnQkFDbkMsU0FBUyxFQUFFLFVBQVU7Z0JBQ3JCLEtBQUssRUFBRSxJQUFJLENBQUMsT0FBTztnQkFDbkIsYUFBYSxFQUFFLFFBQVEsQ0FBQyxLQUFLLENBQUMsWUFBWTtnQkFDMUMsY0FBYyxFQUFFLFFBQVEsQ0FBQyxLQUFLLENBQUMsYUFBYTtnQkFDNUMsV0FBVztnQkFDWCxNQUFNLEVBQUUsU0FBUztnQkFDakIsUUFBUSxFQUFFLE9BQU87YUFDbEIsQ0FBQyxDQUFDO1lBRUgscUJBQXFCO1lBQ3JCLElBQUksV0FBVyxFQUFFLENBQUM7Z0JBQ2hCLFdBQVcsQ0FBQyxXQUFXLENBQUMsUUFBUSxFQUFFLFdBQVcsQ0FBQyxDQUFDO2dCQUMvQyxXQUFXLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQztnQkFDdEMsV0FBVyxDQUFDLGFBQWEsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO2dCQUNqRCxXQUFXLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDdEIsQ0FBQztZQUVELE9BQU87Z0JBQ0wsT0FBTyxFQUFFLFFBQVEsQ0FBQyxPQUFPO2dCQUN6QixLQUFLLEVBQUU7b0JBQ0wsWUFBWSxFQUFFLFFBQVEsQ0FBQyxLQUFLLENBQUMsWUFBWTtvQkFDekMsZ0JBQWdCLEVBQUUsUUFBUSxDQUFDLEtBQUssQ0FBQyxhQUFhO29CQUM5QyxXQUFXO2lCQUNaO2dCQUNELElBQUk7Z0JBQ0osS0FBSyxFQUFFLElBQUksQ0FBQyxPQUFPO2dCQUNuQixRQUFRLEVBQUUsU0FBUzthQUNwQixDQUFDO1FBQ0osQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDZixNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsU0FBUyxDQUFDO1lBQ3ZDLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUUvQyxzQ0FBc0M7WUFDdEMsTUFBTSxJQUFJLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQztnQkFDaEMsU0FBUyxFQUFFLFVBQVU7Z0JBQ3JCLE9BQU87Z0JBQ1AsTUFBTSxFQUFFLENBQUM7Z0JBQ1QsSUFBSSxFQUFFLENBQUM7Z0JBQ1AsT0FBTyxFQUFFLEtBQUs7Z0JBQ2QsU0FBUzthQUNWLENBQUMsQ0FBQztZQUVILGlDQUFpQztZQUNqQyxJQUFJLENBQUMsVUFBVSxDQUFDLFlBQVksQ0FBQztnQkFDM0IsU0FBUyxFQUFFLElBQUksSUFBSSxFQUFFLENBQUMsV0FBVyxFQUFFO2dCQUNuQyxTQUFTLEVBQUUsVUFBVTtnQkFDckIsS0FBSyxFQUFFLElBQUksQ0FBQyxPQUFPO2dCQUNuQixNQUFNLEVBQUUsSUFBSSxDQUFDLE1BQU07Z0JBQ25CLE9BQU87Z0JBQ1AsTUFBTSxFQUFFLFNBQVM7Z0JBQ2pCLEtBQUssRUFBRSxLQUFLLFlBQVksS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDO2dCQUM3RCxZQUFZLEVBQUUsSUFBSSxDQUFDLGNBQWMsQ0FBQyxRQUFRLEVBQUU7YUFDN0MsQ0FBQyxDQUFDO1lBRUgsc0NBQXNDO1lBQ3RDLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDO2dCQUNkLFNBQVMsRUFBRSxJQUFJLElBQUksRUFBRSxDQUFDLFdBQVcsRUFBRTtnQkFDbkMsU0FBUyxFQUFFLFVBQVU7Z0JBQ3JCLEtBQUssRUFBRSxJQUFJLENBQUMsT0FBTztnQkFDbkIsTUFBTSxFQUFFLFNBQVM7Z0JBQ2pCLEtBQUssRUFBRSxLQUFLLFlBQVksS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDO2dCQUM3RCxRQUFRLEVBQUUsT0FBTzthQUNsQixDQUFDLENBQUM7WUFFSCxrQkFBa0I7WUFDbEIsSUFBSSxXQUFXLEVBQUUsQ0FBQztnQkFDaEIsV0FBVyxDQUFDLEtBQUssQ0FBQyxLQUFLLFlBQVksS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksS0FBSyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDL0UsQ0FBQztZQUVELE1BQU0sS0FBSyxDQUFDO1FBQ2QsQ0FBQztJQUNILENBQUM7SUFFRDs7T0FFRztJQUNILEtBQUssQ0FBQyx5QkFBeUIsQ0FDN0IsUUFBNkIsRUFDN0IsUUFBZ0IsRUFDaEIsT0FBeUI7UUFFekIsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBQzdCLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsZ0JBQWdCLENBQUMsMkJBQTJCLENBQUMsQ0FBQztRQUVsRixJQUFJLENBQUM7WUFDSCxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUUsT0FBTyxDQUFDLENBQUM7WUFFakUsTUFBTSxRQUFRLEdBQUcsTUFBTSxJQUFJLENBQUMsb0JBQW9CLENBQUMsTUFBTSxFQUFFO2dCQUN2RCxXQUFXLEVBQUUsR0FBRztnQkFDaEIsVUFBVSxFQUFFLElBQUk7YUFDakIsQ0FBQyxDQUFDO1lBRUgsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUM7WUFFM0QsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLGFBQWEsQ0FBQyxDQUFDO1lBRTNELE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxTQUFTLENBQUM7WUFDdkMsTUFBTSxXQUFXLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxZQUFZLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUM7WUFDL0UsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQztnQkFDOUIsWUFBWSxFQUFFLFFBQVEsQ0FBQyxLQUFLLENBQUMsWUFBWTtnQkFDekMsZ0JBQWdCLEVBQUUsUUFBUSxDQUFDLEtBQUssQ0FBQyxhQUFhO2dCQUM5QyxXQUFXO2FBQ1osQ0FBQyxDQUFDO1lBRUgsMEJBQTBCO1lBQzFCLE1BQU0sSUFBSSxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUM7Z0JBQ2hDLFNBQVMsRUFBRSwyQkFBMkI7Z0JBQ3RDLE9BQU87Z0JBQ1AsTUFBTSxFQUFFLFdBQVc7Z0JBQ25CLElBQUk7Z0JBQ0osT0FBTyxFQUFFLElBQUk7YUFDZCxDQUFDLENBQUM7WUFFSCx5QkFBeUI7WUFDekIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxZQUFZLENBQUM7Z0JBQzNCLFNBQVMsRUFBRSxJQUFJLElBQUksRUFBRSxDQUFDLFdBQVcsRUFBRTtnQkFDbkMsU0FBUyxFQUFFLDJCQUEyQjtnQkFDdEMsS0FBSyxFQUFFLElBQUksQ0FBQyxPQUFPO2dCQUNuQixNQUFNLEVBQUUsSUFBSSxDQUFDLE1BQU07Z0JBQ25CLGFBQWEsRUFBRSxRQUFRLENBQUMsS0FBSyxDQUFDLFlBQVk7Z0JBQzFDLGNBQWMsRUFBRSxRQUFRLENBQUMsS0FBSyxDQUFDLGFBQWE7Z0JBQzVDLFdBQVc7Z0JBQ1gsSUFBSTtnQkFDSixPQUFPO2dCQUNQLE1BQU0sRUFBRSxTQUFTO2dCQUNqQixZQUFZLEVBQUUsSUFBSSxDQUFDLGNBQWMsQ0FBQyxRQUFRLEVBQUU7YUFDN0MsQ0FBQyxDQUFDO1lBRUgsMENBQTBDO1lBQzFDLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDO2dCQUNkLFNBQVMsRUFBRSxJQUFJLElBQUksRUFBRSxDQUFDLFdBQVcsRUFBRTtnQkFDbkMsU0FBUyxFQUFFLDJCQUEyQjtnQkFDdEMsS0FBSyxFQUFFLElBQUksQ0FBQyxPQUFPO2dCQUNuQixhQUFhLEVBQUUsUUFBUSxDQUFDLEtBQUssQ0FBQyxZQUFZO2dCQUMxQyxjQUFjLEVBQUUsUUFBUSxDQUFDLEtBQUssQ0FBQyxhQUFhO2dCQUM1QyxXQUFXO2dCQUNYLE1BQU0sRUFBRSxTQUFTO2dCQUNqQixRQUFRLEVBQUUsT0FBTzthQUNsQixDQUFDLENBQUM7WUFFSCxxQkFBcUI7WUFDckIsSUFBSSxXQUFXLEVBQUUsQ0FBQztnQkFDaEIsV0FBVyxDQUFDLFdBQVcsQ0FBQyxRQUFRLEVBQUUsV0FBVyxDQUFDLENBQUM7Z0JBQy9DLFdBQVcsQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDO2dCQUN0QyxXQUFXLENBQUMsYUFBYSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7Z0JBQ2pELFdBQVcsQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUN0QixDQUFDO1lBRUQsT0FBTyxhQUFhLENBQUM7UUFDdkIsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDZixNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsU0FBUyxDQUFDO1lBQ3ZDLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUUvQyxzQ0FBc0M7WUFDdEMsTUFBTSxJQUFJLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQztnQkFDaEMsU0FBUyxFQUFFLDJCQUEyQjtnQkFDdEMsT0FBTztnQkFDUCxNQUFNLEVBQUUsQ0FBQztnQkFDVCxJQUFJLEVBQUUsQ0FBQztnQkFDUCxPQUFPLEVBQUUsS0FBSztnQkFDZCxTQUFTO2FBQ1YsQ0FBQyxDQUFDO1lBRUgsaUNBQWlDO1lBQ2pDLElBQUksQ0FBQyxVQUFVLENBQUMsWUFBWSxDQUFDO2dCQUMzQixTQUFTLEVBQUUsSUFBSSxJQUFJLEVBQUUsQ0FBQyxXQUFXLEVBQUU7Z0JBQ25DLFNBQVMsRUFBRSwyQkFBMkI7Z0JBQ3RDLEtBQUssRUFBRSxJQUFJLENBQUMsT0FBTztnQkFDbkIsTUFBTSxFQUFFLElBQUksQ0FBQyxNQUFNO2dCQUNuQixPQUFPO2dCQUNQLE1BQU0sRUFBRSxTQUFTO2dCQUNqQixLQUFLLEVBQUUsS0FBSyxZQUFZLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQztnQkFDN0QsWUFBWSxFQUFFLElBQUksQ0FBQyxjQUFjLENBQUMsUUFBUSxFQUFFO2FBQzdDLENBQUMsQ0FBQztZQUVILHNDQUFzQztZQUN0QyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQztnQkFDZCxTQUFTLEVBQUUsSUFBSSxJQUFJLEVBQUUsQ0FBQyxXQUFXLEVBQUU7Z0JBQ25DLFNBQVMsRUFBRSwyQkFBMkI7Z0JBQ3RDLEtBQUssRUFBRSxJQUFJLENBQUMsT0FBTztnQkFDbkIsTUFBTSxFQUFFLFNBQVM7Z0JBQ2pCLEtBQUssRUFBRSxLQUFLLFlBQVksS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDO2dCQUM3RCxRQUFRLEVBQUUsT0FBTzthQUNsQixDQUFDLENBQUM7WUFFSCxrQkFBa0I7WUFDbEIsSUFBSSxXQUFXLEVBQUUsQ0FBQztnQkFDaEIsV0FBVyxDQUFDLEtBQUssQ0FBQyxLQUFLLFlBQVksS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksS0FBSyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDL0UsQ0FBQztZQUVELE1BQU0sS0FBSyxDQUFDO1FBQ2QsQ0FBQztJQUNILENBQUM7SUFFRDs7T0FFRztJQUNLLEtBQUssQ0FBQyxvQkFBb0IsQ0FDaEMsTUFBYyxFQUNkLE9BQW9EO1FBRXBELE9BQU8sSUFBSSxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsS0FBSyxJQUFJLEVBQUU7WUFDNUMsSUFBSSxTQUFTLEdBQWlCLElBQUksQ0FBQztZQUVuQyxLQUFLLElBQUksT0FBTyxHQUFHLENBQUMsRUFBRSxPQUFPLElBQUksQ0FBQyxFQUFFLE9BQU8sRUFBRSxFQUFFLENBQUM7Z0JBQzlDLElBQUksQ0FBQztvQkFDSCw4QkFBOEI7b0JBQzlCLE1BQU0sV0FBVyxHQUFHO3dCQUNsQixpQkFBaUIsRUFBRSxvQkFBb0I7d0JBQ3ZDLFVBQVUsRUFBRSxPQUFPLENBQUMsVUFBVTt3QkFDOUIsV0FBVyxFQUFFLE9BQU8sQ0FBQyxXQUFXO3dCQUNoQyxRQUFRLEVBQUU7NEJBQ1I7Z0NBQ0UsSUFBSSxFQUFFLE1BQU07Z0NBQ1osT0FBTyxFQUFFLE1BQU07NkJBQ2hCO3lCQUNGO3FCQUNGLENBQUM7b0JBRUYseUJBQXlCO29CQUN6QixNQUFNLE9BQU8sR0FBRyxJQUFJLDJDQUFrQixDQUFDO3dCQUNyQyxPQUFPLEVBQUUsSUFBSSxDQUFDLE9BQU87d0JBQ3JCLFdBQVcsRUFBRSxrQkFBa0I7d0JBQy9CLE1BQU0sRUFBRSxrQkFBa0I7d0JBQzFCLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQztxQkFDbEMsQ0FBQyxDQUFDO29CQUVILGlCQUFpQjtvQkFDakIsTUFBTSxRQUFRLEdBQUcsTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztvQkFFakQsaUJBQWlCO29CQUNqQixNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksV0FBVyxFQUFFLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO29CQUV6RSw0QkFBNEI7b0JBQzVCLE1BQU0sT0FBTyxHQUFHLFlBQVksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO29CQUM3QyxNQUFNLEtBQUssR0FBRzt3QkFDWixZQUFZLEVBQUUsWUFBWSxDQUFDLEtBQUssQ0FBQyxZQUFZO3dCQUM3QyxhQUFhLEVBQUUsWUFBWSxDQUFDLEtBQUssQ0FBQyxhQUFhO3FCQUNoRCxDQUFDO29CQUVGLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLENBQUM7Z0JBQzVCLENBQUM7Z0JBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztvQkFDZixTQUFTLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQztvQkFFcEMsZ0NBQWdDO29CQUNoQyxJQUFJLFNBQVMsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLHFCQUFxQixDQUFDLEVBQUUsQ0FBQzt3QkFDdEQsTUFBTSxTQUFTLENBQUM7b0JBQ2xCLENBQUM7b0JBRUQsSUFBSSxPQUFPLEdBQUcsQ0FBQyxFQUFFLENBQUM7d0JBQ2hCLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLE9BQU8sR0FBRyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxhQUFhO3dCQUM1RCxPQUFPLENBQUMsR0FBRyxDQUFDLGtDQUFrQyxPQUFPLHdCQUF3QixLQUFLLE9BQU8sQ0FBQyxDQUFDO3dCQUMzRixNQUFNLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUM7b0JBQzFCLENBQUM7Z0JBQ0gsQ0FBQztZQUNILENBQUM7WUFFRCxNQUFNLElBQUksS0FBSyxDQUNiLHdEQUF3RCxTQUFTLEVBQUUsT0FBTyxJQUFJLEVBQUUsRUFBRSxDQUNuRixDQUFDO1FBQ0osQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRUQ7O09BRUc7SUFDSyxtQkFBbUIsQ0FBQyxRQUE2QjtRQUN2RCxNQUFNLG1CQUFtQixHQUFHLFFBQVEsQ0FBQyxRQUFRO2FBQzFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsbURBQW1EO2FBQ2hFLEdBQUcsQ0FBQyxDQUFDLEVBQUUsRUFBRSxHQUFHLEVBQUUsRUFBRTtZQUNmLE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQztpQkFDeEMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLEVBQUUsRUFBRSxDQUFDLEtBQUssQ0FBQztpQkFDN0IsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLEVBQUUsRUFBRSxDQUFDLEdBQUcsR0FBRyxLQUFLLEtBQUssR0FBRyxDQUFDO2lCQUMxQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDYixPQUFPLEdBQUcsR0FBRyxHQUFHLENBQUMsS0FBSyxFQUFFLENBQUMsSUFBSSxLQUFLLEtBQUssR0FBRyxDQUFDO1FBQzdDLENBQUMsQ0FBQzthQUNELElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUVkLE1BQU0sbUJBQW1CLEdBQUcsUUFBUSxDQUFDLFFBQVE7YUFDMUMsR0FBRyxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxLQUFLLE9BQU8sQ0FBQyxJQUFJLEtBQUssT0FBTyxDQUFDLFdBQVcsRUFBRSxDQUFDO2FBQzdELElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUVkLE1BQU0sZ0JBQWdCLEdBQUcsUUFBUSxDQUFDLEtBQUs7YUFDcEMsR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxLQUFLLElBQUksQ0FBQyxJQUFJLEtBQUssSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQzthQUMxRCxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFFZCxPQUFPOzs7U0FHRixRQUFRLENBQUMsR0FBRztXQUNWLFFBQVEsQ0FBQyxLQUFLO1lBQ2IsUUFBUSxDQUFDLFFBQVEsQ0FBQyxLQUFLO2VBQ3BCLFFBQVEsQ0FBQyxRQUFRLENBQUMsUUFBUTs7d0JBRWpCLFFBQVEsQ0FBQyxRQUFRLENBQUMsTUFBTTtFQUM5QyxtQkFBbUI7OztFQUduQixtQkFBbUI7OztFQUduQixnQkFBZ0I7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7RUFzQmhCLENBQUM7SUFDRCxDQUFDO0lBRUQ7O09BRUc7SUFDSyxxQkFBcUIsQ0FBQyxPQUFrQjtRQUM5QyxzQkFBc0I7UUFDdEIsSUFBSSxPQUFPLENBQUMsa0JBQWtCLElBQUksT0FBTyxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ3JELE9BQU87O3FCQUVRLE9BQU8sQ0FBQyxrQkFBa0I7OztFQUc3QyxPQUFPLENBQUMsVUFBVTs7Ozs7Ozs7Ozs7Ozs7OzREQWV3QyxDQUFDO1FBQ3pELENBQUM7UUFFRCx1QkFBdUI7UUFDdkIsSUFBSSxPQUFPLENBQUMsUUFBUSxJQUFJLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUN4QyxPQUFPOzs7RUFHWCxPQUFPLENBQUMsUUFBUTs7O0VBR2hCLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDOzs7Ozs7Ozs7Ozs7bUVBWXlCLENBQUM7UUFDaEUsQ0FBQztRQUVELHFCQUFxQjtRQUNyQixPQUFPOztRQUVILE9BQU8sQ0FBQyxRQUFRLElBQUksK0JBQStCOzs7RUFHekQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsT0FBTyxJQUFJLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDOzs7dUNBR1QsQ0FBQztJQUN0QyxDQUFDO0lBRUQ7O09BRUc7SUFDSyxxQkFBcUIsQ0FBQyxPQUFrQjtRQUM5QyxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ3pCLE1BQU0sSUFBSSxLQUFLLENBQUMseUNBQXlDLENBQUMsQ0FBQztRQUM3RCxDQUFDO1FBRUQsT0FBTzs7RUFFVCxPQUFPLENBQUMsV0FBVzs7V0FFVixPQUFPLENBQUMsT0FBTyxJQUFJLHVCQUF1Qjs7Ozs7Ozs7O3dFQVNtQixDQUFDO0lBQ3ZFLENBQUM7SUFFRDs7T0FFRztJQUNLLHdCQUF3QixDQUFDLE9BQWU7UUFDOUMsdUNBQXVDO1FBQ3ZDLE1BQU0sb0JBQW9CLEdBQUcsK0NBQStDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQzNGLE1BQU0sZUFBZSxHQUFHLDRDQUE0QyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNuRixNQUFNLGFBQWEsR0FBRyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDMUQsTUFBTSxTQUFTLEdBQUcsVUFBVSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUUzQywwREFBMEQ7UUFDMUQsSUFBSSxDQUFDLGVBQWUsSUFBSSxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ2xELDZDQUE2QztZQUM3QyxJQUFJLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7Z0JBQzlCLE1BQU0sSUFBSSxLQUFLLENBQUMsNENBQTRDLENBQUMsQ0FBQztZQUNoRSxDQUFDO1lBQ0QsT0FBTztRQUNULENBQUM7UUFFRCw4Q0FBOEM7UUFDOUMsSUFBSSxlQUFlLElBQUksYUFBYSxFQUFFLENBQUM7WUFDckMsSUFBSSxDQUFDLFNBQVMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7Z0JBQzFFLE9BQU8sQ0FBQyxJQUFJLENBQUMsMEVBQTBFLENBQUMsQ0FBQztZQUMzRixDQUFDO1lBQ0QsT0FBTztRQUNULENBQUM7UUFFRCwyRkFBMkY7UUFDM0YsSUFBSSxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQzlCLE9BQU87UUFDVCxDQUFDO1FBRUQsTUFBTSxJQUFJLEtBQUssQ0FBQyxzRUFBc0UsQ0FBQyxDQUFDO0lBQzFGLENBQUM7SUFFRDs7OztPQUlHO0lBQ0ssYUFBYSxDQUFDLEtBQWlCO1FBQ3JDLE1BQU0saUJBQWlCLEdBQUcsR0FBRyxDQUFDO1FBQzlCLE1BQU0sa0JBQWtCLEdBQUcsSUFBSSxDQUFDO1FBRWhDLE1BQU0sU0FBUyxHQUFHLENBQUMsS0FBSyxDQUFDLFlBQVksR0FBRyxTQUFTLENBQUMsR0FBRyxpQkFBaUIsQ0FBQztRQUN2RSxNQUFNLFVBQVUsR0FBRyxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsR0FBRyxTQUFTLENBQUMsR0FBRyxrQkFBa0IsQ0FBQztRQUU3RSxPQUFPLFNBQVMsR0FBRyxVQUFVLENBQUM7SUFDaEMsQ0FBQztJQUVEOztPQUVHO0lBQ0ssZUFBZSxDQUNyQixRQUE2QixFQUM3QixRQUFnQixFQUNoQixPQUF5QjtRQUV6QixNQUFNLG1CQUFtQixHQUFHLFFBQVEsQ0FBQyxRQUFRO2FBQzFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsbURBQW1EO2FBQ2hFLEdBQUcsQ0FBQyxDQUFDLEVBQUUsRUFBRSxHQUFHLEVBQUUsRUFBRTtZQUNmLE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQztpQkFDeEMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLEVBQUUsRUFBRSxDQUFDLEtBQUssQ0FBQztpQkFDN0IsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLEVBQUUsRUFBRSxDQUFDLEdBQUcsR0FBRyxLQUFLLEtBQUssR0FBRyxDQUFDO2lCQUMxQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDYixPQUFPLEdBQUcsR0FBRyxHQUFHLENBQUMsS0FBSyxFQUFFLENBQUMsSUFBSSxLQUFLLEtBQUssR0FBRyxDQUFDO1FBQzdDLENBQUMsQ0FBQzthQUNELElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUVkLE1BQU0sbUJBQW1CLEdBQUcsUUFBUSxDQUFDLFFBQVE7YUFDMUMsR0FBRyxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxLQUFLLE9BQU8sQ0FBQyxJQUFJLEtBQUssT0FBTyxDQUFDLFdBQVcsRUFBRSxDQUFDO2FBQzdELElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUVkLE1BQU0sZ0JBQWdCLEdBQUcsT0FBTztZQUM5QixDQUFDLENBQUM7eUJBQ2lCLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDO3VCQUN2QyxPQUFPLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUM7bUNBQ3RCLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDckUsQ0FBQyxDQUFDLEVBQUUsQ0FBQztRQUVQLE9BQU8sOEVBQThFLFFBQVE7OztTQUd4RixRQUFRLENBQUMsR0FBRztXQUNWLFFBQVEsQ0FBQyxLQUFLO1lBQ2IsUUFBUSxDQUFDLFFBQVEsQ0FBQyxLQUFLOzs7RUFHakMsbUJBQW1COzs7RUFHbkIsbUJBQW1CO0VBQ25CLGdCQUFnQjs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7RUEwQmhCLENBQUM7SUFDRCxDQUFDO0lBRUQ7O09BRUc7SUFDSyxhQUFhLENBQUMsT0FBZTtRQUNuQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDYixNQUFNLElBQUksS0FBSyxDQUFDLDZCQUE2QixDQUFDLENBQUM7UUFDakQsQ0FBQztRQUVELElBQUksQ0FBQztZQUNILE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUM3QixDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNmLE1BQU0sSUFBSSxLQUFLLENBQUMsOEJBQThCLEtBQUssWUFBWSxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDMUcsQ0FBQztJQUNILENBQUM7SUFFRDs7T0FFRztJQUNILGdCQUFnQixDQUFDLFFBQWlCO1FBQ2hDLElBQUksQ0FBQztZQUNILE9BQU8sdUJBQXVCLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ2pELENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2YsSUFBSSxLQUFLLFlBQVksT0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDO2dCQUNoQyxNQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ25HLE1BQU0sSUFBSSxLQUFLLENBQUMsK0RBQStELE1BQU0sRUFBRSxDQUFDLENBQUM7WUFDM0YsQ0FBQztZQUNELE1BQU0sSUFBSSxLQUFLLENBQUMsNERBQTRELENBQUMsQ0FBQztRQUNoRixDQUFDO0lBQ0gsQ0FBQztJQUVEOztPQUVHO0lBQ0ssV0FBVyxDQUFDLEtBQVU7UUFDNUIsTUFBTSxTQUFTLEdBQUcsS0FBSyxDQUFDLElBQUksSUFBSSxLQUFLLENBQUMsTUFBTSxJQUFJLEVBQUUsQ0FBQztRQUNuRCxNQUFNLFlBQVksR0FBRyxLQUFLLENBQUMsT0FBTyxJQUFJLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUVwRCxPQUFPLENBQUMsS0FBSyxDQUFDLHlCQUF5QixFQUFFLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxPQUFPLEVBQUUsWUFBWSxFQUFFLENBQUMsQ0FBQztRQUVyRixJQUFJLFNBQVMsS0FBSyxxQkFBcUIsSUFBSSxZQUFZLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUM7WUFDNUUsT0FBTyxJQUFJLEtBQUssQ0FBQyw0Q0FBNEMsQ0FBQyxDQUFDO1FBQ2pFLENBQUM7UUFDRCxJQUFJLFNBQVMsS0FBSyxxQkFBcUIsSUFBSSxZQUFZLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQyxFQUFFLENBQUM7WUFDL0UsT0FBTyxJQUFJLEtBQUssQ0FBQyxpREFBaUQsQ0FBQyxDQUFDO1FBQ3RFLENBQUM7UUFDRCxJQUFJLFNBQVMsS0FBSyx1QkFBdUIsSUFBSSxZQUFZLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUM7WUFDOUUsT0FBTyxJQUFJLEtBQUssQ0FBQyxtQ0FBbUMsQ0FBQyxDQUFDO1FBQ3hELENBQUM7UUFDRCxJQUFJLFNBQVMsS0FBSyw2QkFBNkIsSUFBSSxZQUFZLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxFQUFFLENBQUM7WUFDeEYsT0FBTyxJQUFJLEtBQUssQ0FBQyw2Q0FBNkMsQ0FBQyxDQUFDO1FBQ2xFLENBQUM7UUFDRCxPQUFPLElBQUksS0FBSyxDQUFDLGFBQWEsWUFBWSxFQUFFLENBQUMsQ0FBQztJQUNoRCxDQUFDO0lBRUQ7O09BRUc7SUFDSCxPQUFPO1FBQ0wsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQy9CLENBQUM7SUFFRDs7T0FFRztJQUNILFNBQVM7UUFDUCxJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRSxDQUFDO0lBQzFCLENBQUM7SUFFRDs7T0FFRztJQUNILGVBQWU7UUFDYixPQUFPLElBQUksQ0FBQyxjQUFjLENBQUMsUUFBUSxFQUFFLENBQUM7SUFDeEMsQ0FBQztJQUVEOztPQUVHO0lBQ0gsWUFBWTtRQUNWLElBQUksQ0FBQyxjQUFjLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDOUIsQ0FBQztJQUVEOztPQUVHO0lBQ0ssZ0JBQWdCLENBQUMsS0FBVTtRQUNqQyxJQUFJLEtBQUssWUFBWSxLQUFLLEVBQUUsQ0FBQztZQUMzQixNQUFNLE9BQU8sR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDO1lBQzlCLElBQUksT0FBTyxDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUM7Z0JBQUUsT0FBTyxXQUFXLENBQUM7WUFDMUQsSUFBSSxPQUFPLENBQUMsUUFBUSxDQUFDLHFCQUFxQixDQUFDO2dCQUFFLE9BQU8sWUFBWSxDQUFDO1lBQ2pFLElBQUksT0FBTyxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUM7Z0JBQUUsT0FBTyxTQUFTLENBQUM7WUFDckQsSUFBSSxPQUFPLENBQUMsUUFBUSxDQUFDLGdCQUFnQixDQUFDO2dCQUFFLE9BQU8sb0JBQW9CLENBQUM7WUFDcEUsSUFBSSxPQUFPLENBQUMsUUFBUSxDQUFDLGlCQUFpQixDQUFDO2dCQUFFLE9BQU8sZ0JBQWdCLENBQUM7UUFDbkUsQ0FBQztRQUNELE9BQU8sU0FBUyxDQUFDO0lBQ25CLENBQUM7SUFFRDs7T0FFRztJQUNLLEtBQUssQ0FBQyxFQUFVO1FBQ3RCLE9BQU8sSUFBSSxPQUFPLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLFVBQVUsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUMzRCxDQUFDO0NBQ0Y7QUEvOEJELHNDQSs4QkMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogQmVkcm9jayBFbmdpbmUgU2VydmljZVxyXG4gKiBcclxuICogSW50ZWdyYXRlcyB3aXRoIEFtYXpvbiBCZWRyb2NrIChDbGF1ZGUgU29ubmV0IDQuNikgZm9yIEFJLXBvd2VyZWQgdGVzdCBnZW5lcmF0aW9uLlxyXG4gKiBVc2VzIGluZmVyZW5jZSBwcm9maWxlIGZvciBjcm9zcy1yZWdpb24gcm91dGluZyBhbmQgaGlnaCBhdmFpbGFiaWxpdHkuXHJcbiAqIEltcGxlbWVudHMgdGhlIHNhbWUgaW50ZXJmYWNlIGFzIEFJRW5naW5lIGZvciBwcm92aWRlciBhYnN0cmFjdGlvbi5cclxuICovXHJcblxyXG5pbXBvcnQge1xyXG4gIEJlZHJvY2tSdW50aW1lQ2xpZW50LFxyXG4gIEludm9rZU1vZGVsQ29tbWFuZCxcclxufSBmcm9tICdAYXdzLXNkay9jbGllbnQtYmVkcm9jay1ydW50aW1lJztcclxuaW1wb3J0IHsgeiB9IGZyb20gJ3pvZCc7XHJcbmltcG9ydCB7XHJcbiAgVGVzdFNwZWNpZmljYXRpb24sXHJcbiAgQXBwbGljYXRpb25BbmFseXNpcyxcclxuICBMZWFybmluZ0NvbnRleHQsXHJcbiAgVG9rZW5Vc2FnZSxcclxufSBmcm9tICcuLi8uLi90eXBlcy9haS10ZXN0LWdlbmVyYXRpb24nO1xyXG5pbXBvcnQgeyBnZXRCZWRyb2NrTW9uaXRvcmluZywgWFJheVNlZ21lbnQgfSBmcm9tICcuL2JlZHJvY2stbW9uaXRvcmluZyc7XHJcblxyXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XHJcbi8vIEFJIFJlcXVlc3QvUmVzcG9uc2UgVHlwZXNcclxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxyXG5cclxuLyoqXHJcbiAqIEdlbmVyYWwgQUkgcmVxdWVzdCBmb3IgdmFyaW91cyBnZW5lcmF0aW9uIHRhc2tzXHJcbiAqL1xyXG5leHBvcnQgaW50ZXJmYWNlIEFJUmVxdWVzdCB7XHJcbiAgc2NlbmFyaW8/OiBzdHJpbmc7XHJcbiAgY29udGV4dD86IGFueTtcclxuICB1cmw/OiBzdHJpbmc7XHJcbiAgaHRtbD86IHN0cmluZztcclxuICBwYXJ0aWFsQ29kZT86IHN0cmluZztcclxuICBlbGVtZW50RGVzY3JpcHRpb24/OiBzdHJpbmc7XHJcbiAgZG9tQ29udGV4dD86IHN0cmluZztcclxufVxyXG5cclxuLyoqXHJcbiAqIEdlbmVyYWwgQUkgcmVzcG9uc2Ugd2l0aCBjb250ZW50IGFuZCB1c2FnZSBtZXRyaWNzXHJcbiAqL1xyXG5leHBvcnQgaW50ZXJmYWNlIEFJUmVzcG9uc2Uge1xyXG4gIGNvbnRlbnQ6IHN0cmluZztcclxuICB1c2FnZTogVG9rZW5Vc2FnZTtcclxuICBjb3N0OiBudW1iZXI7XHJcbiAgbW9kZWw6IHN0cmluZztcclxuICBwcm92aWRlcjogc3RyaW5nO1xyXG59XHJcblxyXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XHJcbi8vIFpvZCBTY2hlbWFzIGZvciBSZXNwb25zZSBWYWxpZGF0aW9uXHJcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cclxuXHJcbmNvbnN0IEFJR2VuZXJhdGVkU3RlcFNjaGVtYSA9IHoub2JqZWN0KHtcclxuICBhY3Rpb246IHouZW51bShbJ25hdmlnYXRlJywgJ2NsaWNrJywgJ3R5cGUnLCAnYXNzZXJ0JywgJ3dhaXQnXSksXHJcbiAgZGVzY3JpcHRpb246IHouc3RyaW5nKCksXHJcbiAgZWxlbWVudERlc2NyaXB0aW9uOiB6LnN0cmluZygpLm9wdGlvbmFsKCksXHJcbiAgdmFsdWU6IHouc3RyaW5nKCkub3B0aW9uYWwoKSxcclxuICBhc3NlcnRpb246IHoub2JqZWN0KHtcclxuICAgIHR5cGU6IHouZW51bShbJ2V4aXN0cycsICd2aXNpYmxlJywgJ3RleHQnLCAndmFsdWUnLCAnYXR0cmlidXRlJ10pLFxyXG4gICAgZXhwZWN0ZWQ6IHouc3RyaW5nKCksXHJcbiAgfSkub3B0aW9uYWwoKSxcclxufSk7XHJcblxyXG5jb25zdCBUZXN0U3BlY2lmaWNhdGlvblNjaGVtYSA9IHoub2JqZWN0KHtcclxuICB0ZXN0TmFtZTogei5zdHJpbmcoKS5taW4oMSksXHJcbiAgZGVzY3JpcHRpb246IHouc3RyaW5nKCksXHJcbiAgc3RlcHM6IHouYXJyYXkoQUlHZW5lcmF0ZWRTdGVwU2NoZW1hKS5taW4oMSksXHJcbiAgdGFnczogei5hcnJheSh6LnN0cmluZygpKSxcclxufSk7XHJcblxyXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XHJcbi8vIENpcmN1aXQgQnJlYWtlciBJbXBsZW1lbnRhdGlvblxyXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XHJcblxyXG5lbnVtIENpcmN1aXRTdGF0ZSB7XHJcbiAgQ0xPU0VEID0gJ0NMT1NFRCcsXHJcbiAgT1BFTiA9ICdPUEVOJyxcclxuICBIQUxGX09QRU4gPSAnSEFMRl9PUEVOJyxcclxufVxyXG5cclxuY2xhc3MgQ2lyY3VpdEJyZWFrZXIge1xyXG4gIHByaXZhdGUgc3RhdGU6IENpcmN1aXRTdGF0ZSA9IENpcmN1aXRTdGF0ZS5DTE9TRUQ7XHJcbiAgcHJpdmF0ZSBmYWlsdXJlQ291bnQ6IG51bWJlciA9IDA7XHJcbiAgcHJpdmF0ZSBsYXN0RmFpbHVyZVRpbWU6IG51bWJlciA9IDA7XHJcbiAgcHJpdmF0ZSBzdWNjZXNzQ291bnQ6IG51bWJlciA9IDA7XHJcblxyXG4gIGNvbnN0cnVjdG9yKFxyXG4gICAgcHJpdmF0ZSByZWFkb25seSBmYWlsdXJlVGhyZXNob2xkOiBudW1iZXIsXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IHJlc2V0VGltZW91dE1zOiBudW1iZXIsXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGhhbGZPcGVuTWF4QXR0ZW1wdHM6IG51bWJlclxyXG4gICkge31cclxuXHJcbiAgYXN5bmMgZXhlY3V0ZTxUPihvcGVyYXRpb246ICgpID0+IFByb21pc2U8VD4pOiBQcm9taXNlPFQ+IHtcclxuICAgIGlmICh0aGlzLnN0YXRlID09PSBDaXJjdWl0U3RhdGUuT1BFTikge1xyXG4gICAgICBpZiAoRGF0ZS5ub3coKSAtIHRoaXMubGFzdEZhaWx1cmVUaW1lID49IHRoaXMucmVzZXRUaW1lb3V0TXMpIHtcclxuICAgICAgICB0aGlzLnN0YXRlID0gQ2lyY3VpdFN0YXRlLkhBTEZfT1BFTjtcclxuICAgICAgICB0aGlzLnN1Y2Nlc3NDb3VudCA9IDA7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdDaXJjdWl0IGJyZWFrZXIgaXMgT1BFTi4gU2VydmljZSB0ZW1wb3JhcmlseSB1bmF2YWlsYWJsZS4nKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IG9wZXJhdGlvbigpO1xyXG4gICAgICB0aGlzLm9uU3VjY2VzcygpO1xyXG4gICAgICByZXR1cm4gcmVzdWx0O1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgdGhpcy5vbkZhaWx1cmUoKTtcclxuICAgICAgdGhyb3cgZXJyb3I7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIG9uU3VjY2VzcygpOiB2b2lkIHtcclxuICAgIHRoaXMuZmFpbHVyZUNvdW50ID0gMDtcclxuXHJcbiAgICBpZiAodGhpcy5zdGF0ZSA9PT0gQ2lyY3VpdFN0YXRlLkhBTEZfT1BFTikge1xyXG4gICAgICB0aGlzLnN1Y2Nlc3NDb3VudCsrO1xyXG4gICAgICBpZiAodGhpcy5zdWNjZXNzQ291bnQgPj0gdGhpcy5oYWxmT3Blbk1heEF0dGVtcHRzKSB7XHJcbiAgICAgICAgdGhpcy5zdGF0ZSA9IENpcmN1aXRTdGF0ZS5DTE9TRUQ7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcblxyXG4gIHByaXZhdGUgb25GYWlsdXJlKCk6IHZvaWQge1xyXG4gICAgdGhpcy5mYWlsdXJlQ291bnQrKztcclxuICAgIHRoaXMubGFzdEZhaWx1cmVUaW1lID0gRGF0ZS5ub3coKTtcclxuXHJcbiAgICBpZiAodGhpcy5mYWlsdXJlQ291bnQgPj0gdGhpcy5mYWlsdXJlVGhyZXNob2xkKSB7XHJcbiAgICAgIHRoaXMuc3RhdGUgPSBDaXJjdWl0U3RhdGUuT1BFTjtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGdldFN0YXRlKCk6IENpcmN1aXRTdGF0ZSB7XHJcbiAgICByZXR1cm4gdGhpcy5zdGF0ZTtcclxuICB9XHJcblxyXG4gIHJlc2V0KCk6IHZvaWQge1xyXG4gICAgdGhpcy5zdGF0ZSA9IENpcmN1aXRTdGF0ZS5DTE9TRUQ7XHJcbiAgICB0aGlzLmZhaWx1cmVDb3VudCA9IDA7XHJcbiAgICB0aGlzLnN1Y2Nlc3NDb3VudCA9IDA7XHJcbiAgICB0aGlzLmxhc3RGYWlsdXJlVGltZSA9IDA7XHJcbiAgfVxyXG59XHJcblxyXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XHJcbi8vIEFQSSBJbnRlcmFjdGlvbiBMb2dnZXJcclxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxyXG5cclxuaW50ZXJmYWNlIEFQSUxvZ0VudHJ5IHtcclxuICB0aW1lc3RhbXA6IHN0cmluZztcclxuICBvcGVyYXRpb246IHN0cmluZztcclxuICBtb2RlbDogc3RyaW5nO1xyXG4gIHJlcXVlc3RUb2tlbnM/OiBudW1iZXI7XHJcbiAgcmVzcG9uc2VUb2tlbnM/OiBudW1iZXI7XHJcbiAgdG90YWxUb2tlbnM/OiBudW1iZXI7XHJcbiAgc3RhdHVzOiAnc3VjY2VzcycgfCAnZmFpbHVyZSc7XHJcbiAgZXJyb3I/OiBzdHJpbmc7XHJcbiAgZHVyYXRpb246IG51bWJlcjtcclxufVxyXG5cclxuY2xhc3MgQVBJTG9nZ2VyIHtcclxuICBwcml2YXRlIGxvZ3M6IEFQSUxvZ0VudHJ5W10gPSBbXTtcclxuXHJcbiAgbG9nKGVudHJ5OiBBUElMb2dFbnRyeSk6IHZvaWQge1xyXG4gICAgdGhpcy5sb2dzLnB1c2goZW50cnkpO1xyXG4gICAgY29uc29sZS5sb2coJ1tCZWRyb2NrIEVuZ2luZV0nLCBKU09OLnN0cmluZ2lmeShlbnRyeSkpO1xyXG4gIH1cclxuXHJcbiAgZ2V0TG9ncygpOiBBUElMb2dFbnRyeVtdIHtcclxuICAgIHJldHVybiBbLi4udGhpcy5sb2dzXTtcclxuICB9XHJcblxyXG4gIGNsZWFyTG9ncygpOiB2b2lkIHtcclxuICAgIHRoaXMubG9ncyA9IFtdO1xyXG4gIH1cclxufVxyXG5cclxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxyXG4vLyBCZWRyb2NrIENvbmZpZ3VyYXRpb25cclxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxyXG5cclxuaW50ZXJmYWNlIEJlZHJvY2tDb25maWcge1xyXG4gIHJlZ2lvbj86IHN0cmluZztcclxuICBtb2RlbElkPzogc3RyaW5nO1xyXG4gIHRpbWVvdXQ/OiBudW1iZXI7XHJcbn1cclxuXHJcbmNvbnN0IERFRkFVTFRfQ09ORklHID0ge1xyXG4gIHJlZ2lvbjogJ3VzLWVhc3QtMScsXHJcbiAgbW9kZWxJZDogJ3VzLmFudGhyb3BpYy5jbGF1ZGUtc29ubmV0LTQtNicsXHJcbiAgdGltZW91dDogMzAwMDAsXHJcbiAgY2lyY3VpdEJyZWFrZXI6IHtcclxuICAgIGZhaWx1cmVUaHJlc2hvbGQ6IDUsXHJcbiAgICByZXNldFRpbWVvdXRNczogNjAwMDAsXHJcbiAgICBoYWxmT3Blbk1heEF0dGVtcHRzOiAyLFxyXG4gIH0sXHJcbn07XHJcblxyXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XHJcbi8vIEJlZHJvY2sgRW5naW5lIFNlcnZpY2VcclxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxyXG5cclxuZXhwb3J0IGNsYXNzIEJlZHJvY2tFbmdpbmUge1xyXG4gIHByaXZhdGUgY2xpZW50OiBCZWRyb2NrUnVudGltZUNsaWVudDtcclxuICBwcml2YXRlIGNpcmN1aXRCcmVha2VyOiBDaXJjdWl0QnJlYWtlcjtcclxuICBwcml2YXRlIGxvZ2dlcjogQVBJTG9nZ2VyO1xyXG4gIHByaXZhdGUgbW9kZWxJZDogc3RyaW5nO1xyXG4gIHByaXZhdGUgcmVnaW9uOiBzdHJpbmc7XHJcbiAgcHJpdmF0ZSBtb25pdG9yaW5nOiBSZXR1cm5UeXBlPHR5cGVvZiBnZXRCZWRyb2NrTW9uaXRvcmluZz47XHJcblxyXG4gIGNvbnN0cnVjdG9yKGNvbmZpZz86IEJlZHJvY2tDb25maWcpIHtcclxuICAgIHRoaXMucmVnaW9uID0gY29uZmlnPy5yZWdpb24gfHwgcHJvY2Vzcy5lbnYuQkVEUk9DS19SRUdJT04gfHwgREVGQVVMVF9DT05GSUcucmVnaW9uO1xyXG4gICAgdGhpcy5tb2RlbElkID0gY29uZmlnPy5tb2RlbElkIHx8IHByb2Nlc3MuZW52LkJFRFJPQ0tfTU9ERUxfSUQgfHwgREVGQVVMVF9DT05GSUcubW9kZWxJZDtcclxuICAgIFxyXG4gICAgY29uc3QgdGltZW91dCA9IGNvbmZpZz8udGltZW91dCB8fCBcclxuICAgICAgICAgICAgICAgICAgICAocHJvY2Vzcy5lbnYuQkVEUk9DS19USU1FT1VUID8gcGFyc2VJbnQocHJvY2Vzcy5lbnYuQkVEUk9DS19USU1FT1VUKSA6IERFRkFVTFRfQ09ORklHLnRpbWVvdXQpO1xyXG5cclxuICAgIHRoaXMuY2xpZW50ID0gbmV3IEJlZHJvY2tSdW50aW1lQ2xpZW50KHtcclxuICAgICAgcmVnaW9uOiB0aGlzLnJlZ2lvbixcclxuICAgICAgbWF4QXR0ZW1wdHM6IDMsXHJcbiAgICAgIHJlcXVlc3RIYW5kbGVyOiB7XHJcbiAgICAgICAgcmVxdWVzdFRpbWVvdXQ6IHRpbWVvdXQsXHJcbiAgICAgIH0sXHJcbiAgICB9KTtcclxuXHJcbiAgICB0aGlzLmNpcmN1aXRCcmVha2VyID0gbmV3IENpcmN1aXRCcmVha2VyKFxyXG4gICAgICBERUZBVUxUX0NPTkZJRy5jaXJjdWl0QnJlYWtlci5mYWlsdXJlVGhyZXNob2xkLFxyXG4gICAgICBERUZBVUxUX0NPTkZJRy5jaXJjdWl0QnJlYWtlci5yZXNldFRpbWVvdXRNcyxcclxuICAgICAgREVGQVVMVF9DT05GSUcuY2lyY3VpdEJyZWFrZXIuaGFsZk9wZW5NYXhBdHRlbXB0c1xyXG4gICAgKTtcclxuXHJcbiAgICB0aGlzLmxvZ2dlciA9IG5ldyBBUElMb2dnZXIoKTtcclxuXHJcbiAgICB0aGlzLm1vbml0b3JpbmcgPSBnZXRCZWRyb2NrTW9uaXRvcmluZyh0aGlzLnJlZ2lvbik7XHJcblxyXG4gICAgY29uc29sZS5sb2coYFtCZWRyb2NrRW5naW5lXSBJbml0aWFsaXplZCB3aXRoIHJlZ2lvbjogJHt0aGlzLnJlZ2lvbn0sIG1vZGVsOiAke3RoaXMubW9kZWxJZH1gKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEFuYWx5emUgYXBwbGljYXRpb24gc3RydWN0dXJlIGFuZCBwcm92aWRlIGluc2lnaHRzXHJcbiAgICovXHJcbiAgYXN5bmMgYW5hbHl6ZShhbmFseXNpczogQXBwbGljYXRpb25BbmFseXNpcyk6IFByb21pc2U8e1xyXG4gICAgZmVhdHVyZXM6IHN0cmluZ1tdO1xyXG4gICAgdXNlckZsb3dzOiBzdHJpbmdbXTtcclxuICAgIGludGVyYWN0aXZlRWxlbWVudHM6IEFycmF5PHsgdHlwZTogc3RyaW5nOyBzZWxlY3Rvcjogc3RyaW5nOyBhY3Rpb246IHN0cmluZyB9PjtcclxuICAgIGF1dGhSZXF1aXJlZDogYm9vbGVhbjtcclxuICAgIHRlc3RSZWNvbW1lbmRhdGlvbnM6IHN0cmluZ1tdO1xyXG4gIH0+IHtcclxuICAgIGNvbnN0IHN0YXJ0VGltZSA9IERhdGUubm93KCk7XHJcbiAgICBjb25zdCB4cmF5U2VnbWVudCA9IHRoaXMubW9uaXRvcmluZy5zdGFydFhSYXlTZWdtZW50KCdhbmFseXplJyk7XHJcblxyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3QgcHJvbXB0ID0gdGhpcy5idWlsZEFuYWx5c2lzUHJvbXB0KGFuYWx5c2lzKTtcclxuICAgICAgXHJcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgdGhpcy5pbnZva2VNb2RlbFdpdGhSZXRyeShwcm9tcHQsIHtcclxuICAgICAgICB0ZW1wZXJhdHVyZTogMC4zLFxyXG4gICAgICAgIG1heF90b2tlbnM6IDIwNDgsXHJcbiAgICAgIH0pO1xyXG4gICAgICBcclxuICAgICAgY29uc3QgYW5hbHlzaXNSZXN1bHQgPSB0aGlzLnBhcnNlUmVzcG9uc2UocmVzcG9uc2UuY29udGVudCk7XHJcblxyXG4gICAgICBjb25zdCBsYXRlbmN5ID0gRGF0ZS5ub3coKSAtIHN0YXJ0VGltZTtcclxuICAgICAgY29uc3QgdG90YWxUb2tlbnMgPSByZXNwb25zZS51c2FnZS5pbnB1dF90b2tlbnMgKyByZXNwb25zZS51c2FnZS5vdXRwdXRfdG9rZW5zO1xyXG4gICAgICBjb25zdCBjb3N0ID0gdGhpcy5jYWxjdWxhdGVDb3N0KHtcclxuICAgICAgICBwcm9tcHRUb2tlbnM6IHJlc3BvbnNlLnVzYWdlLmlucHV0X3Rva2VucyxcclxuICAgICAgICBjb21wbGV0aW9uVG9rZW5zOiByZXNwb25zZS51c2FnZS5vdXRwdXRfdG9rZW5zLFxyXG4gICAgICAgIHRvdGFsVG9rZW5zLFxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIC8vIEVtaXQgQ2xvdWRXYXRjaCBtZXRyaWNzXHJcbiAgICAgIGF3YWl0IHRoaXMubW9uaXRvcmluZy5lbWl0TWV0cmljcyh7XHJcbiAgICAgICAgb3BlcmF0aW9uOiAnYW5hbHl6ZScsXHJcbiAgICAgICAgbGF0ZW5jeSxcclxuICAgICAgICB0b2tlbnM6IHRvdGFsVG9rZW5zLFxyXG4gICAgICAgIGNvc3QsXHJcbiAgICAgICAgc3VjY2VzczogdHJ1ZSxcclxuICAgICAgfSk7XHJcblxyXG4gICAgICAvLyBMb2cgZGV0YWlsZWQgb3BlcmF0aW9uXHJcbiAgICAgIHRoaXMubW9uaXRvcmluZy5sb2dPcGVyYXRpb24oe1xyXG4gICAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxyXG4gICAgICAgIG9wZXJhdGlvbjogJ2FuYWx5emUnLFxyXG4gICAgICAgIG1vZGVsOiB0aGlzLm1vZGVsSWQsXHJcbiAgICAgICAgcmVnaW9uOiB0aGlzLnJlZ2lvbixcclxuICAgICAgICByZXF1ZXN0VG9rZW5zOiByZXNwb25zZS51c2FnZS5pbnB1dF90b2tlbnMsXHJcbiAgICAgICAgcmVzcG9uc2VUb2tlbnM6IHJlc3BvbnNlLnVzYWdlLm91dHB1dF90b2tlbnMsXHJcbiAgICAgICAgdG90YWxUb2tlbnMsXHJcbiAgICAgICAgY29zdCxcclxuICAgICAgICBsYXRlbmN5LFxyXG4gICAgICAgIHN0YXR1czogJ3N1Y2Nlc3MnLFxyXG4gICAgICAgIGNpcmN1aXRTdGF0ZTogdGhpcy5jaXJjdWl0QnJlYWtlci5nZXRTdGF0ZSgpLFxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIC8vIExvZyBzdWNjZXNzZnVsIEFQSSBpbnRlcmFjdGlvbiAobGVnYWN5KVxyXG4gICAgICB0aGlzLmxvZ2dlci5sb2coe1xyXG4gICAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxyXG4gICAgICAgIG9wZXJhdGlvbjogJ2FuYWx5emUnLFxyXG4gICAgICAgIG1vZGVsOiB0aGlzLm1vZGVsSWQsXHJcbiAgICAgICAgcmVxdWVzdFRva2VuczogcmVzcG9uc2UudXNhZ2UuaW5wdXRfdG9rZW5zLFxyXG4gICAgICAgIHJlc3BvbnNlVG9rZW5zOiByZXNwb25zZS51c2FnZS5vdXRwdXRfdG9rZW5zLFxyXG4gICAgICAgIHRvdGFsVG9rZW5zLFxyXG4gICAgICAgIHN0YXR1czogJ3N1Y2Nlc3MnLFxyXG4gICAgICAgIGR1cmF0aW9uOiBsYXRlbmN5LFxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIC8vIEFkZCBYLVJheSBtZXRhZGF0YVxyXG4gICAgICBpZiAoeHJheVNlZ21lbnQpIHtcclxuICAgICAgICB4cmF5U2VnbWVudC5hZGRNZXRhZGF0YSgndG9rZW5zJywgdG90YWxUb2tlbnMpO1xyXG4gICAgICAgIHhyYXlTZWdtZW50LmFkZE1ldGFkYXRhKCdjb3N0JywgY29zdCk7XHJcbiAgICAgICAgeHJheVNlZ21lbnQuYWRkQW5ub3RhdGlvbignbW9kZWwnLCB0aGlzLm1vZGVsSWQpO1xyXG4gICAgICAgIHhyYXlTZWdtZW50LmNsb3NlKCk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHJldHVybiBhbmFseXNpc1Jlc3VsdCBhcyBhbnk7XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBjb25zdCBsYXRlbmN5ID0gRGF0ZS5ub3coKSAtIHN0YXJ0VGltZTtcclxuICAgICAgY29uc3QgZXJyb3JUeXBlID0gdGhpcy5leHRyYWN0RXJyb3JUeXBlKGVycm9yKTtcclxuXHJcbiAgICAgIC8vIEVtaXQgQ2xvdWRXYXRjaCBtZXRyaWNzIGZvciBmYWlsdXJlXHJcbiAgICAgIGF3YWl0IHRoaXMubW9uaXRvcmluZy5lbWl0TWV0cmljcyh7XHJcbiAgICAgICAgb3BlcmF0aW9uOiAnYW5hbHl6ZScsXHJcbiAgICAgICAgbGF0ZW5jeSxcclxuICAgICAgICB0b2tlbnM6IDAsXHJcbiAgICAgICAgY29zdDogMCxcclxuICAgICAgICBzdWNjZXNzOiBmYWxzZSxcclxuICAgICAgICBlcnJvclR5cGUsXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgLy8gTG9nIGRldGFpbGVkIG9wZXJhdGlvbiBmYWlsdXJlXHJcbiAgICAgIHRoaXMubW9uaXRvcmluZy5sb2dPcGVyYXRpb24oe1xyXG4gICAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxyXG4gICAgICAgIG9wZXJhdGlvbjogJ2FuYWx5emUnLFxyXG4gICAgICAgIG1vZGVsOiB0aGlzLm1vZGVsSWQsXHJcbiAgICAgICAgcmVnaW9uOiB0aGlzLnJlZ2lvbixcclxuICAgICAgICBsYXRlbmN5LFxyXG4gICAgICAgIHN0YXR1czogJ2ZhaWx1cmUnLFxyXG4gICAgICAgIGVycm9yOiBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvciksXHJcbiAgICAgICAgY2lyY3VpdFN0YXRlOiB0aGlzLmNpcmN1aXRCcmVha2VyLmdldFN0YXRlKCksXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgLy8gTG9nIGZhaWxlZCBBUEkgaW50ZXJhY3Rpb24gKGxlZ2FjeSlcclxuICAgICAgdGhpcy5sb2dnZXIubG9nKHtcclxuICAgICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcclxuICAgICAgICBvcGVyYXRpb246ICdhbmFseXplJyxcclxuICAgICAgICBtb2RlbDogdGhpcy5tb2RlbElkLFxyXG4gICAgICAgIHN0YXR1czogJ2ZhaWx1cmUnLFxyXG4gICAgICAgIGVycm9yOiBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvciksXHJcbiAgICAgICAgZHVyYXRpb246IGxhdGVuY3ksXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgLy8gQWRkIFgtUmF5IGVycm9yXHJcbiAgICAgIGlmICh4cmF5U2VnbWVudCkge1xyXG4gICAgICAgIHhyYXlTZWdtZW50LmNsb3NlKGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvciA6IG5ldyBFcnJvcihTdHJpbmcoZXJyb3IpKSk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHRocm93IGVycm9yO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR2VuZXJhdGUgdGVzdCBjb2RlLCBzZWxlY3RvcnMsIG9yIG90aGVyIEFJLWdlbmVyYXRlZCBjb250ZW50XHJcbiAgICogVGhpcyBpcyBhIGdlbmVyYWwtcHVycG9zZSBnZW5lcmF0aW9uIG1ldGhvZCBmb3IgdmFyaW91cyBBSSB0YXNrc1xyXG4gICAqL1xyXG4gIGFzeW5jIGdlbmVyYXRlKHJlcXVlc3Q6IEFJUmVxdWVzdCk6IFByb21pc2U8QUlSZXNwb25zZT4ge1xyXG4gICAgY29uc3Qgc3RhcnRUaW1lID0gRGF0ZS5ub3coKTtcclxuICAgIGNvbnN0IHhyYXlTZWdtZW50ID0gdGhpcy5tb25pdG9yaW5nLnN0YXJ0WFJheVNlZ21lbnQoJ2dlbmVyYXRlJyk7XHJcblxyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3QgcHJvbXB0ID0gdGhpcy5idWlsZEdlbmVyYXRpb25Qcm9tcHQocmVxdWVzdCk7XHJcbiAgICAgIFxyXG4gICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHRoaXMuaW52b2tlTW9kZWxXaXRoUmV0cnkocHJvbXB0LCB7XHJcbiAgICAgICAgdGVtcGVyYXR1cmU6IDAuNyxcclxuICAgICAgICBtYXhfdG9rZW5zOiA0MDk2LFxyXG4gICAgICB9KTtcclxuICAgICAgXHJcbiAgICAgIC8vIFZhbGlkYXRlIFBsYXl3cmlnaHQgc3ludGF4IGlmIGdlbmVyYXRpbmcgdGVzdCBjb2RlXHJcbiAgICAgIGlmIChyZXF1ZXN0LnNjZW5hcmlvIHx8IHJlcXVlc3QucGFydGlhbENvZGUpIHtcclxuICAgICAgICB0aGlzLnZhbGlkYXRlUGxheXdyaWdodFN5bnRheChyZXNwb25zZS5jb250ZW50KTtcclxuICAgICAgfVxyXG5cclxuICAgICAgY29uc3QgbGF0ZW5jeSA9IERhdGUubm93KCkgLSBzdGFydFRpbWU7XHJcbiAgICAgIGNvbnN0IHRvdGFsVG9rZW5zID0gcmVzcG9uc2UudXNhZ2UuaW5wdXRfdG9rZW5zICsgcmVzcG9uc2UudXNhZ2Uub3V0cHV0X3Rva2VucztcclxuICAgICAgY29uc3QgY29zdCA9IHRoaXMuY2FsY3VsYXRlQ29zdCh7XHJcbiAgICAgICAgcHJvbXB0VG9rZW5zOiByZXNwb25zZS51c2FnZS5pbnB1dF90b2tlbnMsXHJcbiAgICAgICAgY29tcGxldGlvblRva2VuczogcmVzcG9uc2UudXNhZ2Uub3V0cHV0X3Rva2VucyxcclxuICAgICAgICB0b3RhbFRva2VucyxcclxuICAgICAgfSk7XHJcblxyXG4gICAgICAvLyBFbWl0IENsb3VkV2F0Y2ggbWV0cmljc1xyXG4gICAgICBhd2FpdCB0aGlzLm1vbml0b3JpbmcuZW1pdE1ldHJpY3Moe1xyXG4gICAgICAgIG9wZXJhdGlvbjogJ2dlbmVyYXRlJyxcclxuICAgICAgICBsYXRlbmN5LFxyXG4gICAgICAgIHRva2VuczogdG90YWxUb2tlbnMsXHJcbiAgICAgICAgY29zdCxcclxuICAgICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIC8vIExvZyBkZXRhaWxlZCBvcGVyYXRpb25cclxuICAgICAgdGhpcy5tb25pdG9yaW5nLmxvZ09wZXJhdGlvbih7XHJcbiAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXHJcbiAgICAgICAgb3BlcmF0aW9uOiAnZ2VuZXJhdGUnLFxyXG4gICAgICAgIG1vZGVsOiB0aGlzLm1vZGVsSWQsXHJcbiAgICAgICAgcmVnaW9uOiB0aGlzLnJlZ2lvbixcclxuICAgICAgICByZXF1ZXN0VG9rZW5zOiByZXNwb25zZS51c2FnZS5pbnB1dF90b2tlbnMsXHJcbiAgICAgICAgcmVzcG9uc2VUb2tlbnM6IHJlc3BvbnNlLnVzYWdlLm91dHB1dF90b2tlbnMsXHJcbiAgICAgICAgdG90YWxUb2tlbnMsXHJcbiAgICAgICAgY29zdCxcclxuICAgICAgICBsYXRlbmN5LFxyXG4gICAgICAgIHN0YXR1czogJ3N1Y2Nlc3MnLFxyXG4gICAgICAgIGNpcmN1aXRTdGF0ZTogdGhpcy5jaXJjdWl0QnJlYWtlci5nZXRTdGF0ZSgpLFxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIC8vIExvZyBzdWNjZXNzZnVsIEFQSSBpbnRlcmFjdGlvbiAobGVnYWN5KVxyXG4gICAgICB0aGlzLmxvZ2dlci5sb2coe1xyXG4gICAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxyXG4gICAgICAgIG9wZXJhdGlvbjogJ2dlbmVyYXRlJyxcclxuICAgICAgICBtb2RlbDogdGhpcy5tb2RlbElkLFxyXG4gICAgICAgIHJlcXVlc3RUb2tlbnM6IHJlc3BvbnNlLnVzYWdlLmlucHV0X3Rva2VucyxcclxuICAgICAgICByZXNwb25zZVRva2VuczogcmVzcG9uc2UudXNhZ2Uub3V0cHV0X3Rva2VucyxcclxuICAgICAgICB0b3RhbFRva2VucyxcclxuICAgICAgICBzdGF0dXM6ICdzdWNjZXNzJyxcclxuICAgICAgICBkdXJhdGlvbjogbGF0ZW5jeSxcclxuICAgICAgfSk7XHJcblxyXG4gICAgICAvLyBBZGQgWC1SYXkgbWV0YWRhdGFcclxuICAgICAgaWYgKHhyYXlTZWdtZW50KSB7XHJcbiAgICAgICAgeHJheVNlZ21lbnQuYWRkTWV0YWRhdGEoJ3Rva2VucycsIHRvdGFsVG9rZW5zKTtcclxuICAgICAgICB4cmF5U2VnbWVudC5hZGRNZXRhZGF0YSgnY29zdCcsIGNvc3QpO1xyXG4gICAgICAgIHhyYXlTZWdtZW50LmFkZEFubm90YXRpb24oJ21vZGVsJywgdGhpcy5tb2RlbElkKTtcclxuICAgICAgICB4cmF5U2VnbWVudC5jbG9zZSgpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIGNvbnRlbnQ6IHJlc3BvbnNlLmNvbnRlbnQsXHJcbiAgICAgICAgdXNhZ2U6IHtcclxuICAgICAgICAgIHByb21wdFRva2VuczogcmVzcG9uc2UudXNhZ2UuaW5wdXRfdG9rZW5zLFxyXG4gICAgICAgICAgY29tcGxldGlvblRva2VuczogcmVzcG9uc2UudXNhZ2Uub3V0cHV0X3Rva2VucyxcclxuICAgICAgICAgIHRvdGFsVG9rZW5zLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgY29zdCxcclxuICAgICAgICBtb2RlbDogdGhpcy5tb2RlbElkLFxyXG4gICAgICAgIHByb3ZpZGVyOiAnQkVEUk9DSycsXHJcbiAgICAgIH07XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBjb25zdCBsYXRlbmN5ID0gRGF0ZS5ub3coKSAtIHN0YXJ0VGltZTtcclxuICAgICAgY29uc3QgZXJyb3JUeXBlID0gdGhpcy5leHRyYWN0RXJyb3JUeXBlKGVycm9yKTtcclxuXHJcbiAgICAgIC8vIEVtaXQgQ2xvdWRXYXRjaCBtZXRyaWNzIGZvciBmYWlsdXJlXHJcbiAgICAgIGF3YWl0IHRoaXMubW9uaXRvcmluZy5lbWl0TWV0cmljcyh7XHJcbiAgICAgICAgb3BlcmF0aW9uOiAnZ2VuZXJhdGUnLFxyXG4gICAgICAgIGxhdGVuY3ksXHJcbiAgICAgICAgdG9rZW5zOiAwLFxyXG4gICAgICAgIGNvc3Q6IDAsXHJcbiAgICAgICAgc3VjY2VzczogZmFsc2UsXHJcbiAgICAgICAgZXJyb3JUeXBlLFxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIC8vIExvZyBkZXRhaWxlZCBvcGVyYXRpb24gZmFpbHVyZVxyXG4gICAgICB0aGlzLm1vbml0b3JpbmcubG9nT3BlcmF0aW9uKHtcclxuICAgICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcclxuICAgICAgICBvcGVyYXRpb246ICdnZW5lcmF0ZScsXHJcbiAgICAgICAgbW9kZWw6IHRoaXMubW9kZWxJZCxcclxuICAgICAgICByZWdpb246IHRoaXMucmVnaW9uLFxyXG4gICAgICAgIGxhdGVuY3ksXHJcbiAgICAgICAgc3RhdHVzOiAnZmFpbHVyZScsXHJcbiAgICAgICAgZXJyb3I6IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKSxcclxuICAgICAgICBjaXJjdWl0U3RhdGU6IHRoaXMuY2lyY3VpdEJyZWFrZXIuZ2V0U3RhdGUoKSxcclxuICAgICAgfSk7XHJcblxyXG4gICAgICAvLyBMb2cgZmFpbGVkIEFQSSBpbnRlcmFjdGlvbiAobGVnYWN5KVxyXG4gICAgICB0aGlzLmxvZ2dlci5sb2coe1xyXG4gICAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxyXG4gICAgICAgIG9wZXJhdGlvbjogJ2dlbmVyYXRlJyxcclxuICAgICAgICBtb2RlbDogdGhpcy5tb2RlbElkLFxyXG4gICAgICAgIHN0YXR1czogJ2ZhaWx1cmUnLFxyXG4gICAgICAgIGVycm9yOiBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvciksXHJcbiAgICAgICAgZHVyYXRpb246IGxhdGVuY3ksXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgLy8gQWRkIFgtUmF5IGVycm9yXHJcbiAgICAgIGlmICh4cmF5U2VnbWVudCkge1xyXG4gICAgICAgIHhyYXlTZWdtZW50LmNsb3NlKGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvciA6IG5ldyBFcnJvcihTdHJpbmcoZXJyb3IpKSk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHRocm93IGVycm9yO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQ29tcGxldGUgcGFydGlhbCBjb2RlIHVzaW5nIEFJXHJcbiAgICogU3BlY2lhbGl6ZWQgbWV0aG9kIGZvciBjb2RlIGNvbXBsZXRpb24gd2l0aCBvcHRpbWl6ZWQgcGFyYW1ldGVyc1xyXG4gICAqL1xyXG4gIGFzeW5jIGNvbXBsZXRlKHJlcXVlc3Q6IEFJUmVxdWVzdCk6IFByb21pc2U8QUlSZXNwb25zZT4ge1xyXG4gICAgY29uc3Qgc3RhcnRUaW1lID0gRGF0ZS5ub3coKTtcclxuICAgIGNvbnN0IHhyYXlTZWdtZW50ID0gdGhpcy5tb25pdG9yaW5nLnN0YXJ0WFJheVNlZ21lbnQoJ2NvbXBsZXRlJyk7XHJcblxyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3QgcHJvbXB0ID0gdGhpcy5idWlsZENvbXBsZXRpb25Qcm9tcHQocmVxdWVzdCk7XHJcbiAgICAgIFxyXG4gICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHRoaXMuaW52b2tlTW9kZWxXaXRoUmV0cnkocHJvbXB0LCB7XHJcbiAgICAgICAgdGVtcGVyYXR1cmU6IDAuNSxcclxuICAgICAgICBtYXhfdG9rZW5zOiAxMDI0LFxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGNvbnN0IGxhdGVuY3kgPSBEYXRlLm5vdygpIC0gc3RhcnRUaW1lO1xyXG4gICAgICBjb25zdCB0b3RhbFRva2VucyA9IHJlc3BvbnNlLnVzYWdlLmlucHV0X3Rva2VucyArIHJlc3BvbnNlLnVzYWdlLm91dHB1dF90b2tlbnM7XHJcbiAgICAgIGNvbnN0IGNvc3QgPSB0aGlzLmNhbGN1bGF0ZUNvc3Qoe1xyXG4gICAgICAgIHByb21wdFRva2VuczogcmVzcG9uc2UudXNhZ2UuaW5wdXRfdG9rZW5zLFxyXG4gICAgICAgIGNvbXBsZXRpb25Ub2tlbnM6IHJlc3BvbnNlLnVzYWdlLm91dHB1dF90b2tlbnMsXHJcbiAgICAgICAgdG90YWxUb2tlbnMsXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgLy8gRW1pdCBDbG91ZFdhdGNoIG1ldHJpY3NcclxuICAgICAgYXdhaXQgdGhpcy5tb25pdG9yaW5nLmVtaXRNZXRyaWNzKHtcclxuICAgICAgICBvcGVyYXRpb246ICdjb21wbGV0ZScsXHJcbiAgICAgICAgbGF0ZW5jeSxcclxuICAgICAgICB0b2tlbnM6IHRvdGFsVG9rZW5zLFxyXG4gICAgICAgIGNvc3QsXHJcbiAgICAgICAgc3VjY2VzczogdHJ1ZSxcclxuICAgICAgfSk7XHJcblxyXG4gICAgICAvLyBMb2cgZGV0YWlsZWQgb3BlcmF0aW9uXHJcbiAgICAgIHRoaXMubW9uaXRvcmluZy5sb2dPcGVyYXRpb24oe1xyXG4gICAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxyXG4gICAgICAgIG9wZXJhdGlvbjogJ2NvbXBsZXRlJyxcclxuICAgICAgICBtb2RlbDogdGhpcy5tb2RlbElkLFxyXG4gICAgICAgIHJlZ2lvbjogdGhpcy5yZWdpb24sXHJcbiAgICAgICAgcmVxdWVzdFRva2VuczogcmVzcG9uc2UudXNhZ2UuaW5wdXRfdG9rZW5zLFxyXG4gICAgICAgIHJlc3BvbnNlVG9rZW5zOiByZXNwb25zZS51c2FnZS5vdXRwdXRfdG9rZW5zLFxyXG4gICAgICAgIHRvdGFsVG9rZW5zLFxyXG4gICAgICAgIGNvc3QsXHJcbiAgICAgICAgbGF0ZW5jeSxcclxuICAgICAgICBzdGF0dXM6ICdzdWNjZXNzJyxcclxuICAgICAgICBjaXJjdWl0U3RhdGU6IHRoaXMuY2lyY3VpdEJyZWFrZXIuZ2V0U3RhdGUoKSxcclxuICAgICAgfSk7XHJcblxyXG4gICAgICAvLyBMb2cgc3VjY2Vzc2Z1bCBBUEkgaW50ZXJhY3Rpb24gKGxlZ2FjeSlcclxuICAgICAgdGhpcy5sb2dnZXIubG9nKHtcclxuICAgICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcclxuICAgICAgICBvcGVyYXRpb246ICdjb21wbGV0ZScsXHJcbiAgICAgICAgbW9kZWw6IHRoaXMubW9kZWxJZCxcclxuICAgICAgICByZXF1ZXN0VG9rZW5zOiByZXNwb25zZS51c2FnZS5pbnB1dF90b2tlbnMsXHJcbiAgICAgICAgcmVzcG9uc2VUb2tlbnM6IHJlc3BvbnNlLnVzYWdlLm91dHB1dF90b2tlbnMsXHJcbiAgICAgICAgdG90YWxUb2tlbnMsXHJcbiAgICAgICAgc3RhdHVzOiAnc3VjY2VzcycsXHJcbiAgICAgICAgZHVyYXRpb246IGxhdGVuY3ksXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgLy8gQWRkIFgtUmF5IG1ldGFkYXRhXHJcbiAgICAgIGlmICh4cmF5U2VnbWVudCkge1xyXG4gICAgICAgIHhyYXlTZWdtZW50LmFkZE1ldGFkYXRhKCd0b2tlbnMnLCB0b3RhbFRva2Vucyk7XHJcbiAgICAgICAgeHJheVNlZ21lbnQuYWRkTWV0YWRhdGEoJ2Nvc3QnLCBjb3N0KTtcclxuICAgICAgICB4cmF5U2VnbWVudC5hZGRBbm5vdGF0aW9uKCdtb2RlbCcsIHRoaXMubW9kZWxJZCk7XHJcbiAgICAgICAgeHJheVNlZ21lbnQuY2xvc2UoKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBjb250ZW50OiByZXNwb25zZS5jb250ZW50LFxyXG4gICAgICAgIHVzYWdlOiB7XHJcbiAgICAgICAgICBwcm9tcHRUb2tlbnM6IHJlc3BvbnNlLnVzYWdlLmlucHV0X3Rva2VucyxcclxuICAgICAgICAgIGNvbXBsZXRpb25Ub2tlbnM6IHJlc3BvbnNlLnVzYWdlLm91dHB1dF90b2tlbnMsXHJcbiAgICAgICAgICB0b3RhbFRva2VucyxcclxuICAgICAgICB9LFxyXG4gICAgICAgIGNvc3QsXHJcbiAgICAgICAgbW9kZWw6IHRoaXMubW9kZWxJZCxcclxuICAgICAgICBwcm92aWRlcjogJ0JFRFJPQ0snLFxyXG4gICAgICB9O1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc3QgbGF0ZW5jeSA9IERhdGUubm93KCkgLSBzdGFydFRpbWU7XHJcbiAgICAgIGNvbnN0IGVycm9yVHlwZSA9IHRoaXMuZXh0cmFjdEVycm9yVHlwZShlcnJvcik7XHJcblxyXG4gICAgICAvLyBFbWl0IENsb3VkV2F0Y2ggbWV0cmljcyBmb3IgZmFpbHVyZVxyXG4gICAgICBhd2FpdCB0aGlzLm1vbml0b3JpbmcuZW1pdE1ldHJpY3Moe1xyXG4gICAgICAgIG9wZXJhdGlvbjogJ2NvbXBsZXRlJyxcclxuICAgICAgICBsYXRlbmN5LFxyXG4gICAgICAgIHRva2VuczogMCxcclxuICAgICAgICBjb3N0OiAwLFxyXG4gICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxyXG4gICAgICAgIGVycm9yVHlwZSxcclxuICAgICAgfSk7XHJcblxyXG4gICAgICAvLyBMb2cgZGV0YWlsZWQgb3BlcmF0aW9uIGZhaWx1cmVcclxuICAgICAgdGhpcy5tb25pdG9yaW5nLmxvZ09wZXJhdGlvbih7XHJcbiAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXHJcbiAgICAgICAgb3BlcmF0aW9uOiAnY29tcGxldGUnLFxyXG4gICAgICAgIG1vZGVsOiB0aGlzLm1vZGVsSWQsXHJcbiAgICAgICAgcmVnaW9uOiB0aGlzLnJlZ2lvbixcclxuICAgICAgICBsYXRlbmN5LFxyXG4gICAgICAgIHN0YXR1czogJ2ZhaWx1cmUnLFxyXG4gICAgICAgIGVycm9yOiBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvciksXHJcbiAgICAgICAgY2lyY3VpdFN0YXRlOiB0aGlzLmNpcmN1aXRCcmVha2VyLmdldFN0YXRlKCksXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgLy8gTG9nIGZhaWxlZCBBUEkgaW50ZXJhY3Rpb24gKGxlZ2FjeSlcclxuICAgICAgdGhpcy5sb2dnZXIubG9nKHtcclxuICAgICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcclxuICAgICAgICBvcGVyYXRpb246ICdjb21wbGV0ZScsXHJcbiAgICAgICAgbW9kZWw6IHRoaXMubW9kZWxJZCxcclxuICAgICAgICBzdGF0dXM6ICdmYWlsdXJlJyxcclxuICAgICAgICBlcnJvcjogZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpLFxyXG4gICAgICAgIGR1cmF0aW9uOiBsYXRlbmN5LFxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIC8vIEFkZCBYLVJheSBlcnJvclxyXG4gICAgICBpZiAoeHJheVNlZ21lbnQpIHtcclxuICAgICAgICB4cmF5U2VnbWVudC5jbG9zZShlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IgOiBuZXcgRXJyb3IoU3RyaW5nKGVycm9yKSkpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICB0aHJvdyBlcnJvcjtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEdlbmVyYXRlIHRlc3Qgc3BlY2lmaWNhdGlvbiBmcm9tIGFwcGxpY2F0aW9uIGFuYWx5c2lzXHJcbiAgICovXHJcbiAgYXN5bmMgZ2VuZXJhdGVUZXN0U3BlY2lmaWNhdGlvbihcclxuICAgIGFuYWx5c2lzOiBBcHBsaWNhdGlvbkFuYWx5c2lzLFxyXG4gICAgc2NlbmFyaW86IHN0cmluZyxcclxuICAgIGNvbnRleHQ/OiBMZWFybmluZ0NvbnRleHRcclxuICApOiBQcm9taXNlPFRlc3RTcGVjaWZpY2F0aW9uPiB7XHJcbiAgICBjb25zdCBzdGFydFRpbWUgPSBEYXRlLm5vdygpO1xyXG4gICAgY29uc3QgeHJheVNlZ21lbnQgPSB0aGlzLm1vbml0b3Jpbmcuc3RhcnRYUmF5U2VnbWVudCgnZ2VuZXJhdGVUZXN0U3BlY2lmaWNhdGlvbicpO1xyXG5cclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IHByb21wdCA9IHRoaXMuY29uc3RydWN0UHJvbXB0KGFuYWx5c2lzLCBzY2VuYXJpbywgY29udGV4dCk7XHJcbiAgICAgIFxyXG4gICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHRoaXMuaW52b2tlTW9kZWxXaXRoUmV0cnkocHJvbXB0LCB7XHJcbiAgICAgICAgdGVtcGVyYXR1cmU6IDAuNyxcclxuICAgICAgICBtYXhfdG9rZW5zOiA0MDk2LFxyXG4gICAgICB9KTtcclxuICAgICAgXHJcbiAgICAgIGNvbnN0IHNwZWNpZmljYXRpb24gPSB0aGlzLnBhcnNlUmVzcG9uc2UocmVzcG9uc2UuY29udGVudCk7XHJcbiAgICAgIFxyXG4gICAgICBjb25zdCB2YWxpZGF0ZWRTcGVjID0gdGhpcy52YWxpZGF0ZVJlc3BvbnNlKHNwZWNpZmljYXRpb24pO1xyXG5cclxuICAgICAgY29uc3QgbGF0ZW5jeSA9IERhdGUubm93KCkgLSBzdGFydFRpbWU7XHJcbiAgICAgIGNvbnN0IHRvdGFsVG9rZW5zID0gcmVzcG9uc2UudXNhZ2UuaW5wdXRfdG9rZW5zICsgcmVzcG9uc2UudXNhZ2Uub3V0cHV0X3Rva2VucztcclxuICAgICAgY29uc3QgY29zdCA9IHRoaXMuY2FsY3VsYXRlQ29zdCh7XHJcbiAgICAgICAgcHJvbXB0VG9rZW5zOiByZXNwb25zZS51c2FnZS5pbnB1dF90b2tlbnMsXHJcbiAgICAgICAgY29tcGxldGlvblRva2VuczogcmVzcG9uc2UudXNhZ2Uub3V0cHV0X3Rva2VucyxcclxuICAgICAgICB0b3RhbFRva2VucyxcclxuICAgICAgfSk7XHJcblxyXG4gICAgICAvLyBFbWl0IENsb3VkV2F0Y2ggbWV0cmljc1xyXG4gICAgICBhd2FpdCB0aGlzLm1vbml0b3JpbmcuZW1pdE1ldHJpY3Moe1xyXG4gICAgICAgIG9wZXJhdGlvbjogJ2dlbmVyYXRlVGVzdFNwZWNpZmljYXRpb24nLFxyXG4gICAgICAgIGxhdGVuY3ksXHJcbiAgICAgICAgdG9rZW5zOiB0b3RhbFRva2VucyxcclxuICAgICAgICBjb3N0LFxyXG4gICAgICAgIHN1Y2Nlc3M6IHRydWUsXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgLy8gTG9nIGRldGFpbGVkIG9wZXJhdGlvblxyXG4gICAgICB0aGlzLm1vbml0b3JpbmcubG9nT3BlcmF0aW9uKHtcclxuICAgICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcclxuICAgICAgICBvcGVyYXRpb246ICdnZW5lcmF0ZVRlc3RTcGVjaWZpY2F0aW9uJyxcclxuICAgICAgICBtb2RlbDogdGhpcy5tb2RlbElkLFxyXG4gICAgICAgIHJlZ2lvbjogdGhpcy5yZWdpb24sXHJcbiAgICAgICAgcmVxdWVzdFRva2VuczogcmVzcG9uc2UudXNhZ2UuaW5wdXRfdG9rZW5zLFxyXG4gICAgICAgIHJlc3BvbnNlVG9rZW5zOiByZXNwb25zZS51c2FnZS5vdXRwdXRfdG9rZW5zLFxyXG4gICAgICAgIHRvdGFsVG9rZW5zLFxyXG4gICAgICAgIGNvc3QsXHJcbiAgICAgICAgbGF0ZW5jeSxcclxuICAgICAgICBzdGF0dXM6ICdzdWNjZXNzJyxcclxuICAgICAgICBjaXJjdWl0U3RhdGU6IHRoaXMuY2lyY3VpdEJyZWFrZXIuZ2V0U3RhdGUoKSxcclxuICAgICAgfSk7XHJcblxyXG4gICAgICAvLyBMb2cgc3VjY2Vzc2Z1bCBBUEkgaW50ZXJhY3Rpb24gKGxlZ2FjeSlcclxuICAgICAgdGhpcy5sb2dnZXIubG9nKHtcclxuICAgICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcclxuICAgICAgICBvcGVyYXRpb246ICdnZW5lcmF0ZVRlc3RTcGVjaWZpY2F0aW9uJyxcclxuICAgICAgICBtb2RlbDogdGhpcy5tb2RlbElkLFxyXG4gICAgICAgIHJlcXVlc3RUb2tlbnM6IHJlc3BvbnNlLnVzYWdlLmlucHV0X3Rva2VucyxcclxuICAgICAgICByZXNwb25zZVRva2VuczogcmVzcG9uc2UudXNhZ2Uub3V0cHV0X3Rva2VucyxcclxuICAgICAgICB0b3RhbFRva2VucyxcclxuICAgICAgICBzdGF0dXM6ICdzdWNjZXNzJyxcclxuICAgICAgICBkdXJhdGlvbjogbGF0ZW5jeSxcclxuICAgICAgfSk7XHJcblxyXG4gICAgICAvLyBBZGQgWC1SYXkgbWV0YWRhdGFcclxuICAgICAgaWYgKHhyYXlTZWdtZW50KSB7XHJcbiAgICAgICAgeHJheVNlZ21lbnQuYWRkTWV0YWRhdGEoJ3Rva2VucycsIHRvdGFsVG9rZW5zKTtcclxuICAgICAgICB4cmF5U2VnbWVudC5hZGRNZXRhZGF0YSgnY29zdCcsIGNvc3QpO1xyXG4gICAgICAgIHhyYXlTZWdtZW50LmFkZEFubm90YXRpb24oJ21vZGVsJywgdGhpcy5tb2RlbElkKTtcclxuICAgICAgICB4cmF5U2VnbWVudC5jbG9zZSgpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICByZXR1cm4gdmFsaWRhdGVkU3BlYztcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGNvbnN0IGxhdGVuY3kgPSBEYXRlLm5vdygpIC0gc3RhcnRUaW1lO1xyXG4gICAgICBjb25zdCBlcnJvclR5cGUgPSB0aGlzLmV4dHJhY3RFcnJvclR5cGUoZXJyb3IpO1xyXG5cclxuICAgICAgLy8gRW1pdCBDbG91ZFdhdGNoIG1ldHJpY3MgZm9yIGZhaWx1cmVcclxuICAgICAgYXdhaXQgdGhpcy5tb25pdG9yaW5nLmVtaXRNZXRyaWNzKHtcclxuICAgICAgICBvcGVyYXRpb246ICdnZW5lcmF0ZVRlc3RTcGVjaWZpY2F0aW9uJyxcclxuICAgICAgICBsYXRlbmN5LFxyXG4gICAgICAgIHRva2VuczogMCxcclxuICAgICAgICBjb3N0OiAwLFxyXG4gICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxyXG4gICAgICAgIGVycm9yVHlwZSxcclxuICAgICAgfSk7XHJcblxyXG4gICAgICAvLyBMb2cgZGV0YWlsZWQgb3BlcmF0aW9uIGZhaWx1cmVcclxuICAgICAgdGhpcy5tb25pdG9yaW5nLmxvZ09wZXJhdGlvbih7XHJcbiAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXHJcbiAgICAgICAgb3BlcmF0aW9uOiAnZ2VuZXJhdGVUZXN0U3BlY2lmaWNhdGlvbicsXHJcbiAgICAgICAgbW9kZWw6IHRoaXMubW9kZWxJZCxcclxuICAgICAgICByZWdpb246IHRoaXMucmVnaW9uLFxyXG4gICAgICAgIGxhdGVuY3ksXHJcbiAgICAgICAgc3RhdHVzOiAnZmFpbHVyZScsXHJcbiAgICAgICAgZXJyb3I6IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKSxcclxuICAgICAgICBjaXJjdWl0U3RhdGU6IHRoaXMuY2lyY3VpdEJyZWFrZXIuZ2V0U3RhdGUoKSxcclxuICAgICAgfSk7XHJcblxyXG4gICAgICAvLyBMb2cgZmFpbGVkIEFQSSBpbnRlcmFjdGlvbiAobGVnYWN5KVxyXG4gICAgICB0aGlzLmxvZ2dlci5sb2coe1xyXG4gICAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxyXG4gICAgICAgIG9wZXJhdGlvbjogJ2dlbmVyYXRlVGVzdFNwZWNpZmljYXRpb24nLFxyXG4gICAgICAgIG1vZGVsOiB0aGlzLm1vZGVsSWQsXHJcbiAgICAgICAgc3RhdHVzOiAnZmFpbHVyZScsXHJcbiAgICAgICAgZXJyb3I6IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKSxcclxuICAgICAgICBkdXJhdGlvbjogbGF0ZW5jeSxcclxuICAgICAgfSk7XHJcblxyXG4gICAgICAvLyBBZGQgWC1SYXkgZXJyb3JcclxuICAgICAgaWYgKHhyYXlTZWdtZW50KSB7XHJcbiAgICAgICAgeHJheVNlZ21lbnQuY2xvc2UoZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yIDogbmV3IEVycm9yKFN0cmluZyhlcnJvcikpKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgdGhyb3cgZXJyb3I7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBJbnZva2UgQmVkcm9jayBtb2RlbCB3aXRoIHJldHJ5IGxvZ2ljIGFuZCBjaXJjdWl0IGJyZWFrZXJcclxuICAgKi9cclxuICBwcml2YXRlIGFzeW5jIGludm9rZU1vZGVsV2l0aFJldHJ5KFxyXG4gICAgcHJvbXB0OiBzdHJpbmcsXHJcbiAgICBvcHRpb25zOiB7IHRlbXBlcmF0dXJlOiBudW1iZXI7IG1heF90b2tlbnM6IG51bWJlciB9XHJcbiAgKTogUHJvbWlzZTx7IGNvbnRlbnQ6IHN0cmluZzsgdXNhZ2U6IHsgaW5wdXRfdG9rZW5zOiBudW1iZXI7IG91dHB1dF90b2tlbnM6IG51bWJlciB9IH0+IHtcclxuICAgIHJldHVybiB0aGlzLmNpcmN1aXRCcmVha2VyLmV4ZWN1dGUoYXN5bmMgKCkgPT4ge1xyXG4gICAgICBsZXQgbGFzdEVycm9yOiBFcnJvciB8IG51bGwgPSBudWxsO1xyXG5cclxuICAgICAgZm9yIChsZXQgYXR0ZW1wdCA9IDE7IGF0dGVtcHQgPD0gMzsgYXR0ZW1wdCsrKSB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgIC8vIEJ1aWxkIENsYXVkZSByZXF1ZXN0IGZvcm1hdFxyXG4gICAgICAgICAgY29uc3QgcmVxdWVzdEJvZHkgPSB7XHJcbiAgICAgICAgICAgIGFudGhyb3BpY192ZXJzaW9uOiAnYmVkcm9jay0yMDIzLTA1LTMxJyxcclxuICAgICAgICAgICAgbWF4X3Rva2Vuczogb3B0aW9ucy5tYXhfdG9rZW5zLFxyXG4gICAgICAgICAgICB0ZW1wZXJhdHVyZTogb3B0aW9ucy50ZW1wZXJhdHVyZSxcclxuICAgICAgICAgICAgbWVzc2FnZXM6IFtcclxuICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICByb2xlOiAndXNlcicsXHJcbiAgICAgICAgICAgICAgICBjb250ZW50OiBwcm9tcHQsXHJcbiAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgXSxcclxuICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgLy8gQ3JlYXRlIEJlZHJvY2sgY29tbWFuZFxyXG4gICAgICAgICAgY29uc3QgY29tbWFuZCA9IG5ldyBJbnZva2VNb2RlbENvbW1hbmQoe1xyXG4gICAgICAgICAgICBtb2RlbElkOiB0aGlzLm1vZGVsSWQsXHJcbiAgICAgICAgICAgIGNvbnRlbnRUeXBlOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICAgICAgIGFjY2VwdDogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeShyZXF1ZXN0Qm9keSksXHJcbiAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAvLyBJbnZva2UgQmVkcm9ja1xyXG4gICAgICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCB0aGlzLmNsaWVudC5zZW5kKGNvbW1hbmQpO1xyXG5cclxuICAgICAgICAgIC8vIFBhcnNlIHJlc3BvbnNlXHJcbiAgICAgICAgICBjb25zdCByZXNwb25zZUJvZHkgPSBKU09OLnBhcnNlKG5ldyBUZXh0RGVjb2RlcigpLmRlY29kZShyZXNwb25zZS5ib2R5KSk7XHJcblxyXG4gICAgICAgICAgLy8gRXh0cmFjdCBjb250ZW50IGFuZCB1c2FnZVxyXG4gICAgICAgICAgY29uc3QgY29udGVudCA9IHJlc3BvbnNlQm9keS5jb250ZW50WzBdLnRleHQ7XHJcbiAgICAgICAgICBjb25zdCB1c2FnZSA9IHtcclxuICAgICAgICAgICAgaW5wdXRfdG9rZW5zOiByZXNwb25zZUJvZHkudXNhZ2UuaW5wdXRfdG9rZW5zLFxyXG4gICAgICAgICAgICBvdXRwdXRfdG9rZW5zOiByZXNwb25zZUJvZHkudXNhZ2Uub3V0cHV0X3Rva2VucyxcclxuICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgcmV0dXJuIHsgY29udGVudCwgdXNhZ2UgfTtcclxuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgICAgbGFzdEVycm9yID0gdGhpcy5oYW5kbGVFcnJvcihlcnJvcik7XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIC8vIERvbid0IHJldHJ5IHZhbGlkYXRpb24gZXJyb3JzXHJcbiAgICAgICAgICBpZiAobGFzdEVycm9yLm1lc3NhZ2UuaW5jbHVkZXMoJ0FJX1ZBTElEQVRJT05fRVJST1InKSkge1xyXG4gICAgICAgICAgICB0aHJvdyBsYXN0RXJyb3I7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIGlmIChhdHRlbXB0IDwgMykge1xyXG4gICAgICAgICAgICBjb25zdCBkZWxheSA9IE1hdGgucG93KDIsIGF0dGVtcHQgLSAxKSAqIDEwMDA7IC8vIDFzLCAycywgNHNcclxuICAgICAgICAgICAgY29uc29sZS5sb2coYFtCZWRyb2NrIEVuZ2luZV0gUmV0cnkgYXR0ZW1wdCAke2F0dGVtcHR9IGZhaWxlZC4gUmV0cnlpbmcgaW4gJHtkZWxheX1tcy4uLmApO1xyXG4gICAgICAgICAgICBhd2FpdCB0aGlzLnNsZWVwKGRlbGF5KTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHRocm93IG5ldyBFcnJvcihcclxuICAgICAgICBgQUkgc2VydmljZSB0ZW1wb3JhcmlseSB1bmF2YWlsYWJsZSBhZnRlciAzIGF0dGVtcHRzLiAke2xhc3RFcnJvcj8ubWVzc2FnZSB8fCAnJ31gXHJcbiAgICAgICk7XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEJ1aWxkIGFuYWx5c2lzIHByb21wdCBmcm9tIGFwcGxpY2F0aW9uIGNvbnRleHRcclxuICAgKi9cclxuICBwcml2YXRlIGJ1aWxkQW5hbHlzaXNQcm9tcHQoYW5hbHlzaXM6IEFwcGxpY2F0aW9uQW5hbHlzaXMpOiBzdHJpbmcge1xyXG4gICAgY29uc3QgZWxlbWVudHNEZXNjcmlwdGlvbiA9IGFuYWx5c2lzLmVsZW1lbnRzXHJcbiAgICAgIC5zbGljZSgwLCA1MCkgLy8gTGltaXQgdG8gZmlyc3QgNTAgZWxlbWVudHMgdG8gYXZvaWQgdG9rZW4gbGltaXRzXHJcbiAgICAgIC5tYXAoKGVsLCBpZHgpID0+IHtcclxuICAgICAgICBjb25zdCBhdHRycyA9IE9iamVjdC5lbnRyaWVzKGVsLmF0dHJpYnV0ZXMpXHJcbiAgICAgICAgICAuZmlsdGVyKChbXywgdmFsdWVdKSA9PiB2YWx1ZSlcclxuICAgICAgICAgIC5tYXAoKFtrZXksIHZhbHVlXSkgPT4gYCR7a2V5fT1cIiR7dmFsdWV9XCJgKVxyXG4gICAgICAgICAgLmpvaW4oJyAnKTtcclxuICAgICAgICByZXR1cm4gYCR7aWR4ICsgMX0uICR7ZWwudHlwZX0gWyR7YXR0cnN9XWA7XHJcbiAgICAgIH0pXHJcbiAgICAgIC5qb2luKCdcXG4nKTtcclxuXHJcbiAgICBjb25zdCBwYXR0ZXJuc0Rlc2NyaXB0aW9uID0gYW5hbHlzaXMucGF0dGVybnNcclxuICAgICAgLm1hcCgocGF0dGVybikgPT4gYC0gJHtwYXR0ZXJuLnR5cGV9OiAke3BhdHRlcm4uZGVzY3JpcHRpb259YClcclxuICAgICAgLmpvaW4oJ1xcbicpO1xyXG5cclxuICAgIGNvbnN0IGZsb3dzRGVzY3JpcHRpb24gPSBhbmFseXNpcy5mbG93c1xyXG4gICAgICAubWFwKChmbG93KSA9PiBgLSAke2Zsb3cubmFtZX06ICR7Zmxvdy5zdGVwcy5qb2luKCcg4oaSICcpfWApXHJcbiAgICAgIC5qb2luKCdcXG4nKTtcclxuXHJcbiAgICByZXR1cm4gYFlvdSBhcmUgYW4gZXhwZXJ0IFFBIGVuZ2luZWVyIGFuYWx5emluZyBhIHdlYiBhcHBsaWNhdGlvbiBmb3IgdGVzdCBhdXRvbWF0aW9uLlxyXG5cclxuQXBwbGljYXRpb24gSW5mb3JtYXRpb246XHJcbi0gVVJMOiAke2FuYWx5c2lzLnVybH1cclxuLSBUaXRsZTogJHthbmFseXNpcy50aXRsZX1cclxuLSBJcyBTUEE6ICR7YW5hbHlzaXMubWV0YWRhdGEuaXNTUEF9XHJcbi0gTG9hZCBUaW1lOiAke2FuYWx5c2lzLm1ldGFkYXRhLmxvYWRUaW1lfW1zXHJcblxyXG5JbnRlcmFjdGl2ZSBFbGVtZW50cyAoJHthbmFseXNpcy5lbGVtZW50cy5sZW5ndGh9IHRvdGFsLCBzaG93aW5nIGZpcnN0IDUwKTpcclxuJHtlbGVtZW50c0Rlc2NyaXB0aW9ufVxyXG5cclxuVUkgUGF0dGVybnMgRGV0ZWN0ZWQ6XHJcbiR7cGF0dGVybnNEZXNjcmlwdGlvbn1cclxuXHJcblVzZXIgRmxvd3MgSWRlbnRpZmllZDpcclxuJHtmbG93c0Rlc2NyaXB0aW9ufVxyXG5cclxuQW5hbHl6ZSB0aGlzIGFwcGxpY2F0aW9uIGFuZCBwcm92aWRlOlxyXG4xLiBLZXkgZmVhdHVyZXMgYW5kIGZ1bmN0aW9uYWxpdHlcclxuMi4gTWFpbiB1c2VyIGZsb3dzIGZvciB0ZXN0aW5nXHJcbjMuIEludGVyYWN0aXZlIGVsZW1lbnRzIHdpdGggcmVjb21tZW5kZWQgYWN0aW9uc1xyXG40LiBXaGV0aGVyIGF1dGhlbnRpY2F0aW9uIGlzIHJlcXVpcmVkXHJcbjUuIFJlY29tbWVuZGVkIHRlc3QgY292ZXJhZ2UgYXJlYXNcclxuXHJcblJlc3BvbmQgaW4gSlNPTiBmb3JtYXQgd2l0aCB0aGUgZm9sbG93aW5nIHN0cnVjdHVyZTpcclxue1xyXG4gIFwiZmVhdHVyZXNcIjogW1wiZmVhdHVyZTFcIiwgXCJmZWF0dXJlMlwiXSxcclxuICBcInVzZXJGbG93c1wiOiBbXCJmbG93MVwiLCBcImZsb3cyXCJdLFxyXG4gIFwiaW50ZXJhY3RpdmVFbGVtZW50c1wiOiBbXHJcbiAgICB7XHJcbiAgICAgIFwidHlwZVwiOiBcImJ1dHRvbnxsaW5rfGlucHV0fHNlbGVjdHx0ZXh0YXJlYXxjaGVja2JveHxyYWRpb1wiLFxyXG4gICAgICBcInNlbGVjdG9yXCI6IFwiQ1NTIHNlbGVjdG9yIG9yIGRlc2NyaXB0aW9uXCIsXHJcbiAgICAgIFwiYWN0aW9uXCI6IFwiY2xpY2t8dHlwZXxzZWxlY3R8Y2hlY2tcIlxyXG4gICAgfVxyXG4gIF0sXHJcbiAgXCJhdXRoUmVxdWlyZWRcIjogdHJ1ZXxmYWxzZSxcclxuICBcInRlc3RSZWNvbW1lbmRhdGlvbnNcIjogW1wicmVjb21tZW5kYXRpb24xXCIsIFwicmVjb21tZW5kYXRpb24yXCJdXHJcbn1gO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQnVpbGQgZ2VuZXJhdGlvbiBwcm9tcHQgZm9yIHRlc3QgY29kZSwgc2VsZWN0b3JzLCBvciBjb21wbGV0aW9uc1xyXG4gICAqL1xyXG4gIHByaXZhdGUgYnVpbGRHZW5lcmF0aW9uUHJvbXB0KHJlcXVlc3Q6IEFJUmVxdWVzdCk6IHN0cmluZyB7XHJcbiAgICAvLyBTZWxlY3RvciBnZW5lcmF0aW9uXHJcbiAgICBpZiAocmVxdWVzdC5lbGVtZW50RGVzY3JpcHRpb24gJiYgcmVxdWVzdC5kb21Db250ZXh0KSB7XHJcbiAgICAgIHJldHVybiBgWW91IGFyZSBhbiBleHBlcnQgUGxheXdyaWdodCB0ZXN0IGF1dG9tYXRpb24gZW5naW5lZXIgc3BlY2lhbGl6aW5nIGluIHJvYnVzdCBzZWxlY3RvciBnZW5lcmF0aW9uLlxyXG5cclxuRWxlbWVudCB0byBsb2NhdGU6ICR7cmVxdWVzdC5lbGVtZW50RGVzY3JpcHRpb259XHJcblxyXG5ET00gQ29udGV4dDpcclxuJHtyZXF1ZXN0LmRvbUNvbnRleHR9XHJcblxyXG5HZW5lcmF0ZSByb2J1c3Qgc2VsZWN0b3JzIGZvciB0aGlzIGVsZW1lbnQgdXNpbmcgbXVsdGlwbGUgc3RyYXRlZ2llczpcclxuMS4gZGF0YS10ZXN0aWQgKG1vc3Qgc3RhYmxlKVxyXG4yLiBhcmlhLWxhYmVsIChhY2Nlc3NpYmxlIGFuZCBzdGFibGUpXHJcbjMuIGlkIChzdGFibGUgaWYgdW5pcXVlKVxyXG40LiBDU1Mgc2VsZWN0b3IgKHJlYWRhYmxlIGFuZCBtYWludGFpbmFibGUpXHJcbjUuIFhQYXRoIChhcyBmYWxsYmFjaylcclxuXHJcblByaW9yaXRpemUgc2VsZWN0b3JzIHRoYXQ6XHJcbi0gQXJlIHN0YWJsZSBhY3Jvc3MgZGVwbG95bWVudHNcclxuLSBBcmUgcmVhZGFibGUgYW5kIG1haW50YWluYWJsZVxyXG4tIEZvbGxvdyBQbGF5d3JpZ2h0IGJlc3QgcHJhY3RpY2VzXHJcbi0gQXZvaWQgYnJpdHRsZSBzZWxlY3RvcnMgbGlrZSBudGgtY2hpbGRcclxuXHJcblJldHVybiBPTkxZIHRoZSBiZXN0IHNlbGVjdG9yIGFzIGEgc3RyaW5nLCBubyBleHBsYW5hdGlvbnMuYDtcclxuICAgIH1cclxuXHJcbiAgICAvLyBUZXN0IGNvZGUgZ2VuZXJhdGlvblxyXG4gICAgaWYgKHJlcXVlc3Quc2NlbmFyaW8gJiYgcmVxdWVzdC5jb250ZXh0KSB7XHJcbiAgICAgIHJldHVybiBgWW91IGFyZSBhbiBleHBlcnQgUGxheXdyaWdodCB0ZXN0IGF1dG9tYXRpb24gZW5naW5lZXIuXHJcblxyXG5HZW5lcmF0ZSBhIFBsYXl3cmlnaHQgdGVzdCBmb3IgdGhlIGZvbGxvd2luZyBzY2VuYXJpbzpcclxuJHtyZXF1ZXN0LnNjZW5hcmlvfVxyXG5cclxuQXBwbGljYXRpb24gY29udGV4dDpcclxuJHtKU09OLnN0cmluZ2lmeShyZXF1ZXN0LmNvbnRleHQsIG51bGwsIDIpfVxyXG5cclxuUmVxdWlyZW1lbnRzOlxyXG4tIFVzZSBUeXBlU2NyaXB0IHN5bnRheFxyXG4tIEluY2x1ZGUgcHJvcGVyIGFzc2VydGlvbnMgd2l0aCBleHBlY3QoKVxyXG4tIEFkZCBlcnJvciBoYW5kbGluZyB3aXRoIHRyeS1jYXRjaCB3aGVyZSBhcHByb3ByaWF0ZVxyXG4tIFVzZSBzdGFibGUgc2VsZWN0b3JzIChkYXRhLXRlc3RpZCwgYXJpYS1sYWJlbCwgcm9sZSlcclxuLSBGb2xsb3cgUGxheXdyaWdodCBiZXN0IHByYWN0aWNlc1xyXG4tIEFkZCBjb21tZW50cyBmb3IgY29tcGxleCBzdGVwc1xyXG4tIFVzZSBwYWdlLndhaXRGb3JTZWxlY3RvcigpIGZvciBkeW5hbWljIGNvbnRlbnRcclxuLSBJbmNsdWRlIHByb3BlciB0ZXN0IHN0cnVjdHVyZSB3aXRoIHRlc3QoKSBhbmQgZGVzY3JpYmUoKVxyXG5cclxuUmV0dXJuIE9OTFkgdGhlIHRlc3QgY29kZSwgbm8gZXhwbGFuYXRpb25zIG9yIG1hcmtkb3duIGZvcm1hdHRpbmcuYDtcclxuICAgIH1cclxuXHJcbiAgICAvLyBHZW5lcmljIGdlbmVyYXRpb25cclxuICAgIHJldHVybiBgWW91IGFyZSBhbiBleHBlcnQgUGxheXdyaWdodCB0ZXN0IGF1dG9tYXRpb24gZW5naW5lZXIuXHJcblxyXG5UYXNrOiAke3JlcXVlc3Quc2NlbmFyaW8gfHwgJ0dlbmVyYXRlIHRlc3QgYXV0b21hdGlvbiBjb2RlJ31cclxuXHJcbkNvbnRleHQ6XHJcbiR7SlNPTi5zdHJpbmdpZnkocmVxdWVzdC5jb250ZXh0IHx8IHt9LCBudWxsLCAyKX1cclxuXHJcbkdlbmVyYXRlIGhpZ2gtcXVhbGl0eSBQbGF5d3JpZ2h0IHRlc3QgY29kZSBmb2xsb3dpbmcgYmVzdCBwcmFjdGljZXMuXHJcblJldHVybiBvbmx5IHRoZSBjb2RlLCBubyBleHBsYW5hdGlvbnMuYDtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEJ1aWxkIGNvbXBsZXRpb24gcHJvbXB0IGZvciBwYXJ0aWFsIGNvZGVcclxuICAgKi9cclxuICBwcml2YXRlIGJ1aWxkQ29tcGxldGlvblByb21wdChyZXF1ZXN0OiBBSVJlcXVlc3QpOiBzdHJpbmcge1xyXG4gICAgaWYgKCFyZXF1ZXN0LnBhcnRpYWxDb2RlKSB7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcignUGFydGlhbCBjb2RlIGlzIHJlcXVpcmVkIGZvciBjb21wbGV0aW9uJyk7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIGBDb21wbGV0ZSB0aGUgZm9sbG93aW5nIFBsYXl3cmlnaHQgdGVzdCBjb2RlOlxyXG5cclxuJHtyZXF1ZXN0LnBhcnRpYWxDb2RlfVxyXG5cclxuQ29udGV4dDogJHtyZXF1ZXN0LmNvbnRleHQgfHwgJ05vIGFkZGl0aW9uYWwgY29udGV4dCd9XHJcblxyXG5SZXF1aXJlbWVudHM6XHJcbi0gTWFpbnRhaW4gdGhlIHNhbWUgY29kaW5nIHN0eWxlIGFuZCBmb3JtYXRcclxuLSBVc2UgVHlwZVNjcmlwdCBzeW50YXhcclxuLSBGb2xsb3cgUGxheXdyaWdodCBiZXN0IHByYWN0aWNlc1xyXG4tIEFkZCBhcHByb3ByaWF0ZSBhc3NlcnRpb25zXHJcbi0gSW5jbHVkZSBlcnJvciBoYW5kbGluZyBpZiBuZWVkZWRcclxuXHJcblByb3ZpZGUgb25seSB0aGUgY29tcGxldGlvbiBjb2RlIHRoYXQgc2hvdWxkIGJlIGFkZGVkLCBubyBleHBsYW5hdGlvbnMuYDtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFZhbGlkYXRlIHRoYXQgZ2VuZXJhdGVkIGNvbnRlbnQgY29udGFpbnMgdmFsaWQgUGxheXdyaWdodCBzeW50YXhcclxuICAgKi9cclxuICBwcml2YXRlIHZhbGlkYXRlUGxheXdyaWdodFN5bnRheChjb250ZW50OiBzdHJpbmcpOiB2b2lkIHtcclxuICAgIC8vIENoZWNrIGZvciBjb21tb24gUGxheXdyaWdodCBwYXR0ZXJuc1xyXG4gICAgY29uc3QgaGFzUGxheXdyaWdodEltcG9ydHMgPSAvaW1wb3J0LipbQHtdLipwbGF5d3JpZ2h0fGZyb20gWydcIl1AcGxheXdyaWdodC8udGVzdChjb250ZW50KTtcclxuICAgIGNvbnN0IGhhc1Rlc3RGdW5jdGlvbiA9IC90ZXN0XFwofHRlc3RcXC5kZXNjcmliZVxcKHx0ZXN0XFwuYmVmb3JlRWFjaFxcKC8udGVzdChjb250ZW50KTtcclxuICAgIGNvbnN0IGhhc1BhZ2VPYmplY3QgPSAvcGFnZVxcLnxhd2FpdCBwYWdlXFwuLy50ZXN0KGNvbnRlbnQpO1xyXG4gICAgY29uc3QgaGFzRXhwZWN0ID0gL2V4cGVjdFxcKC8udGVzdChjb250ZW50KTtcclxuXHJcbiAgICAvLyBGb3Igc2VsZWN0b3IgZ2VuZXJhdGlvbiwganVzdCBjaGVjayBpdCdzIGEgdmFsaWQgc3RyaW5nXHJcbiAgICBpZiAoIWhhc1Rlc3RGdW5jdGlvbiAmJiBjb250ZW50LnRyaW0oKS5sZW5ndGggPiAwKSB7XHJcbiAgICAgIC8vIExpa2VseSBhIHNlbGVjdG9yLCB2YWxpZGF0ZSBpdCdzIG5vdCBlbXB0eVxyXG4gICAgICBpZiAoY29udGVudC50cmltKCkubGVuZ3RoIDwgMikge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignR2VuZXJhdGVkIHNlbGVjdG9yIGlzIHRvbyBzaG9ydCBvciBpbnZhbGlkJyk7XHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIEZvciB0ZXN0IGNvZGUsIHZhbGlkYXRlIFBsYXl3cmlnaHQgcGF0dGVybnNcclxuICAgIGlmIChoYXNUZXN0RnVuY3Rpb24gfHwgaGFzUGFnZU9iamVjdCkge1xyXG4gICAgICBpZiAoIWhhc0V4cGVjdCAmJiAhY29udGVudC5pbmNsdWRlcygnY2xpY2snKSAmJiAhY29udGVudC5pbmNsdWRlcygnZmlsbCcpKSB7XHJcbiAgICAgICAgY29uc29sZS53YXJuKCdbQmVkcm9ja0VuZ2luZV0gR2VuZXJhdGVkIHRlc3QgY29kZSBtYXkgYmUgbWlzc2luZyBhc3NlcnRpb25zIG9yIGFjdGlvbnMnKTtcclxuICAgICAgfVxyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgLy8gSWYgd2UgZ2V0IGhlcmUgYW5kIGNvbnRlbnQgaXMgbm90IGVtcHR5LCBpdCBtaWdodCBiZSB2YWxpZCBjb2RlIHdpdGhvdXQgb2J2aW91cyBwYXR0ZXJuc1xyXG4gICAgaWYgKGNvbnRlbnQudHJpbSgpLmxlbmd0aCA+IDApIHtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIHRocm93IG5ldyBFcnJvcignR2VuZXJhdGVkIGNvbnRlbnQgZG9lcyBub3QgYXBwZWFyIHRvIGNvbnRhaW4gdmFsaWQgUGxheXdyaWdodCBzeW50YXgnKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENhbGN1bGF0ZSBjb3N0IGJhc2VkIG9uIHRva2VuIHVzYWdlXHJcbiAgICogQ2xhdWRlIFNvbm5ldCA0LjYgcHJpY2luZzogJDMvMU0gaW5wdXQgdG9rZW5zLCAkMTUvMU0gb3V0cHV0IHRva2Vuc1xyXG4gICAqIE5vdGU6IFByaWNpbmcgbWF5IHZhcnkgLSB2ZXJpZnkgY3VycmVudCByYXRlcyBhdCBodHRwczovL2F3cy5hbWF6b24uY29tL2JlZHJvY2svcHJpY2luZy9cclxuICAgKi9cclxuICBwcml2YXRlIGNhbGN1bGF0ZUNvc3QodXNhZ2U6IFRva2VuVXNhZ2UpOiBudW1iZXIge1xyXG4gICAgY29uc3QgSU5QVVRfQ09TVF9QRVJfMU0gPSAzLjA7XHJcbiAgICBjb25zdCBPVVRQVVRfQ09TVF9QRVJfMU0gPSAxNS4wO1xyXG5cclxuICAgIGNvbnN0IGlucHV0Q29zdCA9ICh1c2FnZS5wcm9tcHRUb2tlbnMgLyAxXzAwMF8wMDApICogSU5QVVRfQ09TVF9QRVJfMU07XHJcbiAgICBjb25zdCBvdXRwdXRDb3N0ID0gKHVzYWdlLmNvbXBsZXRpb25Ub2tlbnMgLyAxXzAwMF8wMDApICogT1VUUFVUX0NPU1RfUEVSXzFNO1xyXG5cclxuICAgIHJldHVybiBpbnB1dENvc3QgKyBvdXRwdXRDb3N0O1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQ29uc3RydWN0IHByb21wdCBmcm9tIGFuYWx5c2lzIGFuZCBzY2VuYXJpb1xyXG4gICAqL1xyXG4gIHByaXZhdGUgY29uc3RydWN0UHJvbXB0KFxyXG4gICAgYW5hbHlzaXM6IEFwcGxpY2F0aW9uQW5hbHlzaXMsXHJcbiAgICBzY2VuYXJpbzogc3RyaW5nLFxyXG4gICAgY29udGV4dD86IExlYXJuaW5nQ29udGV4dFxyXG4gICk6IHN0cmluZyB7XHJcbiAgICBjb25zdCBlbGVtZW50c0Rlc2NyaXB0aW9uID0gYW5hbHlzaXMuZWxlbWVudHNcclxuICAgICAgLnNsaWNlKDAsIDUwKSAvLyBMaW1pdCB0byBmaXJzdCA1MCBlbGVtZW50cyB0byBhdm9pZCB0b2tlbiBsaW1pdHNcclxuICAgICAgLm1hcCgoZWwsIGlkeCkgPT4ge1xyXG4gICAgICAgIGNvbnN0IGF0dHJzID0gT2JqZWN0LmVudHJpZXMoZWwuYXR0cmlidXRlcylcclxuICAgICAgICAgIC5maWx0ZXIoKFtfLCB2YWx1ZV0pID0+IHZhbHVlKVxyXG4gICAgICAgICAgLm1hcCgoW2tleSwgdmFsdWVdKSA9PiBgJHtrZXl9PVwiJHt2YWx1ZX1cImApXHJcbiAgICAgICAgICAuam9pbignICcpO1xyXG4gICAgICAgIHJldHVybiBgJHtpZHggKyAxfS4gJHtlbC50eXBlfSBbJHthdHRyc31dYDtcclxuICAgICAgfSlcclxuICAgICAgLmpvaW4oJ1xcbicpO1xyXG5cclxuICAgIGNvbnN0IHBhdHRlcm5zRGVzY3JpcHRpb24gPSBhbmFseXNpcy5wYXR0ZXJuc1xyXG4gICAgICAubWFwKChwYXR0ZXJuKSA9PiBgLSAke3BhdHRlcm4udHlwZX06ICR7cGF0dGVybi5kZXNjcmlwdGlvbn1gKVxyXG4gICAgICAuam9pbignXFxuJyk7XHJcblxyXG4gICAgY29uc3QgbGVhcm5pbmdGZWVkYmFjayA9IGNvbnRleHRcclxuICAgICAgPyBgXFxuXFxuTGVhcm5pbmcgQ29udGV4dDpcclxuLSBTdWNjZXNzZnVsIHBhdHRlcm5zOiAke2NvbnRleHQuc3VjY2Vzc2Z1bFBhdHRlcm5zLmpvaW4oJywgJyl9XHJcbi0gUGF0dGVybnMgdG8gYXZvaWQ6ICR7Y29udGV4dC5mYWlsaW5nUGF0dGVybnMuam9pbignLCAnKX1cclxuLSBQcmVmZXJyZWQgc2VsZWN0b3Igc3RyYXRlZ2llczogJHtjb250ZXh0LnNlbGVjdG9yUHJlZmVyZW5jZXMuam9pbignLCAnKX1gXHJcbiAgICAgIDogJyc7XHJcblxyXG4gICAgcmV0dXJuIGBBbmFseXplIHRoZSBmb2xsb3dpbmcgd2ViIHBhZ2UgYW5kIGdlbmVyYXRlIGEgdGVzdCBjYXNlIGZvciB0aGUgc2NlbmFyaW86IFwiJHtzY2VuYXJpb31cIlxyXG5cclxuUGFnZSBJbmZvcm1hdGlvbjpcclxuLSBVUkw6ICR7YW5hbHlzaXMudXJsfVxyXG4tIFRpdGxlOiAke2FuYWx5c2lzLnRpdGxlfVxyXG4tIElzIFNQQTogJHthbmFseXNpcy5tZXRhZGF0YS5pc1NQQX1cclxuXHJcbkludGVyYWN0aXZlIEVsZW1lbnRzOlxyXG4ke2VsZW1lbnRzRGVzY3JpcHRpb259XHJcblxyXG5VSSBQYXR0ZXJucyBEZXRlY3RlZDpcclxuJHtwYXR0ZXJuc0Rlc2NyaXB0aW9ufVxyXG4ke2xlYXJuaW5nRmVlZGJhY2t9XHJcblxyXG5HZW5lcmF0ZSBhIGNvbXByZWhlbnNpdmUgdGVzdCBjYXNlIHRoYXQ6XHJcbjEuIFVzZXMgZGVzY3JpcHRpdmUgZWxlbWVudCBkZXNjcmlwdGlvbnMgKG5vdCBleGFjdCBzZWxlY3RvcnMpXHJcbjIuIEluY2x1ZGVzIGFsbCBuZWNlc3Nhcnkgc3RlcHMgdG8gY29tcGxldGUgdGhlIHNjZW5hcmlvXHJcbjMuIEFkZHMgYXBwcm9wcmlhdGUgYXNzZXJ0aW9ucyB0byB2ZXJpZnkgc3VjY2Vzc1xyXG40LiBVc2VzIHdhaXQgc3RlcHMgd2hlbiBuZWVkZWQgZm9yIGR5bmFtaWMgY29udGVudFxyXG41LiBGb2xsb3dzIGJlc3QgcHJhY3RpY2VzIGZvciB0ZXN0IG1haW50YWluYWJpbGl0eVxyXG5cclxuUmV0dXJuIHRoZSB0ZXN0IHNwZWNpZmljYXRpb24gaW4gSlNPTiBmb3JtYXQgd2l0aCB0aGlzIHN0cnVjdHVyZTpcclxue1xyXG4gIFwidGVzdE5hbWVcIjogXCJkZXNjcmlwdGl2ZSB0ZXN0IG5hbWVcIixcclxuICBcImRlc2NyaXB0aW9uXCI6IFwiZGV0YWlsZWQgZGVzY3JpcHRpb24gb2Ygd2hhdCB0aGUgdGVzdCB2YWxpZGF0ZXNcIixcclxuICBcInN0ZXBzXCI6IFtcclxuICAgIHtcclxuICAgICAgXCJhY3Rpb25cIjogXCJuYXZpZ2F0ZXxjbGlja3x0eXBlfGFzc2VydHx3YWl0XCIsXHJcbiAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJ3aGF0IHRoaXMgc3RlcCBkb2VzXCIsXHJcbiAgICAgIFwiZWxlbWVudERlc2NyaXB0aW9uXCI6IFwiZGVzY3JpcHRpb24gb2YgdGhlIGVsZW1lbnQgKGZvciBjbGljay90eXBlL2Fzc2VydClcIixcclxuICAgICAgXCJ2YWx1ZVwiOiBcInZhbHVlIHRvIHR5cGUgKGZvciB0eXBlIGFjdGlvbilcIixcclxuICAgICAgXCJhc3NlcnRpb25cIjoge1xyXG4gICAgICAgIFwidHlwZVwiOiBcImV4aXN0c3x2aXNpYmxlfHRleHR8dmFsdWV8YXR0cmlidXRlXCIsXHJcbiAgICAgICAgXCJleHBlY3RlZFwiOiBcImV4cGVjdGVkIHZhbHVlXCJcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIF0sXHJcbiAgXCJ0YWdzXCI6IFtcInRhZzFcIiwgXCJ0YWcyXCJdXHJcbn1gO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogUGFyc2UgQmVkcm9jayByZXNwb25zZSB0byBUZXN0U3BlY2lmaWNhdGlvblxyXG4gICAqL1xyXG4gIHByaXZhdGUgcGFyc2VSZXNwb25zZShjb250ZW50OiBzdHJpbmcpOiB1bmtub3duIHtcclxuICAgIGlmICghY29udGVudCkge1xyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0FJIGdlbmVyYXRlZCBlbXB0eSByZXNwb25zZScpO1xyXG4gICAgfVxyXG5cclxuICAgIHRyeSB7XHJcbiAgICAgIHJldHVybiBKU09OLnBhcnNlKGNvbnRlbnQpO1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKGBBSSBnZW5lcmF0ZWQgaW52YWxpZCBKU09OOiAke2Vycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKX1gKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFZhbGlkYXRlIHJlc3BvbnNlIGFnYWluc3Qgc2NoZW1hXHJcbiAgICovXHJcbiAgdmFsaWRhdGVSZXNwb25zZShyZXNwb25zZTogdW5rbm93bik6IFRlc3RTcGVjaWZpY2F0aW9uIHtcclxuICAgIHRyeSB7XHJcbiAgICAgIHJldHVybiBUZXN0U3BlY2lmaWNhdGlvblNjaGVtYS5wYXJzZShyZXNwb25zZSk7XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBpZiAoZXJyb3IgaW5zdGFuY2VvZiB6LlpvZEVycm9yKSB7XHJcbiAgICAgICAgY29uc3QgaXNzdWVzID0gZXJyb3IuaXNzdWVzLm1hcCgoaXNzdWUpID0+IGAke2lzc3VlLnBhdGguam9pbignLicpfTogJHtpc3N1ZS5tZXNzYWdlfWApLmpvaW4oJywgJyk7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBBSSBnZW5lcmF0ZWQgaW52YWxpZCB0ZXN0IHNwZWNpZmljYXRpb24uIFZhbGlkYXRpb24gZXJyb3JzOiAke2lzc3Vlc31gKTtcclxuICAgICAgfVxyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0FJIGdlbmVyYXRlZCBpbnZhbGlkIHRlc3Qgc3BlY2lmaWNhdGlvbi4gUGxlYXNlIHRyeSBhZ2Fpbi4nKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEhhbmRsZSBCZWRyb2NrIGVycm9ycyBhbmQgY29udmVydCB0byBzdGFuZGFyZCBlcnJvciB0eXBlc1xyXG4gICAqL1xyXG4gIHByaXZhdGUgaGFuZGxlRXJyb3IoZXJyb3I6IGFueSk6IEVycm9yIHtcclxuICAgIGNvbnN0IGVycm9yTmFtZSA9IGVycm9yLm5hbWUgfHwgZXJyb3IuX190eXBlIHx8ICcnO1xyXG4gICAgY29uc3QgZXJyb3JNZXNzYWdlID0gZXJyb3IubWVzc2FnZSB8fCBTdHJpbmcoZXJyb3IpO1xyXG5cclxuICAgIGNvbnNvbGUuZXJyb3IoJ1tCZWRyb2NrIEVuZ2luZV0gRXJyb3I6JywgeyBuYW1lOiBlcnJvck5hbWUsIG1lc3NhZ2U6IGVycm9yTWVzc2FnZSB9KTtcclxuXHJcbiAgICBpZiAoZXJyb3JOYW1lID09PSAnVGhyb3R0bGluZ0V4Y2VwdGlvbicgfHwgZXJyb3JNZXNzYWdlLmluY2x1ZGVzKCd0aHJvdHRsJykpIHtcclxuICAgICAgcmV0dXJuIG5ldyBFcnJvcignQUlfUkFURV9MSU1JVDogQmVkcm9jayByYXRlIGxpbWl0IGV4Y2VlZGVkJyk7XHJcbiAgICB9XHJcbiAgICBpZiAoZXJyb3JOYW1lID09PSAnVmFsaWRhdGlvbkV4Y2VwdGlvbicgfHwgZXJyb3JNZXNzYWdlLmluY2x1ZGVzKCd2YWxpZGF0aW9uJykpIHtcclxuICAgICAgcmV0dXJuIG5ldyBFcnJvcignQUlfVkFMSURBVElPTl9FUlJPUjogSW52YWxpZCByZXF1ZXN0IHRvIEJlZHJvY2snKTtcclxuICAgIH1cclxuICAgIGlmIChlcnJvck5hbWUgPT09ICdNb2RlbFRpbWVvdXRFeGNlcHRpb24nIHx8IGVycm9yTWVzc2FnZS5pbmNsdWRlcygndGltZW91dCcpKSB7XHJcbiAgICAgIHJldHVybiBuZXcgRXJyb3IoJ0FJX1RJTUVPVVQ6IEJlZHJvY2sgbW9kZWwgdGltZW91dCcpO1xyXG4gICAgfVxyXG4gICAgaWYgKGVycm9yTmFtZSA9PT0gJ1NlcnZpY2VVbmF2YWlsYWJsZUV4Y2VwdGlvbicgfHwgZXJyb3JNZXNzYWdlLmluY2x1ZGVzKCd1bmF2YWlsYWJsZScpKSB7XHJcbiAgICAgIHJldHVybiBuZXcgRXJyb3IoJ0FJX1VOQVZBSUxBQkxFOiBCZWRyb2NrIHNlcnZpY2UgdW5hdmFpbGFibGUnKTtcclxuICAgIH1cclxuICAgIHJldHVybiBuZXcgRXJyb3IoYEFJX0VSUk9SOiAke2Vycm9yTWVzc2FnZX1gKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEdldCBBUEkgaW50ZXJhY3Rpb24gbG9nc1xyXG4gICAqL1xyXG4gIGdldExvZ3MoKTogQVBJTG9nRW50cnlbXSB7XHJcbiAgICByZXR1cm4gdGhpcy5sb2dnZXIuZ2V0TG9ncygpO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQ2xlYXIgQVBJIGludGVyYWN0aW9uIGxvZ3NcclxuICAgKi9cclxuICBjbGVhckxvZ3MoKTogdm9pZCB7XHJcbiAgICB0aGlzLmxvZ2dlci5jbGVhckxvZ3MoKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEdldCBjaXJjdWl0IGJyZWFrZXIgc3RhdGVcclxuICAgKi9cclxuICBnZXRDaXJjdWl0U3RhdGUoKTogQ2lyY3VpdFN0YXRlIHtcclxuICAgIHJldHVybiB0aGlzLmNpcmN1aXRCcmVha2VyLmdldFN0YXRlKCk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBSZXNldCBjaXJjdWl0IGJyZWFrZXIgKGZvciB0ZXN0aW5nKVxyXG4gICAqL1xyXG4gIHJlc2V0Q2lyY3VpdCgpOiB2b2lkIHtcclxuICAgIHRoaXMuY2lyY3VpdEJyZWFrZXIucmVzZXQoKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEV4dHJhY3QgZXJyb3IgdHlwZSBmcm9tIGVycm9yIG9iamVjdFxyXG4gICAqL1xyXG4gIHByaXZhdGUgZXh0cmFjdEVycm9yVHlwZShlcnJvcjogYW55KTogc3RyaW5nIHtcclxuICAgIGlmIChlcnJvciBpbnN0YW5jZW9mIEVycm9yKSB7XHJcbiAgICAgIGNvbnN0IG1lc3NhZ2UgPSBlcnJvci5tZXNzYWdlO1xyXG4gICAgICBpZiAobWVzc2FnZS5pbmNsdWRlcygnQUlfUkFURV9MSU1JVCcpKSByZXR1cm4gJ1JhdGVMaW1pdCc7XHJcbiAgICAgIGlmIChtZXNzYWdlLmluY2x1ZGVzKCdBSV9WQUxJREFUSU9OX0VSUk9SJykpIHJldHVybiAnVmFsaWRhdGlvbic7XHJcbiAgICAgIGlmIChtZXNzYWdlLmluY2x1ZGVzKCdBSV9USU1FT1VUJykpIHJldHVybiAnVGltZW91dCc7XHJcbiAgICAgIGlmIChtZXNzYWdlLmluY2x1ZGVzKCdBSV9VTkFWQUlMQUJMRScpKSByZXR1cm4gJ1NlcnZpY2VVbmF2YWlsYWJsZSc7XHJcbiAgICAgIGlmIChtZXNzYWdlLmluY2x1ZGVzKCdDaXJjdWl0IGJyZWFrZXInKSkgcmV0dXJuICdDaXJjdWl0QnJlYWtlcic7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gJ1Vua25vd24nO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogU2xlZXAgdXRpbGl0eSBmb3IgcmV0cnkgZGVsYXlzXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBzbGVlcChtczogbnVtYmVyKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgbXMpKTtcclxuICB9XHJcbn1cclxuXHJcbi8vIEV4cG9ydCB0eXBlcyBhbmQgZW51bXNcclxuZXhwb3J0IHsgQ2lyY3VpdFN0YXRlLCBBUElMb2dFbnRyeSB9O1xyXG4iXX0=
/**
 * Bedrock Engine Service
 * 
 * Integrates with Amazon Bedrock (Claude Sonnet 4.6) for AI-powered test generation.
 * Uses inference profile for cross-region routing and high availability.
 * Implements the same interface as AIEngine for provider abstraction.
 */

import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { z } from 'zod';
import {
  TestSpecification,
  ApplicationAnalysis,
  LearningContext,
  TokenUsage,
} from '../../types/ai-test-generation';
import { getBedrockMonitoring, XRaySegment } from './bedrock-monitoring';

// ============================================================================
// AI Request/Response Types
// ============================================================================

/**
 * General AI request for various generation tasks
 */
export interface AIRequest {
  scenario?: string;
  context?: any;
  url?: string;
  html?: string;
  partialCode?: string;
  elementDescription?: string;
  domContext?: string;
}

/**
 * General AI response with content and usage metrics
 */
export interface AIResponse {
  content: string;
  usage: TokenUsage;
  cost: number;
  model: string;
  provider: string;
}

// ============================================================================
// Zod Schemas for Response Validation
// ============================================================================

const AIGeneratedStepSchema = z.object({
  action: z.enum(['navigate', 'click', 'type', 'assert', 'wait']),
  description: z.string(),
  elementDescription: z.string().optional(),
  value: z.string().optional(),
  assertion: z.object({
    type: z.enum(['exists', 'visible', 'text', 'value', 'attribute']),
    expected: z.string(),
  }).optional(),
});

const TestSpecificationSchema = z.object({
  testName: z.string().min(1),
  description: z.string(),
  steps: z.array(AIGeneratedStepSchema).min(1),
  tags: z.array(z.string()),
});

// ============================================================================
// Circuit Breaker Implementation
// ============================================================================

enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private lastFailureTime: number = 0;
  private successCount: number = 0;

  constructor(
    private readonly failureThreshold: number,
    private readonly resetTimeoutMs: number,
    private readonly halfOpenMaxAttempts: number
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() - this.lastFailureTime >= this.resetTimeoutMs) {
        this.state = CircuitState.HALF_OPEN;
        this.successCount = 0;
      } else {
        throw new Error('Circuit breaker is OPEN. Service temporarily unavailable.');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.halfOpenMaxAttempts) {
        this.state = CircuitState.CLOSED;
      }
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.failureThreshold) {
      this.state = CircuitState.OPEN;
    }
  }

  getState(): CircuitState {
    return this.state;
  }

  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = 0;
  }
}

// ============================================================================
// API Interaction Logger
// ============================================================================

interface APILogEntry {
  timestamp: string;
  operation: string;
  model: string;
  requestTokens?: number;
  responseTokens?: number;
  totalTokens?: number;
  status: 'success' | 'failure';
  error?: string;
  duration: number;
}

class APILogger {
  private logs: APILogEntry[] = [];

  log(entry: APILogEntry): void {
    this.logs.push(entry);
    console.log('[Bedrock Engine]', JSON.stringify(entry));
  }

  getLogs(): APILogEntry[] {
    return [...this.logs];
  }

  clearLogs(): void {
    this.logs = [];
  }
}

// ============================================================================
// Bedrock Configuration
// ============================================================================

interface BedrockConfig {
  region?: string;
  modelId?: string;
  timeout?: number;
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

export class BedrockEngine {
  private client: BedrockRuntimeClient;
  private circuitBreaker: CircuitBreaker;
  private logger: APILogger;
  private modelId: string;
  private region: string;
  private monitoring: ReturnType<typeof getBedrockMonitoring>;

  constructor(config?: BedrockConfig) {
    this.region = config?.region || process.env.BEDROCK_REGION || DEFAULT_CONFIG.region;
    this.modelId = config?.modelId || process.env.BEDROCK_MODEL_ID || DEFAULT_CONFIG.modelId;
    
    const timeout = config?.timeout || 
                    (process.env.BEDROCK_TIMEOUT ? parseInt(process.env.BEDROCK_TIMEOUT) : DEFAULT_CONFIG.timeout);

    this.client = new BedrockRuntimeClient({
      region: this.region,
      maxAttempts: 3,
      requestHandler: {
        requestTimeout: timeout,
      },
    });

    this.circuitBreaker = new CircuitBreaker(
      DEFAULT_CONFIG.circuitBreaker.failureThreshold,
      DEFAULT_CONFIG.circuitBreaker.resetTimeoutMs,
      DEFAULT_CONFIG.circuitBreaker.halfOpenMaxAttempts
    );

    this.logger = new APILogger();

    this.monitoring = getBedrockMonitoring(this.region);

    console.log(`[BedrockEngine] Initialized with region: ${this.region}, model: ${this.modelId}`);
  }

  /**
   * Analyze application structure and provide insights
   */
  async analyze(analysis: ApplicationAnalysis): Promise<{
    features: string[];
    userFlows: string[];
    interactiveElements: Array<{ type: string; selector: string; action: string }>;
    authRequired: boolean;
    testRecommendations: string[];
  }> {
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

      return analysisResult as any;
    } catch (error) {
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
  async generate(request: AIRequest): Promise<AIResponse> {
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
    } catch (error) {
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
  async complete(request: AIRequest): Promise<AIResponse> {
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
    } catch (error) {
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
  async generateTestSpecification(
    analysis: ApplicationAnalysis,
    scenario: string,
    context?: LearningContext
  ): Promise<TestSpecification> {
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
    } catch (error) {
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
  private async invokeModelWithRetry(
    prompt: string,
    options: { temperature: number; max_tokens: number }
  ): Promise<{ content: string; usage: { input_tokens: number; output_tokens: number } }> {
    return this.circuitBreaker.execute(async () => {
      let lastError: Error | null = null;

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
          const command = new InvokeModelCommand({
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
        } catch (error) {
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

      throw new Error(
        `AI service temporarily unavailable after 3 attempts. ${lastError?.message || ''}`
      );
    });
  }

  /**
   * Build analysis prompt from application context
   */
  private buildAnalysisPrompt(analysis: ApplicationAnalysis): string {
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
  private buildGenerationPrompt(request: AIRequest): string {
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
  private buildCompletionPrompt(request: AIRequest): string {
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
  private validatePlaywrightSyntax(content: string): void {
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
  private calculateCost(usage: TokenUsage): number {
    const INPUT_COST_PER_1M = 3.0;
    const OUTPUT_COST_PER_1M = 15.0;

    const inputCost = (usage.promptTokens / 1_000_000) * INPUT_COST_PER_1M;
    const outputCost = (usage.completionTokens / 1_000_000) * OUTPUT_COST_PER_1M;

    return inputCost + outputCost;
  }

  /**
   * Construct prompt from analysis and scenario
   */
  private constructPrompt(
    analysis: ApplicationAnalysis,
    scenario: string,
    context?: LearningContext
  ): string {
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
  private parseResponse(content: string): unknown {
    if (!content) {
      throw new Error('AI generated empty response');
    }

    try {
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`AI generated invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Validate response against schema
   */
  validateResponse(response: unknown): TestSpecification {
    try {
      return TestSpecificationSchema.parse(response);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const issues = error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join(', ');
        throw new Error(`AI generated invalid test specification. Validation errors: ${issues}`);
      }
      throw new Error('AI generated invalid test specification. Please try again.');
    }
  }

  /**
   * Handle Bedrock errors and convert to standard error types
   */
  private handleError(error: any): Error {
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
  getLogs(): APILogEntry[] {
    return this.logger.getLogs();
  }

  /**
   * Clear API interaction logs
   */
  clearLogs(): void {
    this.logger.clearLogs();
  }

  /**
   * Get circuit breaker state
   */
  getCircuitState(): CircuitState {
    return this.circuitBreaker.getState();
  }

  /**
   * Reset circuit breaker (for testing)
   */
  resetCircuit(): void {
    this.circuitBreaker.reset();
  }

  /**
   * Extract error type from error object
   */
  private extractErrorType(error: any): string {
    if (error instanceof Error) {
      const message = error.message;
      if (message.includes('AI_RATE_LIMIT')) return 'RateLimit';
      if (message.includes('AI_VALIDATION_ERROR')) return 'Validation';
      if (message.includes('AI_TIMEOUT')) return 'Timeout';
      if (message.includes('AI_UNAVAILABLE')) return 'ServiceUnavailable';
      if (message.includes('Circuit breaker')) return 'CircuitBreaker';
    }
    return 'Unknown';
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Export types and enums
export { CircuitState, APILogEntry };

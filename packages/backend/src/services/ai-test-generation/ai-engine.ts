/**
 * AI Engine Service
 * 
 * Integrates with OpenAI API to generate test specifications from web page analysis.
 * Implements retry logic, circuit breaker pattern, and response validation.
 */

import OpenAI from 'openai';
import { z } from 'zod';
import {
  TestSpecification,
  AIGeneratedStep,
  ApplicationAnalysis,
  LearningContext,
} from '../../types/ai-test-generation';
import {
  OPENAI_CONFIG,
  getOpenAIApiKey,
  getModelForOperation,
  getRetryDelay,
  getTimeout,
} from '../../config/openai-config';

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
    console.log('[AI Engine]', JSON.stringify(entry));
  }

  getLogs(): APILogEntry[] {
    return [...this.logs];
  }

  clearLogs(): void {
    this.logs = [];
  }
}

// ============================================================================
// AI Engine Service
// ============================================================================

export class AIEngine {
  private client: OpenAI;
  private circuitBreaker: CircuitBreaker;
  private logger: APILogger;

  constructor() {
    this.client = new OpenAI({
      apiKey: getOpenAIApiKey(),
      organization: OPENAI_CONFIG.organization,
      timeout: getTimeout('request'),
    });

    this.circuitBreaker = new CircuitBreaker(
      OPENAI_CONFIG.circuitBreaker.failureThreshold,
      OPENAI_CONFIG.circuitBreaker.resetTimeoutMs,
      OPENAI_CONFIG.circuitBreaker.halfOpenMaxAttempts
    );

    this.logger = new APILogger();
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
    const model = getModelForOperation('generation');

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
    } catch (error) {
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
  private async callOpenAIWithRetry(
    model: string,
    prompt: string
  ): Promise<OpenAI.Chat.Completions.ChatCompletion> {
    return this.circuitBreaker.execute(async () => {
      let lastError: Error | null = null;

      for (let attempt = 1; attempt <= OPENAI_CONFIG.retry.maxAttempts; attempt++) {
        try {
          const response = await this.client.chat.completions.create({
            model,
            messages: [
              {
                role: 'system',
                content: OPENAI_CONFIG.prompts.systemRole,
              },
              {
                role: 'user',
                content: prompt,
              },
            ],
            temperature: OPENAI_CONFIG.parameters.temperature,
            max_tokens: OPENAI_CONFIG.parameters.maxTokens,
            top_p: OPENAI_CONFIG.parameters.topP,
            frequency_penalty: OPENAI_CONFIG.parameters.frequencyPenalty,
            presence_penalty: OPENAI_CONFIG.parameters.presencePenalty,
            response_format: { type: 'json_object' },
          });

          return response;
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          
          if (attempt < OPENAI_CONFIG.retry.maxAttempts) {
            const delay = getRetryDelay(attempt);
            console.log(`[AI Engine] Retry attempt ${attempt} failed. Retrying in ${delay}ms...`);
            await this.sleep(delay);
          }
        }
      }

      throw new Error(
        `AI service temporarily unavailable after ${OPENAI_CONFIG.retry.maxAttempts} attempts. ${lastError?.message || ''}`
      );
    });
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
   * Parse OpenAI response to TestSpecification
   */
  private parseResponse(
    response: OpenAI.Chat.Completions.ChatCompletion
  ): unknown {
    const content = response.choices[0]?.message?.content;

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
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Export types and enums
export { CircuitState, APILogEntry };

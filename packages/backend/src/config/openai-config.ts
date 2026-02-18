/**
 * OpenAI API configuration for AI test generation
 */

export const OPENAI_CONFIG = {
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
} as const;

/**
 * Get OpenAI API key from environment
 * @throws Error if API key is not configured
 */
export function getOpenAIApiKey(): string {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }
  
  return apiKey;
}

/**
 * Get model name for a specific operation
 */
export function getModelForOperation(operation: 'analysis' | 'generation'): string {
  return OPENAI_CONFIG.models[operation];
}

/**
 * Calculate cost for token usage
 */
export function calculateCost(
  model: string,
  promptTokens: number,
  completionTokens: number
): number {
  const pricing = OPENAI_CONFIG.pricing[model as keyof typeof OPENAI_CONFIG.pricing];
  
  if (!pricing) {
    // Use default pricing if model not found
    const defaultPricing = OPENAI_CONFIG.pricing['gpt-4-turbo-preview'];
    return (
      (promptTokens / 1000) * defaultPricing.prompt +
      (completionTokens / 1000) * defaultPricing.completion
    );
  }
  
  return (
    (promptTokens / 1000) * pricing.prompt +
    (completionTokens / 1000) * pricing.completion
  );
}

/**
 * Check if API key is configured
 */
export function isOpenAIConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

/**
 * Get retry delay for attempt number
 */
export function getRetryDelay(attemptNumber: number): number {
  const { initialDelayMs, maxDelayMs, backoffMultiplier } = OPENAI_CONFIG.retry;
  const delay = initialDelayMs * Math.pow(backoffMultiplier, attemptNumber - 1);
  return Math.min(delay, maxDelayMs);
}

/**
 * Validate model name
 */
export function isValidModel(model: string): boolean {
  return Object.values(OPENAI_CONFIG.models).includes(model as any);
}

/**
 * Get timeout for operation type
 */
export function getTimeout(operation: 'request' | 'analysis' | 'generation'): number {
  switch (operation) {
    case 'request':
      return OPENAI_CONFIG.timeout.requestTimeoutMs;
    case 'analysis':
      return OPENAI_CONFIG.timeout.analysisTimeoutMs;
    case 'generation':
      return OPENAI_CONFIG.timeout.generationTimeoutMs;
    default:
      return OPENAI_CONFIG.timeout.requestTimeoutMs;
  }
}

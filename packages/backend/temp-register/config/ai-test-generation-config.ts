/**
 * AI Test Generation Configuration
 * 
 * Centralized configuration for AI test generation feature including:
 * - OpenAI model selection
 * - Usage limits (per-user and per-project)
 * - Pricing rates for cost calculation
 * - Retry and timeout settings
 */

export interface AITestGenerationConfig {
  // OpenAI Configuration
  openai: {
    model: 'gpt-4' | 'gpt-3.5-turbo';
    maxTokens: number;
    temperature: number;
  };

  // Usage Limits
  limits: {
    perUser: {
      monthlyCostLimit: number; // USD
      dailyCallLimit: number;
    };
    perProject: {
      monthlyCostLimit: number; // USD
      dailyCallLimit: number;
    };
  };

  // Pricing Rates (per 1M tokens)
  pricing: {
    'gpt-4': {
      promptRate: number;
      completionRate: number;
    };
    'gpt-3.5-turbo': {
      promptRate: number;
      completionRate: number;
    };
  };

  // Retry Configuration
  retry: {
    maxAttempts: number;
    initialDelayMs: number;
    maxDelayMs: number;
    backoffMultiplier: number;
  };

  // Timeout Configuration
  timeout: {
    analysisTimeoutMs: number;
    generationTimeoutMs: number;
    batchGenerationTimeoutMs: number;
  };

  // Batch Processing Configuration
  batch: {
    maxConcurrency: number;
    maxScenariosPerBatch: number;
  };
}

/**
 * Default configuration for AI test generation
 */
export const defaultConfig: AITestGenerationConfig = {
  openai: {
    model: 'gpt-4',
    maxTokens: 2000,
    temperature: 0.7,
  },

  limits: {
    perUser: {
      monthlyCostLimit: 100, // $100 per month per user
      dailyCallLimit: 100,
    },
    perProject: {
      monthlyCostLimit: 50, // $50 per month per project
      dailyCallLimit: 50,
    },
  },

  pricing: {
    'gpt-4': {
      promptRate: 30, // $30 per 1M prompt tokens
      completionRate: 60, // $60 per 1M completion tokens
    },
    'gpt-3.5-turbo': {
      promptRate: 0.5, // $0.50 per 1M prompt tokens
      completionRate: 1.5, // $1.50 per 1M completion tokens
    },
  },

  retry: {
    maxAttempts: 3,
    initialDelayMs: 1000, // 1 second
    maxDelayMs: 4000, // 4 seconds
    backoffMultiplier: 2, // Exponential backoff: 1s, 2s, 4s
  },

  timeout: {
    analysisTimeoutMs: 30000, // 30 seconds
    generationTimeoutMs: 60000, // 60 seconds
    batchGenerationTimeoutMs: 300000, // 5 minutes
  },

  batch: {
    maxConcurrency: 3, // Process 3 scenarios in parallel
    maxScenariosPerBatch: 20, // Maximum 20 scenarios per batch request
  },
};

/**
 * Get configuration from environment variables or use defaults
 */
export function getConfig(): AITestGenerationConfig {
  return {
    openai: {
      model: (process.env.AI_MODEL as 'gpt-4' | 'gpt-3.5-turbo') || defaultConfig.openai.model,
      maxTokens: parseInt(process.env.AI_MAX_TOKENS || '') || defaultConfig.openai.maxTokens,
      temperature: parseFloat(process.env.AI_TEMPERATURE || '') || defaultConfig.openai.temperature,
    },

    limits: {
      perUser: {
        monthlyCostLimit: parseFloat(process.env.USER_MONTHLY_COST_LIMIT || '') || defaultConfig.limits.perUser.monthlyCostLimit,
        dailyCallLimit: parseInt(process.env.USER_DAILY_CALL_LIMIT || '') || defaultConfig.limits.perUser.dailyCallLimit,
      },
      perProject: {
        monthlyCostLimit: parseFloat(process.env.PROJECT_MONTHLY_COST_LIMIT || '') || defaultConfig.limits.perProject.monthlyCostLimit,
        dailyCallLimit: parseInt(process.env.PROJECT_DAILY_CALL_LIMIT || '') || defaultConfig.limits.perProject.dailyCallLimit,
      },
    },

    pricing: defaultConfig.pricing, // Pricing is not configurable via env vars

    retry: {
      maxAttempts: parseInt(process.env.AI_RETRY_MAX_ATTEMPTS || '') || defaultConfig.retry.maxAttempts,
      initialDelayMs: parseInt(process.env.AI_RETRY_INITIAL_DELAY_MS || '') || defaultConfig.retry.initialDelayMs,
      maxDelayMs: parseInt(process.env.AI_RETRY_MAX_DELAY_MS || '') || defaultConfig.retry.maxDelayMs,
      backoffMultiplier: parseFloat(process.env.AI_RETRY_BACKOFF_MULTIPLIER || '') || defaultConfig.retry.backoffMultiplier,
    },

    timeout: {
      analysisTimeoutMs: parseInt(process.env.AI_ANALYSIS_TIMEOUT_MS || '') || defaultConfig.timeout.analysisTimeoutMs,
      generationTimeoutMs: parseInt(process.env.AI_GENERATION_TIMEOUT_MS || '') || defaultConfig.timeout.generationTimeoutMs,
      batchGenerationTimeoutMs: parseInt(process.env.AI_BATCH_TIMEOUT_MS || '') || defaultConfig.timeout.batchGenerationTimeoutMs,
    },

    batch: {
      maxConcurrency: parseInt(process.env.AI_BATCH_MAX_CONCURRENCY || '') || defaultConfig.batch.maxConcurrency,
      maxScenariosPerBatch: parseInt(process.env.AI_BATCH_MAX_SCENARIOS || '') || defaultConfig.batch.maxScenariosPerBatch,
    },
  };
}

/**
 * Validate configuration values
 */
export function validateConfig(config: AITestGenerationConfig): string[] {
  const errors: string[] = [];

  // Validate OpenAI config
  if (config.openai.maxTokens <= 0) {
    errors.push('OpenAI maxTokens must be positive');
  }
  if (config.openai.temperature < 0 || config.openai.temperature > 2) {
    errors.push('OpenAI temperature must be between 0 and 2');
  }

  // Validate limits
  if (config.limits.perUser.monthlyCostLimit <= 0) {
    errors.push('Per-user monthly cost limit must be positive');
  }
  if (config.limits.perProject.monthlyCostLimit <= 0) {
    errors.push('Per-project monthly cost limit must be positive');
  }

  // Validate retry config
  if (config.retry.maxAttempts <= 0) {
    errors.push('Retry maxAttempts must be positive');
  }
  if (config.retry.initialDelayMs <= 0) {
    errors.push('Retry initialDelayMs must be positive');
  }

  // Validate timeout config
  if (config.timeout.analysisTimeoutMs <= 0) {
    errors.push('Analysis timeout must be positive');
  }
  if (config.timeout.generationTimeoutMs <= 0) {
    errors.push('Generation timeout must be positive');
  }

  // Validate batch config
  if (config.batch.maxConcurrency <= 0) {
    errors.push('Batch maxConcurrency must be positive');
  }
  if (config.batch.maxScenariosPerBatch <= 0) {
    errors.push('Batch maxScenariosPerBatch must be positive');
  }

  return errors;
}

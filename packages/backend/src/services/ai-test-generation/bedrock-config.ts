/**
 * Bedrock Configuration Validation
 * 
 * Validates Bedrock configuration on startup and provides configuration utilities.
 * 
 * **Validates: Requirements 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7**
 */

// ============================================================================
// Configuration Types
// ============================================================================

export interface BedrockConfiguration {
  provider: 'BEDROCK' | 'OPENAI' | 'HUGGINGFACE';
  region: string;
  modelId: string;
  timeout: number;
  monitoringEnabled: boolean;
}

export interface ConfigurationValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  config?: BedrockConfiguration;
}

// ============================================================================
// Configuration Defaults
// ============================================================================

const DEFAULT_CONFIG = {
  provider: 'BEDROCK' as const,
  region: 'us-east-1',
  modelId: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
  timeout: 30000,
  monitoringEnabled: true,
};

// ============================================================================
// Configuration Validation
// ============================================================================

/**
 * Validate Bedrock configuration from environment variables
 * 
 * Task 10.2: Validate configuration on startup
 */
export function validateBedrockConfiguration(): ConfigurationValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Read environment variables
  const provider = (process.env.AI_PROVIDER || DEFAULT_CONFIG.provider).toUpperCase();
  const region = process.env.BEDROCK_REGION || DEFAULT_CONFIG.region;
  const modelId = process.env.BEDROCK_MODEL_ID || DEFAULT_CONFIG.modelId;
  const timeoutStr = process.env.BEDROCK_TIMEOUT || String(DEFAULT_CONFIG.timeout);
  const monitoringEnabledStr = process.env.ENABLE_BEDROCK_MONITORING || 'true';

  // Validate AI_PROVIDER
  if (!['BEDROCK', 'OPENAI', 'HUGGINGFACE'].includes(provider)) {
    errors.push(`Invalid AI_PROVIDER: ${provider}. Must be BEDROCK, OPENAI, or HUGGINGFACE.`);
  }

  // Validate BEDROCK_REGION format
  const regionRegex = /^[a-z]{2}-[a-z]+-\d{1}$/;
  if (!regionRegex.test(region)) {
    errors.push(`Invalid BEDROCK_REGION format: ${region}. Expected format: us-east-1, eu-west-1, etc.`);
  }

  // Validate BEDROCK_MODEL_ID format
  const modelIdRegex = /^anthropic\.claude-[a-z0-9\-\.]+$/;
  if (!modelIdRegex.test(modelId)) {
    warnings.push(`Unusual BEDROCK_MODEL_ID format: ${modelId}. Expected format: anthropic.claude-*`);
  }

  // Validate BEDROCK_TIMEOUT
  const timeout = parseInt(timeoutStr, 10);
  if (isNaN(timeout) || timeout <= 0) {
    errors.push(`Invalid BEDROCK_TIMEOUT: ${timeoutStr}. Must be a positive number in milliseconds.`);
  } else if (timeout < 5000) {
    warnings.push(`BEDROCK_TIMEOUT is very low: ${timeout}ms. Bedrock requests may timeout frequently.`);
  } else if (timeout > 300000) {
    warnings.push(`BEDROCK_TIMEOUT is very high: ${timeout}ms. Consider reducing to avoid long waits.`);
  }

  // Validate ENABLE_BEDROCK_MONITORING
  const monitoringEnabled = monitoringEnabledStr.toLowerCase() !== 'false';

  // Build configuration object
  const config: BedrockConfiguration = {
    provider: provider as 'BEDROCK' | 'OPENAI' | 'HUGGINGFACE',
    region,
    modelId,
    timeout,
    monitoringEnabled,
  };

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    config: errors.length === 0 ? config : undefined,
  };
}

/**
 * Log configuration on startup (excluding secrets)
 * 
 * Task 11.6: Log configuration
 */
export function logBedrockConfiguration(config: BedrockConfiguration): void {
  console.log('[BedrockConfig] Configuration loaded:');
  console.log(`  AI Provider: ${config.provider}`);
  console.log(`  Region: ${config.region}`);
  console.log(`  Model ID: ${config.modelId}`);
  console.log(`  Timeout: ${config.timeout}ms`);
  console.log(`  Monitoring Enabled: ${config.monitoringEnabled}`);
}

/**
 * Validate and log configuration on startup
 * Throws error if configuration is invalid
 * 
 * Task 10.2: Validate configuration on startup
 * Task 11.7: Log configuration
 */
export function initializeBedrockConfiguration(): BedrockConfiguration {
  const result = validateBedrockConfiguration();

  // Log warnings
  if (result.warnings.length > 0) {
    console.warn('[BedrockConfig] Configuration warnings:');
    result.warnings.forEach((warning) => console.warn(`  - ${warning}`));
  }

  // Throw error if invalid
  if (!result.valid) {
    console.error('[BedrockConfig] Configuration errors:');
    result.errors.forEach((error) => console.error(`  - ${error}`));
    throw new Error(`Invalid Bedrock configuration: ${result.errors.join(', ')}`);
  }

  // Log configuration
  if (result.config) {
    logBedrockConfiguration(result.config);
  }

  return result.config!;
}

/**
 * Get current Bedrock configuration
 * Returns configuration without validation (for runtime use)
 */
export function getBedrockConfiguration(): BedrockConfiguration {
  return {
    provider: (process.env.AI_PROVIDER || DEFAULT_CONFIG.provider).toUpperCase() as 'BEDROCK' | 'OPENAI' | 'HUGGINGFACE',
    region: process.env.BEDROCK_REGION || DEFAULT_CONFIG.region,
    modelId: process.env.BEDROCK_MODEL_ID || DEFAULT_CONFIG.modelId,
    timeout: parseInt(process.env.BEDROCK_TIMEOUT || String(DEFAULT_CONFIG.timeout), 10),
    monitoringEnabled: (process.env.ENABLE_BEDROCK_MONITORING || 'true').toLowerCase() !== 'false',
  };
}

/**
 * Check if Bedrock is the active provider
 */
export function isBedrockActive(): boolean {
  const provider = (process.env.AI_PROVIDER || DEFAULT_CONFIG.provider).toUpperCase();
  return provider === 'BEDROCK';
}

/**
 * Get supported AWS regions for Bedrock
 */
export function getSupportedBedrockRegions(): string[] {
  return [
    'us-east-1',
    'us-west-2',
    'ap-southeast-1',
    'ap-southeast-2',
    'ap-northeast-1',
    'eu-central-1',
    'eu-west-1',
    'eu-west-2',
    'eu-west-3',
  ];
}

/**
 * Get supported Claude models for Bedrock
 */
export function getSupportedClaudeModels(): string[] {
  return [
    'anthropic.claude-3-5-sonnet-20241022-v2:0', // Latest Claude 3.5 Sonnet
    'anthropic.claude-3-5-sonnet-20240620-v1:0', // Previous Claude 3.5 Sonnet
    'anthropic.claude-3-opus-20240229-v1:0',     // Claude 3 Opus
    'anthropic.claude-3-sonnet-20240229-v1:0',   // Claude 3 Sonnet
    'anthropic.claude-3-haiku-20240307-v1:0',    // Claude 3 Haiku
  ];
}

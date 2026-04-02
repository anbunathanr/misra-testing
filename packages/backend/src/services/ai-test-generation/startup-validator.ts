/**
 * Startup Configuration Validator
 * 
 * Validates Bedrock configuration on Lambda cold start.
 * This ensures that configuration errors are caught early and logged clearly.
 * 
 * **Validates: Requirements 11.6, 11.7**
 * **Task 10.2: Validate configuration on startup**
 */

import { initializeBedrockConfiguration, BedrockConfiguration } from './bedrock-config';

// Global configuration cache
let cachedConfig: BedrockConfiguration | null = null;
let configValidated = false;

/**
 * Validate and initialize Bedrock configuration on Lambda cold start
 * 
 * This function should be called at the module level (outside the handler)
 * to ensure configuration is validated during Lambda initialization.
 * 
 * @throws Error if configuration is invalid
 */
export function validateStartupConfiguration(): BedrockConfiguration {
  if (configValidated && cachedConfig) {
    return cachedConfig;
  }

  console.log('[StartupValidator] Validating Bedrock configuration...');

  try {
    // Validate and initialize configuration
    cachedConfig = initializeBedrockConfiguration();
    configValidated = true;

    console.log('[StartupValidator] ✓ Configuration validation successful');
    return cachedConfig;
  } catch (error) {
    console.error('[StartupValidator] ✗ Configuration validation failed');
    console.error('[StartupValidator] Error:', error instanceof Error ? error.message : String(error));
    
    // Re-throw to prevent Lambda from starting with invalid configuration
    throw new Error(
      `Bedrock configuration validation failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Get validated configuration
 * 
 * Returns the cached configuration if already validated,
 * otherwise validates and caches it.
 */
export function getValidatedConfiguration(): BedrockConfiguration {
  if (!configValidated || !cachedConfig) {
    return validateStartupConfiguration();
  }
  return cachedConfig;
}

/**
 * Reset configuration cache (for testing)
 */
export function resetConfigurationCache(): void {
  cachedConfig = null;
  configValidated = false;
}

/**
 * Check if configuration has been validated
 */
export function isConfigurationValidated(): boolean {
  return configValidated;
}

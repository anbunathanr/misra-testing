/**
 * Startup Configuration Validator
 *
 * Validates Bedrock configuration on Lambda cold start.
 * This ensures that configuration errors are caught early and logged clearly.
 *
 * **Validates: Requirements 11.6, 11.7**
 * **Task 10.2: Validate configuration on startup**
 */
import { BedrockConfiguration } from './bedrock-config';
/**
 * Validate and initialize Bedrock configuration on Lambda cold start
 *
 * This function should be called at the module level (outside the handler)
 * to ensure configuration is validated during Lambda initialization.
 *
 * @throws Error if configuration is invalid
 */
export declare function validateStartupConfiguration(): BedrockConfiguration;
/**
 * Get validated configuration
 *
 * Returns the cached configuration if already validated,
 * otherwise validates and caches it.
 */
export declare function getValidatedConfiguration(): BedrockConfiguration;
/**
 * Reset configuration cache (for testing)
 */
export declare function resetConfigurationCache(): void;
/**
 * Check if configuration has been validated
 */
export declare function isConfigurationValidated(): boolean;

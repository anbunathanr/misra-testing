/**
 * Bedrock Configuration Validation
 *
 * Validates Bedrock configuration on startup and provides configuration utilities.
 *
 * **Validates: Requirements 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7**
 */
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
/**
 * Validate Bedrock configuration from environment variables
 *
 * Task 10.2: Validate configuration on startup
 */
export declare function validateBedrockConfiguration(): ConfigurationValidationResult;
/**
 * Log configuration on startup (excluding secrets)
 *
 * Task 11.6: Log configuration
 */
export declare function logBedrockConfiguration(config: BedrockConfiguration): void;
/**
 * Validate and log configuration on startup
 * Throws error if configuration is invalid
 *
 * Task 10.2: Validate configuration on startup
 * Task 11.7: Log configuration
 */
export declare function initializeBedrockConfiguration(): BedrockConfiguration;
/**
 * Get current Bedrock configuration
 * Returns configuration without validation (for runtime use)
 */
export declare function getBedrockConfiguration(): BedrockConfiguration;
/**
 * Check if Bedrock is the active provider
 */
export declare function isBedrockActive(): boolean;
/**
 * Get supported AWS regions for Bedrock
 */
export declare function getSupportedBedrockRegions(): string[];
/**
 * Get supported Claude models for Bedrock
 */
export declare function getSupportedClaudeModels(): string[];

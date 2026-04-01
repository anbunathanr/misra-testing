/**
 * AI Engine Factory
 * 
 * Provides a centralized factory for creating AI engine instances based on
 * the configured provider. Supports multiple AI providers (Bedrock, OpenAI, HuggingFace)
 * with runtime provider selection via environment variables.
 */

import { BedrockEngine } from './bedrock-engine';
import { AIEngine } from './ai-engine';
import { HuggingFaceEngine } from './huggingface-engine';
import { ApplicationAnalysis, LearningContext, TestSpecification } from '../../types/ai-test-generation';

/**
 * Supported AI providers
 */
export type AIProvider = 'BEDROCK' | 'OPENAI' | 'HUGGINGFACE';

/**
 * Common interface for all AI engines
 * This ensures all engines can be used interchangeably
 */
export interface IAIEngine {
  generateTestSpecification(
    analysis: ApplicationAnalysis,
    scenario: string,
    context?: LearningContext
  ): Promise<TestSpecification>;
}

/**
 * AI Engine Factory
 * 
 * Creates AI engine instances based on the AI_PROVIDER environment variable.
 * Defaults to BEDROCK if not specified.
 * 
 * Supports canary deployment with BEDROCK_TRAFFIC_PERCENTAGE for gradual rollout.
 */
export class AIEngineFactory {
  /**
   * Create an AI engine instance for the specified provider
   * 
   * @param provider - Optional provider override. If not specified, reads from AI_PROVIDER env var
   * @returns AI engine instance
   * @throws Error if provider is unknown
   */
  static create(provider?: AIProvider): IAIEngine {
    // Determine provider with canary deployment support
    const selectedProvider = this.selectProviderWithCanary(provider);
    
    console.log(`[AIEngineFactory] Creating AI engine for provider: ${selectedProvider}`);
    
    switch (selectedProvider) {
      case 'BEDROCK':
        console.log('[AIEngineFactory] Initializing Bedrock engine with Claude 3.5 Sonnet');
        return new BedrockEngine();
        
      case 'OPENAI':
        console.log('[AIEngineFactory] Initializing OpenAI engine');
        return new AIEngine();
        
      case 'HUGGINGFACE':
        console.log('[AIEngineFactory] Initializing HuggingFace engine');
        return new HuggingFaceEngine();
        
      default:
        throw new Error(`Unknown AI provider: ${selectedProvider}. Supported providers: BEDROCK, OPENAI, HUGGINGFACE`);
    }
  }

  /**
   * Select provider with canary deployment support
   * 
   * Implements traffic percentage routing for gradual Bedrock rollout.
   * When BEDROCK_TRAFFIC_PERCENTAGE is set, routes that percentage of traffic to Bedrock
   * regardless of the AI_PROVIDER setting.
   * 
   * @param provider - Optional provider override
   * @returns Selected provider based on canary logic
   */
  private static selectProviderWithCanary(provider?: AIProvider): AIProvider {
    // If provider is explicitly specified, use it (no canary logic)
    if (provider) {
      return provider;
    }

    // Get base provider from environment (default: BEDROCK)
    const baseProvider = (process.env.AI_PROVIDER as AIProvider) || 'BEDROCK';

    // Check if canary deployment is enabled
    const trafficPercentage = parseInt(process.env.BEDROCK_TRAFFIC_PERCENTAGE || '0', 10);

    // If no canary deployment or invalid percentage, use base provider
    if (trafficPercentage <= 0 || trafficPercentage > 100) {
      return baseProvider;
    }

    // If traffic percentage is 100%, always use Bedrock
    if (trafficPercentage >= 100) {
      console.log('[AIEngineFactory] Canary deployment at 100% - routing to Bedrock');
      return 'BEDROCK';
    }

    // Canary deployment: randomly route traffic based on percentage
    const random = Math.random() * 100;
    const useBedrock = random < trafficPercentage;

    if (useBedrock) {
      console.log(`[AIEngineFactory] Canary deployment: routing to Bedrock (${trafficPercentage}% traffic, random=${random.toFixed(2)})`);
      return 'BEDROCK';
    } else {
      console.log(`[AIEngineFactory] Canary deployment: routing to ${baseProvider} (${100 - trafficPercentage}% traffic, random=${random.toFixed(2)})`);
      return baseProvider;
    }
  }

  /**
   * Get the currently configured provider
   * 
   * @returns Current AI provider
   */
  static getCurrentProvider(): AIProvider {
    return (process.env.AI_PROVIDER as AIProvider) || 'BEDROCK';
  }

  /**
   * Check if a provider is supported
   * 
   * @param provider - Provider to check
   * @returns True if provider is supported
   */
  static isProviderSupported(provider: string): boolean {
    return ['BEDROCK', 'OPENAI', 'HUGGINGFACE'].includes(provider);
  }
}

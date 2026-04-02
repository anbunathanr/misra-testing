/**
 * AI Engine Factory Tests
 * 
 * Tests for the AI engine factory that creates provider-specific engines
 */

import { AIEngineFactory, AIProvider } from '../ai-engine-factory';
import { BedrockEngine } from '../bedrock-engine';
import { AIEngine } from '../ai-engine';
import { HuggingFaceEngine } from '../huggingface-engine';

describe('AIEngineFactory', () => {
  // Store original env vars
  const originalProvider = process.env.AI_PROVIDER;
  const originalTrafficPercentage = process.env.BEDROCK_TRAFFIC_PERCENTAGE;

  afterEach(() => {
    // Restore original env vars
    if (originalProvider) {
      process.env.AI_PROVIDER = originalProvider;
    } else {
      delete process.env.AI_PROVIDER;
    }
    
    if (originalTrafficPercentage) {
      process.env.BEDROCK_TRAFFIC_PERCENTAGE = originalTrafficPercentage;
    } else {
      delete process.env.BEDROCK_TRAFFIC_PERCENTAGE;
    }
  });

  describe('create()', () => {
    it('should create BedrockEngine when provider is BEDROCK', () => {
      const engine = AIEngineFactory.create('BEDROCK');
      expect(engine).toBeInstanceOf(BedrockEngine);
    });

    it('should create AIEngine when provider is OPENAI', () => {
      const engine = AIEngineFactory.create('OPENAI');
      expect(engine).toBeInstanceOf(AIEngine);
    });

    it('should create HuggingFaceEngine when provider is HUGGINGFACE', () => {
      const engine = AIEngineFactory.create('HUGGINGFACE');
      expect(engine).toBeInstanceOf(HuggingFaceEngine);
    });

    it('should default to BEDROCK when no provider specified and no env var', () => {
      delete process.env.AI_PROVIDER;
      const engine = AIEngineFactory.create();
      expect(engine).toBeInstanceOf(BedrockEngine);
    });

    it('should use AI_PROVIDER env var when no provider parameter', () => {
      process.env.AI_PROVIDER = 'OPENAI';
      const engine = AIEngineFactory.create();
      expect(engine).toBeInstanceOf(AIEngine);
    });

    it('should prioritize parameter over env var', () => {
      process.env.AI_PROVIDER = 'OPENAI';
      const engine = AIEngineFactory.create('BEDROCK');
      expect(engine).toBeInstanceOf(BedrockEngine);
    });

    it('should throw error for unknown provider', () => {
      expect(() => {
        AIEngineFactory.create('UNKNOWN' as AIProvider);
      }).toThrow('Unknown AI provider: UNKNOWN');
    });

    it('should log provider selection', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      AIEngineFactory.create('BEDROCK');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        '[AIEngineFactory] Creating AI engine for provider: BEDROCK'
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        '[AIEngineFactory] Initializing Bedrock engine with Claude 3.5 Sonnet'
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('getCurrentProvider()', () => {
    it('should return BEDROCK when no env var set', () => {
      delete process.env.AI_PROVIDER;
      expect(AIEngineFactory.getCurrentProvider()).toBe('BEDROCK');
    });

    it('should return env var value when set', () => {
      process.env.AI_PROVIDER = 'OPENAI';
      expect(AIEngineFactory.getCurrentProvider()).toBe('OPENAI');
    });
  });

  describe('isProviderSupported()', () => {
    it('should return true for BEDROCK', () => {
      expect(AIEngineFactory.isProviderSupported('BEDROCK')).toBe(true);
    });

    it('should return true for OPENAI', () => {
      expect(AIEngineFactory.isProviderSupported('OPENAI')).toBe(true);
    });

    it('should return true for HUGGINGFACE', () => {
      expect(AIEngineFactory.isProviderSupported('HUGGINGFACE')).toBe(true);
    });

    it('should return false for unknown provider', () => {
      expect(AIEngineFactory.isProviderSupported('UNKNOWN')).toBe(false);
    });

    it('should be case-sensitive', () => {
      expect(AIEngineFactory.isProviderSupported('bedrock')).toBe(false);
      expect(AIEngineFactory.isProviderSupported('openai')).toBe(false);
    });
  });

  describe('IAIEngine interface compliance', () => {
    it('should return engines that implement generateTestSpecification', () => {
      const bedrockEngine = AIEngineFactory.create('BEDROCK');
      const openaiEngine = AIEngineFactory.create('OPENAI');
      const hfEngine = AIEngineFactory.create('HUGGINGFACE');

      expect(typeof bedrockEngine.generateTestSpecification).toBe('function');
      expect(typeof openaiEngine.generateTestSpecification).toBe('function');
      expect(typeof hfEngine.generateTestSpecification).toBe('function');
    });
  });

  describe('Canary deployment with BEDROCK_TRAFFIC_PERCENTAGE', () => {
    beforeEach(() => {
      // Set base provider to OPENAI for canary tests
      process.env.AI_PROVIDER = 'OPENAI';
    });

    it('should use base provider when BEDROCK_TRAFFIC_PERCENTAGE is 0', () => {
      process.env.BEDROCK_TRAFFIC_PERCENTAGE = '0';
      const engine = AIEngineFactory.create();
      expect(engine).toBeInstanceOf(AIEngine); // OpenAI
    });

    it('should use base provider when BEDROCK_TRAFFIC_PERCENTAGE is not set', () => {
      delete process.env.BEDROCK_TRAFFIC_PERCENTAGE;
      const engine = AIEngineFactory.create();
      expect(engine).toBeInstanceOf(AIEngine); // OpenAI
    });

    it('should always use Bedrock when BEDROCK_TRAFFIC_PERCENTAGE is 100', () => {
      process.env.BEDROCK_TRAFFIC_PERCENTAGE = '100';
      
      // Test multiple times to ensure it's always Bedrock
      for (let i = 0; i < 10; i++) {
        const engine = AIEngineFactory.create();
        expect(engine).toBeInstanceOf(BedrockEngine);
      }
    });

    it('should route approximately 50% traffic to Bedrock when BEDROCK_TRAFFIC_PERCENTAGE is 50', () => {
      process.env.BEDROCK_TRAFFIC_PERCENTAGE = '50';
      
      let bedrockCount = 0;
      let openaiCount = 0;
      const iterations = 100;
      
      // Mock Math.random to test distribution
      const originalRandom = Math.random;
      let callCount = 0;
      Math.random = jest.fn(() => {
        // Alternate between values below and above 50
        return callCount++ % 2 === 0 ? 0.25 : 0.75;
      });
      
      for (let i = 0; i < iterations; i++) {
        const engine = AIEngineFactory.create();
        if (engine instanceof BedrockEngine) {
          bedrockCount++;
        } else if (engine instanceof AIEngine) {
          openaiCount++;
        }
      }
      
      Math.random = originalRandom;
      
      // Should be approximately 50/50 split
      expect(bedrockCount).toBe(50);
      expect(openaiCount).toBe(50);
    });

    it('should route approximately 10% traffic to Bedrock when BEDROCK_TRAFFIC_PERCENTAGE is 10', () => {
      process.env.BEDROCK_TRAFFIC_PERCENTAGE = '10';
      
      let bedrockCount = 0;
      let openaiCount = 0;
      const iterations = 100;
      
      // Mock Math.random to test distribution
      const originalRandom = Math.random;
      let callCount = 0;
      Math.random = jest.fn(() => {
        // Return values that give us 10% Bedrock
        return callCount++ < 10 ? 0.05 : 0.50;
      });
      
      for (let i = 0; i < iterations; i++) {
        const engine = AIEngineFactory.create();
        if (engine instanceof BedrockEngine) {
          bedrockCount++;
        } else if (engine instanceof AIEngine) {
          openaiCount++;
        }
      }
      
      Math.random = originalRandom;
      
      // Should be approximately 10/90 split
      expect(bedrockCount).toBe(10);
      expect(openaiCount).toBe(90);
    });

    it('should ignore canary logic when provider is explicitly specified', () => {
      process.env.BEDROCK_TRAFFIC_PERCENTAGE = '50';
      
      // Explicit provider should override canary logic
      const bedrockEngine = AIEngineFactory.create('BEDROCK');
      expect(bedrockEngine).toBeInstanceOf(BedrockEngine);
      
      const openaiEngine = AIEngineFactory.create('OPENAI');
      expect(openaiEngine).toBeInstanceOf(AIEngine);
    });

    it('should handle invalid BEDROCK_TRAFFIC_PERCENTAGE values', () => {
      // Negative value
      process.env.BEDROCK_TRAFFIC_PERCENTAGE = '-10';
      let engine = AIEngineFactory.create();
      expect(engine).toBeInstanceOf(AIEngine); // Falls back to base provider
      
      // Over 100
      process.env.BEDROCK_TRAFFIC_PERCENTAGE = '150';
      engine = AIEngineFactory.create();
      expect(engine).toBeInstanceOf(AIEngine); // Falls back to base provider
      
      // Non-numeric
      process.env.BEDROCK_TRAFFIC_PERCENTAGE = 'invalid';
      engine = AIEngineFactory.create();
      expect(engine).toBeInstanceOf(AIEngine); // Falls back to base provider (NaN becomes 0)
    });

    it('should log canary deployment routing decisions', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      // Test 100% traffic
      process.env.BEDROCK_TRAFFIC_PERCENTAGE = '100';
      AIEngineFactory.create();
      expect(consoleSpy).toHaveBeenCalledWith(
        '[AIEngineFactory] Canary deployment at 100% - routing to Bedrock'
      );
      
      consoleSpy.mockClear();
      
      // Test percentage routing
      process.env.BEDROCK_TRAFFIC_PERCENTAGE = '50';
      const originalRandom = Math.random;
      Math.random = jest.fn(() => 0.25); // Below 50%
      
      AIEngineFactory.create();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[AIEngineFactory] Canary deployment: routing to Bedrock')
      );
      
      Math.random = originalRandom;
      consoleSpy.mockRestore();
    });
  });
});

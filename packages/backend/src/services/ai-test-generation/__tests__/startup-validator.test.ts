/**
 * Unit Tests for Startup Configuration Validator
 * 
 * Tests configuration validation on Lambda cold start.
 * 
 * **Validates: Requirements 11.6, 11.7**
 */

import {
  validateStartupConfiguration,
  getValidatedConfiguration,
  resetConfigurationCache,
  isConfigurationValidated,
} from '../startup-validator';

describe('StartupValidator', () => {
  // Store original environment variables
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment to defaults
    process.env = {
      ...originalEnv,
      AI_PROVIDER: 'BEDROCK',
      BEDROCK_REGION: 'us-east-1',
      BEDROCK_MODEL_ID: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
      BEDROCK_TIMEOUT: '30000',
    };

    // Reset configuration cache before each test
    resetConfigurationCache();
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('validateStartupConfiguration', () => {
    it('should validate and return configuration with valid environment variables', () => {
      const config = validateStartupConfiguration();

      expect(config).toBeDefined();
      expect(config.provider).toBe('BEDROCK');
      expect(config.region).toBe('us-east-1');
      expect(config.modelId).toBe('anthropic.claude-3-5-sonnet-20241022-v2:0');
      expect(config.timeout).toBe(30000);
    });

    it('should cache configuration after first validation', () => {
      const config1 = validateStartupConfiguration();
      const config2 = validateStartupConfiguration();

      expect(config1).toBe(config2); // Same object reference
      expect(isConfigurationValidated()).toBe(true);
    });

    it('should throw error for invalid AI_PROVIDER', () => {
      process.env.AI_PROVIDER = 'INVALID_PROVIDER';

      expect(() => validateStartupConfiguration()).toThrow(/Invalid Bedrock configuration/);
      expect(() => validateStartupConfiguration()).toThrow(/AI_PROVIDER/);
    });

    it('should throw error for invalid BEDROCK_REGION format', () => {
      process.env.BEDROCK_REGION = 'invalid-region';

      expect(() => validateStartupConfiguration()).toThrow(/Invalid Bedrock configuration/);
      expect(() => validateStartupConfiguration()).toThrow(/BEDROCK_REGION/);
    });

    it('should throw error for invalid BEDROCK_TIMEOUT', () => {
      process.env.BEDROCK_TIMEOUT = 'not-a-number';

      expect(() => validateStartupConfiguration()).toThrow(/Invalid Bedrock configuration/);
      expect(() => validateStartupConfiguration()).toThrow(/BEDROCK_TIMEOUT/);
    });

    it('should throw error for negative BEDROCK_TIMEOUT', () => {
      process.env.BEDROCK_TIMEOUT = '-1000';

      expect(() => validateStartupConfiguration()).toThrow(/Invalid Bedrock configuration/);
      expect(() => validateStartupConfiguration()).toThrow(/BEDROCK_TIMEOUT/);
    });

    it('should use default values when environment variables are not set', () => {
      delete process.env.AI_PROVIDER;
      delete process.env.BEDROCK_REGION;
      delete process.env.BEDROCK_MODEL_ID;
      delete process.env.BEDROCK_TIMEOUT;

      const config = validateStartupConfiguration();

      expect(config.provider).toBe('BEDROCK');
      expect(config.region).toBe('us-east-1');
      expect(config.modelId).toBe('anthropic.claude-3-5-sonnet-20241022-v2:0');
      expect(config.timeout).toBe(30000);
    });

    it('should accept OPENAI as valid provider', () => {
      process.env.AI_PROVIDER = 'OPENAI';

      const config = validateStartupConfiguration();

      expect(config.provider).toBe('OPENAI');
    });

    it('should accept HUGGINGFACE as valid provider', () => {
      process.env.AI_PROVIDER = 'HUGGINGFACE';

      const config = validateStartupConfiguration();

      expect(config.provider).toBe('HUGGINGFACE');
    });

    it('should accept different AWS regions', () => {
      const validRegions = [
        'us-east-1',
        'us-west-2',
        'eu-west-1',
        'ap-southeast-1',
      ];

      validRegions.forEach((region) => {
        resetConfigurationCache();
        process.env.BEDROCK_REGION = region;

        const config = validateStartupConfiguration();
        expect(config.region).toBe(region);
      });
    });

    it('should accept different Claude model IDs', () => {
      const validModels = [
        'anthropic.claude-3-5-sonnet-20241022-v2:0',
        'anthropic.claude-3-5-sonnet-20240620-v1:0',
        'anthropic.claude-3-opus-20240229-v1:0',
      ];

      validModels.forEach((modelId) => {
        resetConfigurationCache();
        process.env.BEDROCK_MODEL_ID = modelId;

        const config = validateStartupConfiguration();
        expect(config.modelId).toBe(modelId);
      });
    });

    it('should accept different timeout values', () => {
      const validTimeouts = ['5000', '30000', '60000', '120000'];

      validTimeouts.forEach((timeout) => {
        resetConfigurationCache();
        process.env.BEDROCK_TIMEOUT = timeout;

        const config = validateStartupConfiguration();
        expect(config.timeout).toBe(parseInt(timeout, 10));
      });
    });
  });

  describe('getValidatedConfiguration', () => {
    it('should return cached configuration if already validated', () => {
      const config1 = validateStartupConfiguration();
      const config2 = getValidatedConfiguration();

      expect(config1).toBe(config2);
    });

    it('should validate and cache configuration if not yet validated', () => {
      const config = getValidatedConfiguration();

      expect(config).toBeDefined();
      expect(isConfigurationValidated()).toBe(true);
    });
  });

  describe('resetConfigurationCache', () => {
    it('should clear cached configuration', () => {
      validateStartupConfiguration();
      expect(isConfigurationValidated()).toBe(true);

      resetConfigurationCache();
      expect(isConfigurationValidated()).toBe(false);
    });

    it('should allow re-validation after reset', () => {
      const config1 = validateStartupConfiguration();
      resetConfigurationCache();
      const config2 = validateStartupConfiguration();

      expect(config1).not.toBe(config2); // Different object references
      expect(config1).toEqual(config2); // Same values
    });
  });

  describe('isConfigurationValidated', () => {
    it('should return false before validation', () => {
      expect(isConfigurationValidated()).toBe(false);
    });

    it('should return true after validation', () => {
      validateStartupConfiguration();
      expect(isConfigurationValidated()).toBe(true);
    });

    it('should return false after reset', () => {
      validateStartupConfiguration();
      resetConfigurationCache();
      expect(isConfigurationValidated()).toBe(false);
    });
  });

  describe('Configuration Logging', () => {
    let consoleLogSpy: jest.SpyInstance;
    let consoleErrorSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
      consoleLogSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    it('should log configuration on successful validation', () => {
      validateStartupConfiguration();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[StartupValidator] Validating Bedrock configuration')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[StartupValidator] ✓ Configuration validation successful')
      );
    });

    it('should log configuration values (excluding secrets)', () => {
      validateStartupConfiguration();

      // Check that configuration values are logged
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('AI Provider: BEDROCK')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Region: us-east-1')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Model ID: anthropic.claude-3-5-sonnet-20241022-v2:0')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Timeout: 30000ms')
      );
    });

    it('should log errors on validation failure', () => {
      process.env.AI_PROVIDER = 'INVALID';

      expect(() => validateStartupConfiguration()).toThrow();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[StartupValidator] ✗ Configuration validation failed')
      );
      // Check that error details were logged (either in BedrockConfig or StartupValidator)
      const allErrorCalls = consoleErrorSpy.mock.calls.flat();
      const hasErrorDetails = allErrorCalls.some(call => 
        typeof call === 'string' && (
          call.includes('AI_PROVIDER') || 
          call.includes('Invalid Bedrock configuration')
        )
      );
      expect(hasErrorDetails).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string environment variables', () => {
      process.env.AI_PROVIDER = '';
      process.env.BEDROCK_REGION = '';

      // Empty strings default to the default values, so validation should pass
      const config = validateStartupConfiguration();
      expect(config.provider).toBe('BEDROCK');
      expect(config.region).toBe('us-east-1');
    });

    it('should handle whitespace in environment variables', () => {
      process.env.BEDROCK_REGION = '  us-east-1  ';

      // Should fail because whitespace is not trimmed
      expect(() => validateStartupConfiguration()).toThrow(/Invalid Bedrock configuration/);
    });

    it('should handle case-insensitive AI_PROVIDER', () => {
      process.env.AI_PROVIDER = 'bedrock';

      const config = validateStartupConfiguration();
      expect(config.provider).toBe('BEDROCK');
    });

    it('should handle very large timeout values', () => {
      process.env.BEDROCK_TIMEOUT = '999999999';

      const config = validateStartupConfiguration();
      expect(config.timeout).toBe(999999999);
    });
  });
});

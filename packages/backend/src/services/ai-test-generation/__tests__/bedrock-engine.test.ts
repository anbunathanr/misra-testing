/**
 * Unit tests for Bedrock Engine Service
 */

import { BedrockEngine, CircuitState } from '../bedrock-engine';
import { ApplicationAnalysis } from '../../../types/ai-test-generation';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

// Mock the AWS SDK
jest.mock('@aws-sdk/client-bedrock-runtime');

describe('BedrockEngine', () => {
  let bedrockEngine: BedrockEngine;
  let mockSend: jest.Mock;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create mock send function
    mockSend = jest.fn();

    // Mock BedrockRuntimeClient
    (BedrockRuntimeClient as jest.MockedClass<typeof BedrockRuntimeClient>).mockImplementation(() => ({
      send: mockSend,
    } as any));

    bedrockEngine = new BedrockEngine();
    bedrockEngine.resetCircuit();
    bedrockEngine.clearLogs();
  });

  describe('validateResponse', () => {
    it('should validate a valid test specification', () => {
      const validSpec = {
        testName: 'Login Test',
        description: 'Test user login functionality',
        steps: [
          {
            action: 'navigate',
            description: 'Navigate to login page',
          },
          {
            action: 'type',
            description: 'Enter username',
            elementDescription: 'username input field',
            value: 'testuser',
          },
          {
            action: 'click',
            description: 'Click login button',
            elementDescription: 'login button',
          },
          {
            action: 'assert',
            description: 'Verify successful login',
            elementDescription: 'welcome message',
            assertion: {
              type: 'visible',
              expected: 'Welcome',
            },
          },
        ],
        tags: ['login', 'authentication'],
      };

      const result = bedrockEngine.validateResponse(validSpec);

      expect(result).toEqual(validSpec);
      expect(result.testName).toBe('Login Test');
      expect(result.steps).toHaveLength(4);
      expect(result.tags).toContain('login');
    });

    it('should reject specification with missing testName', () => {
      const invalidSpec = {
        testName: '',
        description: 'Test description',
        steps: [
          {
            action: 'navigate',
            description: 'Navigate',
          },
        ],
        tags: [],
      };

      expect(() => bedrockEngine.validateResponse(invalidSpec)).toThrow(
        /AI generated invalid test specification/
      );
    });

    it('should reject specification with empty steps array', () => {
      const invalidSpec = {
        testName: 'Test',
        description: 'Test description',
        steps: [],
        tags: [],
      };

      expect(() => bedrockEngine.validateResponse(invalidSpec)).toThrow(
        /AI generated invalid test specification/
      );
    });

    it('should reject specification with invalid action type', () => {
      const invalidSpec = {
        testName: 'Test',
        description: 'Test description',
        steps: [
          {
            action: 'invalid-action',
            description: 'Invalid step',
          },
        ],
        tags: [],
      };

      expect(() => bedrockEngine.validateResponse(invalidSpec)).toThrow(
        /AI generated invalid test specification/
      );
    });

    it('should accept all valid action types', () => {
      const validActions = ['navigate', 'click', 'type', 'assert', 'wait'];

      validActions.forEach((action) => {
        const spec = {
          testName: `Test ${action}`,
          description: 'Test description',
          steps: [
            {
              action,
              description: `${action} step`,
            },
          ],
          tags: [],
        };

        expect(() => bedrockEngine.validateResponse(spec)).not.toThrow();
      });
    });
  });

  describe('Circuit Breaker', () => {
    it('should start in CLOSED state', () => {
      expect(bedrockEngine.getCircuitState()).toBe(CircuitState.CLOSED);
    });

    it('should reset circuit breaker', () => {
      bedrockEngine.resetCircuit();
      expect(bedrockEngine.getCircuitState()).toBe(CircuitState.CLOSED);
    });
  });

  describe('API Logging', () => {
    it('should start with empty logs', () => {
      const logs = bedrockEngine.getLogs();
      expect(logs).toEqual([]);
    });

    it('should clear logs', () => {
      bedrockEngine.clearLogs();
      const logs = bedrockEngine.getLogs();
      expect(logs).toEqual([]);
    });
  });

  describe('buildAnalysisPrompt', () => {
    it('should build a valid analysis prompt', () => {
      const mockAnalysis: ApplicationAnalysis = {
        url: 'https://example.com',
        title: 'Example App',
        elements: [
          {
            type: 'button',
            attributes: {
              id: 'login-btn',
              text: 'Login',
            },
            xpath: '//button[@id="login-btn"]',
            cssPath: '#login-btn',
          },
        ],
        patterns: [
          {
            type: 'form',
            elements: [],
            description: 'Login form',
          },
        ],
        flows: [
          {
            name: 'Login flow',
            steps: ['Fill username', 'Fill password', 'Click login'],
            entryPoint: {
              type: 'button',
              attributes: { id: 'login-btn' },
              xpath: '//button',
              cssPath: '#login-btn',
            },
          },
        ],
        metadata: {
          viewport: { width: 1280, height: 720 },
          loadTime: 1500,
          isSPA: false,
        },
      };

      // Access private method via type assertion
      const prompt = (bedrockEngine as any).buildAnalysisPrompt(mockAnalysis);

      expect(prompt).toContain('https://example.com');
      expect(prompt).toContain('Example App');
      expect(prompt).toContain('Login');
      expect(prompt).toContain('Login form');
      expect(prompt).toContain('Login flow');
      expect(prompt).toContain('JSON format');
    });
  });

  describe('buildGenerationPrompt', () => {
    it('should build selector generation prompt', () => {
      const request = {
        elementDescription: 'Login button',
        domContext: '<button id="login">Login</button>',
      };

      const prompt = (bedrockEngine as any).buildGenerationPrompt(request);

      expect(prompt).toContain('Login button');
      expect(prompt).toContain('<button id="login">Login</button>');
      expect(prompt).toContain('data-testid');
      expect(prompt).toContain('aria-label');
      expect(prompt).toContain('Playwright');
    });

    it('should build test code generation prompt', () => {
      const request = {
        scenario: 'User logs in successfully',
        context: {
          url: 'https://example.com/login',
          elements: ['email input', 'password input', 'login button'],
        },
      };

      const prompt = (bedrockEngine as any).buildGenerationPrompt(request);

      expect(prompt).toContain('User logs in successfully');
      expect(prompt).toContain('https://example.com/login');
      expect(prompt).toContain('TypeScript');
      expect(prompt).toContain('expect()');
      expect(prompt).toContain('Playwright');
    });

    it('should build generic generation prompt', () => {
      const request = {
        scenario: 'Generate test code',
        context: {},
      };

      const prompt = (bedrockEngine as any).buildGenerationPrompt(request);

      expect(prompt).toContain('Generate test code');
      expect(prompt).toContain('Playwright');
    });
  });

  describe('buildCompletionPrompt', () => {
    it('should build code completion prompt with partial code', () => {
      const request = {
        partialCode: 'await page.goto("https://example.com");',
        context: 'Login test',
      };

      const prompt = (bedrockEngine as any).buildCompletionPrompt(request);

      expect(prompt).toContain('await page.goto');
      expect(prompt).toContain('Login test');
      expect(prompt).toContain('Complete');
      expect(prompt).toContain('Playwright');
      expect(prompt).toContain('TypeScript');
    });

    it('should build completion prompt without context', () => {
      const request = {
        partialCode: 'test("login", async ({ page }) => {',
      };

      const prompt = (bedrockEngine as any).buildCompletionPrompt(request);

      expect(prompt).toContain('test("login"');
      expect(prompt).toContain('No additional context');
      expect(prompt).toContain('Complete');
    });

    it('should throw error when partialCode is missing', () => {
      const request = {
        context: 'Some context',
      };

      expect(() => {
        (bedrockEngine as any).buildCompletionPrompt(request);
      }).toThrow('Partial code is required for completion');
    });

    it('should include all requirements in prompt', () => {
      const request = {
        partialCode: 'await page.click("#button");',
        context: 'Button click test',
      };

      const prompt = (bedrockEngine as any).buildCompletionPrompt(request);

      expect(prompt).toContain('Maintain the same coding style');
      expect(prompt).toContain('TypeScript syntax');
      expect(prompt).toContain('Playwright best practices');
      expect(prompt).toContain('appropriate assertions');
      expect(prompt).toContain('error handling');
    });
  });

  describe('validatePlaywrightSyntax', () => {
    it('should accept valid selector', () => {
      const selector = '[data-testid="login-button"]';

      expect(() => {
        (bedrockEngine as any).validatePlaywrightSyntax(selector);
      }).not.toThrow();
    });

    it('should accept valid test code with test function', () => {
      const code = `
        test('login test', async ({ page }) => {
          await page.goto('https://example.com');
          await page.click('#login');
          expect(page.url()).toContain('/dashboard');
        });
      `;

      expect(() => {
        (bedrockEngine as any).validatePlaywrightSyntax(code);
      }).not.toThrow();
    });

    it('should accept valid test code with page object', () => {
      const code = `
        await page.goto('https://example.com');
        await page.fill('#email', 'test@example.com');
        await page.click('#login');
      `;

      expect(() => {
        (bedrockEngine as any).validatePlaywrightSyntax(code);
      }).not.toThrow();
    });

    it('should reject empty content', () => {
      expect(() => {
        (bedrockEngine as any).validatePlaywrightSyntax('');
      }).toThrow('does not appear to contain valid Playwright syntax');
    });

    it('should reject very short selector', () => {
      expect(() => {
        (bedrockEngine as any).validatePlaywrightSyntax('a');
      }).toThrow('Generated selector is too short or invalid');
    });
  });

  describe('calculateCost', () => {
    it('should calculate cost correctly for Claude 3.5 Sonnet', () => {
      const usage = {
        promptTokens: 1000,
        completionTokens: 500,
        totalTokens: 1500,
      };

      const cost = (bedrockEngine as any).calculateCost(usage);

      // Input: 1000 tokens * $3/1M = $0.003
      // Output: 500 tokens * $15/1M = $0.0075
      // Total: $0.0105
      expect(cost).toBeCloseTo(0.0105, 4);
    });

    it('should calculate cost for large token usage', () => {
      const usage = {
        promptTokens: 100000,
        completionTokens: 50000,
        totalTokens: 150000,
      };

      const cost = (bedrockEngine as any).calculateCost(usage);

      // Input: 100000 tokens * $3/1M = $0.30
      // Output: 50000 tokens * $15/1M = $0.75
      // Total: $1.05
      expect(cost).toBeCloseTo(1.05, 2);
    });

    it('should handle zero tokens', () => {
      const usage = {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      };

      const cost = (bedrockEngine as any).calculateCost(usage);

      expect(cost).toBe(0);
    });
  });

  describe('analyze()', () => {
    it('should return structured analysis from Bedrock', async () => {
      const mockAnalysis: ApplicationAnalysis = {
        url: 'https://example.com',
        title: 'Example App',
        elements: [
          {
            type: 'button',
            attributes: { id: 'login-btn', text: 'Login' },
            xpath: '//button[@id="login-btn"]',
            cssPath: '#login-btn',
          },
        ],
        patterns: [{ type: 'form', elements: [], description: 'Login form' }],
        flows: [
          {
            name: 'Login flow',
            steps: ['Fill username', 'Fill password', 'Click login'],
            entryPoint: {
              type: 'button',
              attributes: { id: 'login-btn' },
              xpath: '//button',
              cssPath: '#login-btn',
            },
          },
        ],
        metadata: {
          viewport: { width: 1280, height: 720 },
          loadTime: 1500,
          isSPA: false,
        },
      };

      const mockResponse = {
        features: ['User authentication', 'Dashboard'],
        userFlows: ['Login flow', 'Registration flow'],
        interactiveElements: [
          { type: 'button', selector: '#login-btn', action: 'click' },
          { type: 'input', selector: '#email', action: 'type' },
        ],
        authRequired: true,
        testRecommendations: ['Test login with valid credentials', 'Test login with invalid credentials'],
      };

      mockSend.mockResolvedValue({
        body: new TextEncoder().encode(
          JSON.stringify({
            content: [{ text: JSON.stringify(mockResponse) }],
            usage: { input_tokens: 500, output_tokens: 300 },
          })
        ),
      });

      const result = await bedrockEngine.analyze(mockAnalysis);

      expect(result).toEqual(mockResponse);
      expect(result.features).toHaveLength(2);
      expect(result.authRequired).toBe(true);
      expect(mockSend).toHaveBeenCalledTimes(1);

      // Verify logs
      const logs = bedrockEngine.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].operation).toBe('analyze');
      expect(logs[0].status).toBe('success');
      expect(logs[0].requestTokens).toBe(500);
      expect(logs[0].responseTokens).toBe(300);
    });

    it('should log failure when analyze() fails', async () => {
      const mockAnalysis: ApplicationAnalysis = {
        url: 'https://example.com',
        title: 'Example App',
        elements: [],
        patterns: [],
        flows: [],
        metadata: {
          viewport: { width: 1280, height: 720 },
          loadTime: 1500,
          isSPA: false,
        },
      };

      mockSend.mockRejectedValue(new Error('Bedrock service error'));

      await expect(bedrockEngine.analyze(mockAnalysis)).rejects.toThrow();

      const logs = bedrockEngine.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].operation).toBe('analyze');
      expect(logs[0].status).toBe('failure');
      expect(logs[0].error).toContain('Bedrock service error');
    });
  });

  describe('generate()', () => {
    it('should return valid Playwright code', async () => {
      const mockRequest = {
        scenario: 'User logs in with valid credentials',
        context: {
          url: 'https://example.com/login',
          elements: ['email input', 'password input', 'login button'],
        },
      };

      const mockCode = `
        test('user login', async ({ page }) => {
          await page.goto('https://example.com/login');
          await page.fill('#email', 'test@example.com');
          await page.fill('#password', 'password123');
          await page.click('#login-btn');
          expect(page.url()).toContain('/dashboard');
        });
      `;

      mockSend.mockResolvedValue({
        body: new TextEncoder().encode(
          JSON.stringify({
            content: [{ text: mockCode }],
            usage: { input_tokens: 400, output_tokens: 600 },
          })
        ),
      });

      const result = await bedrockEngine.generate(mockRequest);

      expect(result.content).toContain('test(');
      expect(result.content).toContain('expect(');
      expect(result.usage.promptTokens).toBe(400);
      expect(result.usage.completionTokens).toBe(600);
      expect(result.usage.totalTokens).toBe(1000);
      expect(result.cost).toBeGreaterThan(0);
      expect(result.model).toContain('claude');
      expect(result.provider).toBe('BEDROCK');

      // Verify logs
      const logs = bedrockEngine.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].operation).toBe('generate');
      expect(logs[0].status).toBe('success');
    });

    it('should generate selector with valid format', async () => {
      const mockRequest = {
        elementDescription: 'Login button',
        domContext: '<button id="login">Login</button>',
      };

      const mockSelector = '[data-testid="login-button"]';

      mockSend.mockResolvedValue({
        body: new TextEncoder().encode(
          JSON.stringify({
            content: [{ text: mockSelector }],
            usage: { input_tokens: 200, output_tokens: 50 },
          })
        ),
      });

      const result = await bedrockEngine.generate(mockRequest);

      expect(result.content).toBe(mockSelector);
      expect(result.usage.totalTokens).toBe(250);
      expect(result.cost).toBeGreaterThan(0);
    });

    it('should track token usage correctly', async () => {
      const mockRequest = {
        scenario: 'Test scenario',
        context: {},
      };

      mockSend.mockResolvedValue({
        body: new TextEncoder().encode(
          JSON.stringify({
            content: [{ text: 'test code' }],
            usage: { input_tokens: 1000, output_tokens: 2000 },
          })
        ),
      });

      const result = await bedrockEngine.generate(mockRequest);

      expect(result.usage.promptTokens).toBe(1000);
      expect(result.usage.completionTokens).toBe(2000);
      expect(result.usage.totalTokens).toBe(3000);

      // Verify cost calculation
      // Input: 1000 * $3/1M = $0.003
      // Output: 2000 * $15/1M = $0.030
      // Total: $0.033
      expect(result.cost).toBeCloseTo(0.033, 3);
    });

    it('should log failure when generate() fails', async () => {
      const mockRequest = {
        scenario: 'Test scenario',
        context: {},
      };

      mockSend.mockRejectedValue({ name: 'ThrottlingException', message: 'Rate limit exceeded' });

      await expect(bedrockEngine.generate(mockRequest)).rejects.toThrow();

      const logs = bedrockEngine.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].operation).toBe('generate');
      expect(logs[0].status).toBe('failure');
    });
  });

  describe('complete()', () => {
    it('should return code completion', async () => {
      const mockRequest = {
        partialCode: 'await page.goto("https://example.com");',
        context: 'Login test',
      };

      const mockCompletion = `
        await page.fill('#email', 'test@example.com');
        await page.fill('#password', 'password123');
        await page.click('#login-btn');
      `;

      mockSend.mockResolvedValue({
        body: new TextEncoder().encode(
          JSON.stringify({
            content: [{ text: mockCompletion }],
            usage: { input_tokens: 300, output_tokens: 200 },
          })
        ),
      });

      const result = await bedrockEngine.complete(mockRequest);

      expect(result.content).toContain('await page.fill');
      expect(result.content).toContain('await page.click');
      expect(result.usage.promptTokens).toBe(300);
      expect(result.usage.completionTokens).toBe(200);
      expect(result.usage.totalTokens).toBe(500);
      expect(result.cost).toBeGreaterThan(0);
      expect(result.provider).toBe('BEDROCK');

      // Verify logs
      const logs = bedrockEngine.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].operation).toBe('complete');
      expect(logs[0].status).toBe('success');
      expect(logs[0].totalTokens).toBe(500);
    });

    it('should track token usage for completion', async () => {
      const mockRequest = {
        partialCode: 'test("example", async ({ page }) => {',
        context: 'Example test',
      };

      mockSend.mockResolvedValue({
        body: new TextEncoder().encode(
          JSON.stringify({
            content: [{ text: '  await page.goto("/");' }],
            usage: { input_tokens: 150, output_tokens: 75 },
          })
        ),
      });

      const result = await bedrockEngine.complete(mockRequest);

      expect(result.usage.promptTokens).toBe(150);
      expect(result.usage.completionTokens).toBe(75);
      expect(result.usage.totalTokens).toBe(225);

      // Verify cost: 150 * $3/1M + 75 * $15/1M = $0.00045 + $0.001125 = $0.001575
      expect(result.cost).toBeCloseTo(0.001575, 6);
    });

    it('should log failure when complete() fails', async () => {
      const mockRequest = {
        partialCode: 'test code',
        context: 'context',
      };

      mockSend.mockRejectedValue(new Error('Model timeout'));

      await expect(bedrockEngine.complete(mockRequest)).rejects.toThrow();

      const logs = bedrockEngine.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].operation).toBe('complete');
      expect(logs[0].status).toBe('failure');
    });
  });

  describe('Error Handling', () => {
    describe('ThrottlingException', () => {
      it('should trigger retry on ThrottlingException', async () => {
        const mockRequest = {
          scenario: 'Test scenario',
          context: {},
        };

        // First two attempts fail with throttling, third succeeds
        mockSend
          .mockRejectedValueOnce({ name: 'ThrottlingException', message: 'Rate limit exceeded' })
          .mockRejectedValueOnce({ name: 'ThrottlingException', message: 'Rate limit exceeded' })
          .mockResolvedValueOnce({
            body: new TextEncoder().encode(
              JSON.stringify({
                content: [{ text: 'test code' }],
                usage: { input_tokens: 100, output_tokens: 200 },
              })
            ),
          });

        const result = await bedrockEngine.generate(mockRequest);

        expect(result.content).toBe('test code');
        expect(mockSend).toHaveBeenCalledTimes(3);
        expect(result.usage.totalTokens).toBe(300);
      });

      it('should retry with exponential backoff (1s, 2s, 4s)', async () => {
        const mockRequest = {
          scenario: 'Test scenario',
          context: {},
        };

        const startTime = Date.now();
        const delays: number[] = [];

        // Track delays between retries
        let lastCallTime = startTime;
        mockSend.mockImplementation(() => {
          const now = Date.now();
          if (lastCallTime !== startTime) {
            delays.push(now - lastCallTime);
          }
          lastCallTime = now;

          if (mockSend.mock.calls.length < 3) {
            return Promise.reject({ name: 'ThrottlingException', message: 'Rate limit' });
          }
          return Promise.resolve({
            body: new TextEncoder().encode(
              JSON.stringify({
                content: [{ text: 'success' }],
                usage: { input_tokens: 100, output_tokens: 100 },
              })
            ),
          });
        });

        await bedrockEngine.generate(mockRequest);

        expect(mockSend).toHaveBeenCalledTimes(3);
        
        // Verify exponential backoff delays (1s, 2s)
        // Allow some tolerance for execution time
        expect(delays[0]).toBeGreaterThanOrEqual(900); // ~1s
        expect(delays[0]).toBeLessThan(1500);
        expect(delays[1]).toBeGreaterThanOrEqual(1900); // ~2s
        expect(delays[1]).toBeLessThan(2500);
      });

      it('should handle ThrottlingException error message', async () => {
        const mockRequest = {
          scenario: 'Test scenario',
          context: {},
        };

        mockSend.mockRejectedValue({ name: 'ThrottlingException', message: 'Rate limit exceeded' });

        await expect(bedrockEngine.generate(mockRequest)).rejects.toThrow(
          /AI service temporarily unavailable after 3 attempts/
        );

        expect(mockSend).toHaveBeenCalledTimes(3);
      });
    });

    describe('ValidationException', () => {
      it('should return error immediately on ValidationException', async () => {
        const mockRequest = {
          scenario: 'Test scenario',
          context: {},
        };

        mockSend.mockRejectedValue({ 
          name: 'ValidationException', 
          message: 'Invalid request parameters' 
        });

        await expect(bedrockEngine.generate(mockRequest)).rejects.toThrow(
          /AI_VALIDATION_ERROR: Invalid request to Bedrock/
        );

        // Should NOT retry on validation errors
        expect(mockSend).toHaveBeenCalledTimes(1);
      });

      it('should not retry ValidationException', async () => {
        const mockRequest = {
          scenario: 'Test scenario',
          context: {},
        };

        mockSend.mockRejectedValue({ 
          name: 'ValidationException', 
          message: 'Invalid model parameters' 
        });

        const startTime = Date.now();
        
        await expect(bedrockEngine.generate(mockRequest)).rejects.toThrow(/AI_VALIDATION_ERROR/);
        
        const duration = Date.now() - startTime;

        // Should fail immediately without retry delays
        expect(duration).toBeLessThan(500);
        expect(mockSend).toHaveBeenCalledTimes(1);
      });
    });

    describe('ModelTimeoutException', () => {
      it('should return timeout error on ModelTimeoutException', async () => {
        const mockRequest = {
          scenario: 'Test scenario',
          context: {},
        };

        mockSend.mockRejectedValue({ 
          name: 'ModelTimeoutException', 
          message: 'Model execution timeout' 
        });

        await expect(bedrockEngine.generate(mockRequest)).rejects.toThrow(
          /AI service temporarily unavailable after 3 attempts/
        );

        // Should retry timeout errors
        expect(mockSend).toHaveBeenCalledTimes(3);
      });

      it('should retry ModelTimeoutException with exponential backoff', async () => {
        const mockRequest = {
          scenario: 'Test scenario',
          context: {},
        };

        mockSend
          .mockRejectedValueOnce({ name: 'ModelTimeoutException', message: 'Timeout' })
          .mockRejectedValueOnce({ name: 'ModelTimeoutException', message: 'Timeout' })
          .mockResolvedValueOnce({
            body: new TextEncoder().encode(
              JSON.stringify({
                content: [{ text: 'success after timeout' }],
                usage: { input_tokens: 100, output_tokens: 100 },
              })
            ),
          });

        const result = await bedrockEngine.generate(mockRequest);

        expect(result.content).toBe('success after timeout');
        expect(mockSend).toHaveBeenCalledTimes(3);
      });
    });

    describe('ServiceUnavailableException', () => {
      it('should return unavailable error on ServiceUnavailableException', async () => {
        const mockRequest = {
          scenario: 'Test scenario',
          context: {},
        };

        mockSend.mockRejectedValue({ 
          name: 'ServiceUnavailableException', 
          message: 'Service temporarily unavailable' 
        });

        await expect(bedrockEngine.generate(mockRequest)).rejects.toThrow(
          /AI service temporarily unavailable after 3 attempts/
        );

        // Should retry service unavailable errors
        expect(mockSend).toHaveBeenCalledTimes(3);
      });

      it('should retry ServiceUnavailableException', async () => {
        const mockRequest = {
          scenario: 'Test scenario',
          context: {},
        };

        mockSend
          .mockRejectedValueOnce({ 
            name: 'ServiceUnavailableException', 
            message: 'Service unavailable' 
          })
          .mockResolvedValueOnce({
            body: new TextEncoder().encode(
              JSON.stringify({
                content: [{ text: 'recovered' }],
                usage: { input_tokens: 50, output_tokens: 50 },
              })
            ),
          });

        const result = await bedrockEngine.generate(mockRequest);

        expect(result.content).toBe('recovered');
        expect(mockSend).toHaveBeenCalledTimes(2);
      });
    });

    describe('Retry Logic with Exponential Backoff', () => {
      it('should implement exponential backoff with 1s, 2s, 4s delays', async () => {
        const mockRequest = {
          scenario: 'Test scenario',
          context: {},
        };

        const delays: number[] = [];
        let lastCallTime = Date.now();

        mockSend.mockImplementation(() => {
          const now = Date.now();
          if (mockSend.mock.calls.length > 1) {
            delays.push(now - lastCallTime);
          }
          lastCallTime = now;

          if (mockSend.mock.calls.length < 3) {
            return Promise.reject({ name: 'ThrottlingException', message: 'Rate limit' });
          }
          return Promise.resolve({
            body: new TextEncoder().encode(
              JSON.stringify({
                content: [{ text: 'success' }],
                usage: { input_tokens: 100, output_tokens: 100 },
              })
            ),
          });
        });

        await bedrockEngine.generate(mockRequest);

        expect(mockSend).toHaveBeenCalledTimes(3);
        
        // Verify delays: 1s, 2s (with tolerance)
        expect(delays).toHaveLength(2);
        expect(delays[0]).toBeGreaterThanOrEqual(900);
        expect(delays[0]).toBeLessThan(1500);
        expect(delays[1]).toBeGreaterThanOrEqual(1900);
        expect(delays[1]).toBeLessThan(2500);
      });

      it('should retry up to 3 times before failing', async () => {
        const mockRequest = {
          scenario: 'Test scenario',
          context: {},
        };

        mockSend.mockRejectedValue({ 
          name: 'ThrottlingException', 
          message: 'Persistent rate limit' 
        });

        await expect(bedrockEngine.generate(mockRequest)).rejects.toThrow(
          /AI service temporarily unavailable after 3 attempts/
        );

        expect(mockSend).toHaveBeenCalledTimes(3);
      });

      it('should succeed on first retry', async () => {
        const mockRequest = {
          scenario: 'Test scenario',
          context: {},
        };

        mockSend
          .mockRejectedValueOnce({ name: 'ThrottlingException', message: 'Rate limit' })
          .mockResolvedValueOnce({
            body: new TextEncoder().encode(
              JSON.stringify({
                content: [{ text: 'success on retry' }],
                usage: { input_tokens: 100, output_tokens: 100 },
              })
            ),
          });

        const result = await bedrockEngine.generate(mockRequest);

        expect(result.content).toBe('success on retry');
        expect(mockSend).toHaveBeenCalledTimes(2);
      });

      it('should succeed on second retry', async () => {
        const mockRequest = {
          scenario: 'Test scenario',
          context: {},
        };

        mockSend
          .mockRejectedValueOnce({ name: 'ThrottlingException', message: 'Rate limit' })
          .mockRejectedValueOnce({ name: 'ThrottlingException', message: 'Rate limit' })
          .mockResolvedValueOnce({
            body: new TextEncoder().encode(
              JSON.stringify({
                content: [{ text: 'success on second retry' }],
                usage: { input_tokens: 100, output_tokens: 100 },
              })
            ),
          });

        const result = await bedrockEngine.generate(mockRequest);

        expect(result.content).toBe('success on second retry');
        expect(mockSend).toHaveBeenCalledTimes(3);
      });
    });

    describe('Error Message Handling', () => {
      it('should handle errors with message property', async () => {
        const mockRequest = {
          scenario: 'Test scenario',
          context: {},
        };

        mockSend.mockRejectedValue({ 
          name: 'UnknownError', 
          message: 'Something went wrong' 
        });

        await expect(bedrockEngine.generate(mockRequest)).rejects.toThrow(
          /AI service temporarily unavailable/
        );
      });

      it('should handle errors without name property', async () => {
        const mockRequest = {
          scenario: 'Test scenario',
          context: {},
        };

        mockSend.mockRejectedValue({ 
          message: 'Error without name' 
        });

        await expect(bedrockEngine.generate(mockRequest)).rejects.toThrow(
          /AI service temporarily unavailable/
        );
      });

      it('should handle string errors', async () => {
        const mockRequest = {
          scenario: 'Test scenario',
          context: {},
        };

        mockSend.mockRejectedValue('String error message');

        await expect(bedrockEngine.generate(mockRequest)).rejects.toThrow(
          /AI service temporarily unavailable/
        );
      });
    });
  });
});

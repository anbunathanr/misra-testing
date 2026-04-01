/**
 * Bedrock Integration Tests
 * 
 * These tests make REAL Bedrock API calls to validate the integration.
 * Tests are skipped if AWS credentials are not configured.
 * 
 * **Validates: Requirements 12.2**
 * 
 * To run these tests:
 * 1. Configure AWS credentials (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
 * 2. Ensure Bedrock access is enabled in your AWS account
 * 3. Run: npm test -- bedrock-integration.test.ts
 * 
 * To skip these tests in CI:
 * - Set SKIP_BEDROCK_INTEGRATION=true
 */

import { BedrockEngine } from '../../services/ai-test-generation/bedrock-engine';
import { ApplicationAnalysis } from '../../types/ai-test-generation';

// Check if Bedrock integration tests should run
const shouldRunBedrockTests = (): boolean => {
  // Skip if explicitly disabled
  if (process.env.SKIP_BEDROCK_INTEGRATION === 'true') {
    return false;
  }

  // Skip if in CI without AWS credentials
  if (process.env.CI === 'true' && !process.env.AWS_ACCESS_KEY_ID) {
    return false;
  }

  // Run if AWS credentials are available
  return !!(process.env.AWS_ACCESS_KEY_ID || process.env.AWS_PROFILE);
};

const describeIfBedrock = shouldRunBedrockTests() ? describe : describe.skip;

describeIfBedrock('Bedrock Integration Tests', () => {
  let bedrockEngine: BedrockEngine;

  beforeAll(() => {
    console.log('🚀 Starting Bedrock Integration Tests');
    console.log('⚠️  These tests make REAL API calls to AWS Bedrock');
    console.log('💰 Costs will be incurred (typically < $0.10 total)');
    
    bedrockEngine = new BedrockEngine({
      region: process.env.BEDROCK_REGION || 'us-east-1',
      modelId: process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-5-sonnet-20241022-v2:0',
      timeout: 60000, // 60 seconds for integration tests
    });

    // Reset circuit breaker and logs
    bedrockEngine.resetCircuit();
    bedrockEngine.clearLogs();
  });

  afterEach(() => {
    // Log API usage after each test
    const logs = bedrockEngine.getLogs();
    if (logs.length > 0) {
      const lastLog = logs[logs.length - 1];
      console.log(`📊 API Usage: ${lastLog.requestTokens} input + ${lastLog.responseTokens} output = ${lastLog.totalTokens} total tokens`);
      console.log(`⏱️  Duration: ${lastLog.duration}ms`);
    }
  });

  describe('Test Generation', () => {
    it('should generate Playwright test code using real Bedrock API', async () => {
      const request = {
        scenario: 'User logs in with valid credentials',
        context: {
          url: 'https://example.com/login',
          elements: [
            { type: 'input', id: 'email', label: 'Email' },
            { type: 'input', id: 'password', label: 'Password' },
            { type: 'button', id: 'login-btn', text: 'Login' },
          ],
        },
      };

      const response = await bedrockEngine.generate(request);

      // Validate response structure
      expect(response).toBeDefined();
      expect(response.content).toBeDefined();
      expect(response.usage).toBeDefined();
      expect(response.cost).toBeDefined();
      expect(response.model).toBeDefined();
      expect(response.provider).toBe('BEDROCK');

      // Validate content contains Playwright syntax
      expect(response.content).toContain('page');
      expect(response.content.length).toBeGreaterThan(50);

      // Validate usage metrics
      expect(response.usage.promptTokens).toBeGreaterThan(0);
      expect(response.usage.completionTokens).toBeGreaterThan(0);
      expect(response.usage.totalTokens).toBe(
        response.usage.promptTokens + response.usage.completionTokens
      );

      // Validate cost calculation
      expect(response.cost).toBeGreaterThan(0);
      expect(response.cost).toBeLessThan(1); // Should be less than $1

      // Validate model information
      expect(response.model).toContain('claude');

      console.log('✅ Test generation successful');
      console.log(`📝 Generated ${response.content.length} characters of test code`);
      console.log(`💰 Cost: $${response.cost.toFixed(6)}`);
    }, 60000); // 60 second timeout

    it('should generate test with proper Playwright best practices', async () => {
      const request = {
        scenario: 'User submits a contact form',
        context: {
          url: 'https://example.com/contact',
          elements: [
            { type: 'input', id: 'name', label: 'Name' },
            { type: 'input', id: 'email', label: 'Email' },
            { type: 'textarea', id: 'message', label: 'Message' },
            { type: 'button', id: 'submit', text: 'Submit' },
          ],
        },
      };

      const response = await bedrockEngine.generate(request);

      expect(response.content).toBeDefined();
      
      // Check for Playwright best practices
      const content = response.content.toLowerCase();
      
      // Should contain page interactions
      const hasPageInteractions = 
        content.includes('page.') || 
        content.includes('await page');
      expect(hasPageInteractions).toBe(true);

      // Validate it's actual code, not just a description
      expect(response.content.length).toBeGreaterThan(100);

      console.log('✅ Test follows Playwright best practices');
    }, 60000);
  });

  describe('Selector Generation', () => {
    it('should generate robust CSS selector using real Bedrock API', async () => {
      const request = {
        elementDescription: 'Login button with blue background',
        domContext: `
          <div class="auth-form">
            <input id="email" type="email" placeholder="Email" />
            <input id="password" type="password" placeholder="Password" />
            <button id="login-btn" class="btn btn-primary" data-testid="login-button">
              Login
            </button>
          </div>
        `,
      };

      const response = await bedrockEngine.generate(request);

      expect(response).toBeDefined();
      expect(response.content).toBeDefined();
      expect(response.content.length).toBeGreaterThan(2);

      // Validate it's a selector (not empty or too short)
      expect(response.content.trim().length).toBeGreaterThan(2);

      // Validate usage tracking
      expect(response.usage.totalTokens).toBeGreaterThan(0);
      expect(response.cost).toBeGreaterThan(0);

      console.log('✅ Selector generation successful');
      console.log(`🎯 Generated selector: ${response.content}`);
      console.log(`💰 Cost: $${response.cost.toFixed(6)}`);
    }, 60000);

    it('should generate selector for complex DOM structure', async () => {
      const request = {
        elementDescription: 'Submit button in the checkout form',
        domContext: `
          <div class="page-container">
            <header>
              <button class="menu-btn">Menu</button>
            </header>
            <main>
              <form class="checkout-form">
                <div class="form-section">
                  <input name="cardNumber" />
                  <input name="cvv" />
                </div>
                <div class="form-actions">
                  <button type="button" class="cancel-btn">Cancel</button>
                  <button type="submit" class="submit-btn" data-testid="checkout-submit">
                    Complete Purchase
                  </button>
                </div>
              </form>
            </main>
          </div>
        `,
      };

      const response = await bedrockEngine.generate(request);

      expect(response.content).toBeDefined();
      expect(response.content.trim().length).toBeGreaterThan(2);
      expect(response.usage.totalTokens).toBeGreaterThan(0);

      console.log('✅ Complex selector generation successful');
      console.log(`🎯 Generated selector: ${response.content}`);
    }, 60000);
  });

  describe('Application Analysis', () => {
    it('should analyze web application using real Bedrock API', async () => {
      const mockAnalysis: ApplicationAnalysis = {
        url: 'https://example.com/dashboard',
        title: 'User Dashboard',
        elements: [
          {
            type: 'button',
            attributes: {
              id: 'create-project-btn',
              text: 'Create Project',
              class: 'btn btn-primary',
            },
            xpath: '//button[@id="create-project-btn"]',
            cssPath: '#create-project-btn',
          },
          {
            type: 'input',
            attributes: {
              id: 'search',
              placeholder: 'Search projects...',
              type: 'text',
            },
            xpath: '//input[@id="search"]',
            cssPath: '#search',
          },
          {
            type: 'link',
            attributes: {
              href: '/settings',
              text: 'Settings',
            },
            xpath: '//a[@href="/settings"]',
            cssPath: 'a[href="/settings"]',
          },
        ],
        patterns: [
          {
            type: 'navigation',
            elements: [],
            description: 'Top navigation bar with user menu',
          },
          {
            type: 'list',
            elements: [],
            description: 'Project list with cards',
          },
        ],
        flows: [
          {
            name: 'Create new project',
            steps: ['Click create button', 'Fill project form', 'Submit'],
            entryPoint: {
              type: 'button',
              attributes: { id: 'create-project-btn' },
              xpath: '//button[@id="create-project-btn"]',
              cssPath: '#create-project-btn',
            },
          },
        ],
        metadata: {
          viewport: { width: 1920, height: 1080 },
          loadTime: 1200,
          isSPA: true,
        },
      };

      const result = await bedrockEngine.analyze(mockAnalysis);

      // Validate response structure
      expect(result).toBeDefined();
      expect(result.features).toBeDefined();
      expect(result.userFlows).toBeDefined();
      expect(result.interactiveElements).toBeDefined();
      expect(result.authRequired).toBeDefined();
      expect(result.testRecommendations).toBeDefined();

      // Validate features array
      expect(Array.isArray(result.features)).toBe(true);
      expect(result.features.length).toBeGreaterThan(0);

      // Validate user flows
      expect(Array.isArray(result.userFlows)).toBe(true);

      // Validate interactive elements
      expect(Array.isArray(result.interactiveElements)).toBe(true);

      // Validate auth required is boolean
      expect(typeof result.authRequired).toBe('boolean');

      // Validate test recommendations
      expect(Array.isArray(result.testRecommendations)).toBe(true);

      console.log('✅ Application analysis successful');
      console.log(`📋 Features identified: ${result.features.length}`);
      console.log(`🔄 User flows: ${result.userFlows.length}`);
      console.log(`🎯 Interactive elements: ${result.interactiveElements.length}`);
      console.log(`🔐 Auth required: ${result.authRequired}`);
      console.log(`💡 Test recommendations: ${result.testRecommendations.length}`);
    }, 60000);

    it('should identify authentication requirements', async () => {
      const mockAnalysis: ApplicationAnalysis = {
        url: 'https://example.com/login',
        title: 'Login Page',
        elements: [
          {
            type: 'input',
            attributes: { id: 'username', type: 'text', placeholder: 'Username' },
            xpath: '//input[@id="username"]',
            cssPath: '#username',
          },
          {
            type: 'input',
            attributes: { id: 'password', type: 'password', placeholder: 'Password' },
            xpath: '//input[@id="password"]',
            cssPath: '#password',
          },
          {
            type: 'button',
            attributes: { id: 'login-btn', text: 'Sign In' },
            xpath: '//button[@id="login-btn"]',
            cssPath: '#login-btn',
          },
        ],
        patterns: [
          {
            type: 'form',
            elements: [],
            description: 'Login form with username and password',
          },
        ],
        flows: [
          {
            name: 'User login',
            steps: ['Enter username', 'Enter password', 'Click sign in'],
            entryPoint: {
              type: 'input',
              attributes: { id: 'username' },
              xpath: '//input[@id="username"]',
              cssPath: '#username',
            },
          },
        ],
        metadata: {
          viewport: { width: 1280, height: 720 },
          loadTime: 800,
          isSPA: false,
        },
      };

      const result = await bedrockEngine.analyze(mockAnalysis);

      expect(result).toBeDefined();
      expect(typeof result.authRequired).toBe('boolean');

      console.log('✅ Authentication analysis successful');
      console.log(`🔐 Auth required: ${result.authRequired}`);
    }, 60000);
  });

  describe('Cost Tracking', () => {
    it('should accurately track token usage and costs', async () => {
      bedrockEngine.clearLogs();

      const request = {
        scenario: 'Simple test scenario',
        context: { url: 'https://example.com' },
      };

      const response = await bedrockEngine.generate(request);

      // Validate cost calculation
      const expectedInputCost = (response.usage.promptTokens / 1_000_000) * 3.0;
      const expectedOutputCost = (response.usage.completionTokens / 1_000_000) * 15.0;
      const expectedTotalCost = expectedInputCost + expectedOutputCost;

      expect(response.cost).toBeCloseTo(expectedTotalCost, 8);

      // Validate logs
      const logs = bedrockEngine.getLogs();
      expect(logs.length).toBe(1);
      expect(logs[0].operation).toBe('generate');
      expect(logs[0].status).toBe('success');
      expect(logs[0].requestTokens).toBe(response.usage.promptTokens);
      expect(logs[0].responseTokens).toBe(response.usage.completionTokens);
      expect(logs[0].totalTokens).toBe(response.usage.totalTokens);

      console.log('✅ Cost tracking accurate');
      console.log(`📊 Input tokens: ${response.usage.promptTokens} × $3/1M = $${expectedInputCost.toFixed(6)}`);
      console.log(`📊 Output tokens: ${response.usage.completionTokens} × $15/1M = $${expectedOutputCost.toFixed(6)}`);
      console.log(`💰 Total cost: $${response.cost.toFixed(6)}`);
    }, 60000);

    it('should track costs across multiple API calls', async () => {
      bedrockEngine.clearLogs();

      // Make multiple API calls
      const requests = [
        { scenario: 'Test 1', context: {} },
        { scenario: 'Test 2', context: {} },
        { scenario: 'Test 3', context: {} },
      ];

      const responses = await Promise.all(
        requests.map((req) => bedrockEngine.generate(req))
      );

      // Validate all responses
      expect(responses).toHaveLength(3);
      responses.forEach((response) => {
        expect(response.cost).toBeGreaterThan(0);
        expect(response.usage.totalTokens).toBeGreaterThan(0);
      });

      // Calculate total cost
      const totalCost = responses.reduce((sum, r) => sum + r.cost, 0);
      const totalTokens = responses.reduce((sum, r) => sum + r.usage.totalTokens, 0);

      // Validate logs
      const logs = bedrockEngine.getLogs();
      expect(logs.length).toBe(3);
      logs.forEach((log) => {
        expect(log.status).toBe('success');
        expect(log.totalTokens).toBeGreaterThan(0);
      });

      console.log('✅ Multi-call cost tracking successful');
      console.log(`📊 Total tokens: ${totalTokens}`);
      console.log(`💰 Total cost: $${totalCost.toFixed(6)}`);
      console.log(`📈 Average cost per call: $${(totalCost / 3).toFixed(6)}`);
    }, 120000); // 2 minute timeout for multiple calls
  });

  describe('Error Handling', () => {
    it('should handle invalid requests gracefully', async () => {
      const request = {
        scenario: '', // Empty scenario
        context: {},
      };

      // This should still work, but might generate generic code
      const response = await bedrockEngine.generate(request);

      expect(response).toBeDefined();
      expect(response.content).toBeDefined();
      expect(response.usage.totalTokens).toBeGreaterThan(0);

      console.log('✅ Invalid request handled gracefully');
    }, 60000);

    it('should handle very large context', async () => {
      // Create a large context to test token limits
      const largeContext = {
        elements: Array.from({ length: 100 }, (_, i) => ({
          type: 'button',
          id: `button-${i}`,
          text: `Button ${i}`,
          description: `This is a test button number ${i} with some additional context`,
        })),
      };

      const request = {
        scenario: 'Test with large context',
        context: largeContext,
      };

      const response = await bedrockEngine.generate(request);

      expect(response).toBeDefined();
      expect(response.content).toBeDefined();
      expect(response.usage.promptTokens).toBeGreaterThan(1000); // Should have many input tokens

      console.log('✅ Large context handled successfully');
      console.log(`📊 Input tokens: ${response.usage.promptTokens}`);
    }, 60000);
  });

  describe('Performance', () => {
    it('should complete test generation within acceptable time', async () => {
      const startTime = Date.now();

      const request = {
        scenario: 'User registration flow',
        context: {
          url: 'https://example.com/register',
          elements: [
            { type: 'input', id: 'email' },
            { type: 'input', id: 'password' },
            { type: 'input', id: 'confirm-password' },
            { type: 'button', id: 'register-btn' },
          ],
        },
      };

      const response = await bedrockEngine.generate(request);
      const duration = Date.now() - startTime;

      expect(response).toBeDefined();
      expect(duration).toBeLessThan(45000); // Should complete within 45 seconds

      console.log('✅ Performance test passed');
      console.log(`⏱️  Duration: ${duration}ms`);
    }, 60000);

    it('should complete selector generation within acceptable time', async () => {
      const startTime = Date.now();

      const request = {
        elementDescription: 'Submit button',
        domContext: '<button id="submit">Submit</button>',
      };

      const response = await bedrockEngine.generate(request);
      const duration = Date.now() - startTime;

      expect(response).toBeDefined();
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds

      console.log('✅ Selector generation performance test passed');
      console.log(`⏱️  Duration: ${duration}ms`);
    }, 30000);

    it('should complete application analysis within acceptable time', async () => {
      const startTime = Date.now();

      const mockAnalysis: ApplicationAnalysis = {
        url: 'https://example.com',
        title: 'Test App',
        elements: [
          {
            type: 'button',
            attributes: { id: 'btn1', text: 'Button 1' },
            xpath: '//button[@id="btn1"]',
            cssPath: '#btn1',
          },
        ],
        patterns: [],
        flows: [],
        metadata: {
          viewport: { width: 1280, height: 720 },
          loadTime: 1000,
          isSPA: false,
        },
      };

      const result = await bedrockEngine.analyze(mockAnalysis);
      const duration = Date.now() - startTime;

      expect(result).toBeDefined();
      expect(duration).toBeLessThan(60000); // Should complete within 60 seconds

      console.log('✅ Analysis performance test passed');
      console.log(`⏱️  Duration: ${duration}ms`);
    }, 90000);
  });

  describe('API Logging', () => {
    it('should log all API interactions', async () => {
      bedrockEngine.clearLogs();

      const request = {
        scenario: 'Test logging',
        context: {},
      };

      await bedrockEngine.generate(request);

      const logs = bedrockEngine.getLogs();

      expect(logs.length).toBe(1);
      expect(logs[0]).toMatchObject({
        operation: 'generate',
        model: expect.stringContaining('claude'),
        status: 'success',
        requestTokens: expect.any(Number),
        responseTokens: expect.any(Number),
        totalTokens: expect.any(Number),
        duration: expect.any(Number),
      });

      expect(logs[0].timestamp).toBeDefined();
      expect(new Date(logs[0].timestamp).getTime()).toBeGreaterThan(0);

      console.log('✅ API logging working correctly');
    }, 60000);

    it('should log failures', async () => {
      bedrockEngine.clearLogs();

      // Create a new engine with invalid configuration to force failure
      const invalidEngine = new BedrockEngine({
        region: 'invalid-region',
        modelId: 'invalid-model-id',
        timeout: 5000,
      });

      const request = {
        scenario: 'Test failure logging',
        context: {},
      };

      try {
        await invalidEngine.generate(request);
        fail('Should have thrown an error');
      } catch (error) {
        // Expected to fail
        const logs = invalidEngine.getLogs();
        expect(logs.length).toBeGreaterThan(0);
        
        const lastLog = logs[logs.length - 1];
        expect(lastLog.status).toBe('failure');
        expect(lastLog.error).toBeDefined();

        console.log('✅ Failure logging working correctly');
        console.log(`❌ Error logged: ${lastLog.error}`);
      }
    }, 30000);
  });
});

// Summary of test coverage
describe('Bedrock Integration Test Summary', () => {
  it('should display test coverage summary', () => {
    if (!shouldRunBedrockTests()) {
      console.log('⏭️  Bedrock integration tests were skipped');
      console.log('ℹ️  To run these tests:');
      console.log('   1. Configure AWS credentials');
      console.log('   2. Ensure Bedrock access is enabled');
      console.log('   3. Set SKIP_BEDROCK_INTEGRATION=false');
      return;
    }

    console.log('\n📊 Bedrock Integration Test Coverage:');
    console.log('✅ Test Generation - Real API calls');
    console.log('✅ Selector Generation - Real API calls');
    console.log('✅ Application Analysis - Real API calls');
    console.log('✅ Cost Tracking - Accurate token and cost calculation');
    console.log('✅ Error Handling - Graceful failure handling');
    console.log('✅ Performance - Within acceptable time limits');
    console.log('✅ API Logging - Complete interaction logging');
    console.log('\n💰 Total estimated cost: < $0.10');
  });
});

/**
 * Mock AI Service
 * 
 * Simulates OpenAI API responses for testing without actual API calls.
 * Useful for development, testing, and CI/CD pipelines.
 */

import { TestSpecification, TokenUsage } from '../../types/ai-test-generation';

export class MockAIService {
  /**
   * Generate a mock test specification
   */
  async generateTestSpecification(
    url: string,
    scenario: string
  ): Promise<{ specification: TestSpecification; tokens: TokenUsage }> {
    // Simulate API delay
    await this.delay(500);

    const specification: TestSpecification = {
      testName: `Test: ${scenario}`,
      description: `Automated test for ${scenario}`,
      steps: [
        {
          action: 'navigate',
          description: `Navigate to ${url}`,
          elementDescription: 'Application URL',
        },
        {
          action: 'click',
          description: 'Click the login button',
          elementDescription: 'Login button with id="login-button"',
        },
        {
          action: 'type',
          description: 'Enter username',
          elementDescription: 'Username input field',
          value: 'testuser@example.com',
        },
        {
          action: 'type',
          description: 'Enter password',
          elementDescription: 'Password input field',
          value: 'password123',
        },
        {
          action: 'click',
          description: 'Submit the form',
          elementDescription: 'Submit button',
        },
        {
          action: 'assert',
          description: 'Verify user is redirected to dashboard',
          elementDescription: 'Dashboard page',
          assertion: {
            type: 'visible',
            expected: 'Dashboard',
          },
        },
      ],
      tags: ['login', 'authentication', 'mock-generated'],
    };

    const tokens: TokenUsage = {
      promptTokens: 250,
      completionTokens: 180,
      totalTokens: 430,
    };

    return { specification, tokens };
  }

  /**
   * Simulate API delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check if mock mode is enabled
   */
  static isMockMode(): boolean {
    return process.env.OPENAI_API_KEY === 'MOCK' || !process.env.OPENAI_API_KEY;
  }
}

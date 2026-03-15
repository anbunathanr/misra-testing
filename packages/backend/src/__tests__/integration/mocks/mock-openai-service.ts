/**
 * Mock OpenAI Service
 * 
 * Simulates OpenAI API responses for integration testing without actual API calls.
 */

import {
  MockOpenAIService,
  MockOpenAIConfig,
  OpenAICall,
  TokenUsage,
} from '../types';

/**
 * Mock OpenAI Service Implementation
 */
export class MockOpenAIServiceImpl implements MockOpenAIService {
  private config: MockOpenAIConfig;
  private callHistory: OpenAICall[];
  private mockedResponses: Map<string, any>;
  private errorMode: 'timeout' | 'rate-limit' | 'invalid-response' | null;

  constructor() {
    this.config = {
      latency: 100, // 100ms default latency
      failureRate: 0, // No failures by default
      tokenUsage: {
        promptTokens: 100,
        completionTokens: 50,
      },
    };
    this.callHistory = [];
    this.mockedResponses = new Map();
    this.errorMode = null;
  }

  /**
   * Configure mock behavior
   */
  configure(config: MockOpenAIConfig): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Mock analysis response for a URL
   */
  mockAnalysisResponse(url: string, response: any): void {
    this.mockedResponses.set(`analysis:${url}`, response);
  }

  /**
   * Mock generation response for a scenario
   */
  mockGenerationResponse(scenario: string, response: any): void {
    this.mockedResponses.set(`generation:${scenario}`, response);
  }

  /**
   * Mock error behavior
   */
  mockError(errorType: 'timeout' | 'rate-limit' | 'invalid-response'): void {
    this.errorMode = errorType;
  }

  /**
   * Get call history
   */
  getCallHistory(): OpenAICall[] {
    return [...this.callHistory];
  }

  /**
   * Reset mock state
   */
  reset(): void {
    this.callHistory = [];
    this.mockedResponses.clear();
    this.errorMode = null;
  }

  /**
   * Simulate API call (internal method used by tests)
   */
  async simulateCall(type: 'analysis' | 'generation', key: string, prompt: string): Promise<any> {
    const startTime = Date.now();

    // Simulate latency
    await new Promise(resolve => setTimeout(resolve, this.config.latency));

    // Simulate errors
    if (this.errorMode) {
      throw new Error(`Mock OpenAI error: ${this.errorMode}`);
    }

    // Simulate failure rate
    if (Math.random() < this.config.failureRate / 100) {
      throw new Error('Mock OpenAI random failure');
    }

    // Get mocked response
    const responseKey = `${type}:${key}`;
    const response = this.mockedResponses.get(responseKey) || this.getDefaultResponse(type);

    // Record call
    const call: OpenAICall = {
      timestamp: new Date().toISOString(),
      prompt,
      response,
      duration: Date.now() - startTime,
      tokens: this.config.tokenUsage,
    };
    this.callHistory.push(call);

    return response;
  }

  /**
   * Get default response for a type
   */
  private getDefaultResponse(type: 'analysis' | 'generation'): any {
    if (type === 'analysis') {
      return {
        elements: [],
        patterns: [],
        metadata: {
          title: 'Mock Page',
          url: 'https://example.com',
        },
      };
    } else {
      return {
        name: 'Mock Test',
        description: 'Mock test description',
        steps: [],
      };
    }
  }
}

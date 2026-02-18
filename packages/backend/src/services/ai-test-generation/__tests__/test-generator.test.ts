import { TestGenerator } from '../test-generator';
import { AIEngine } from '../ai-engine';
import { SelectorGenerator } from '../selector-generator';
import { TestCaseService } from '../../test-case-service';
import { TestSpecification, ApplicationAnalysis, IdentifiedElement } from '../../../types/ai-test-generation';
import { TestCase } from '../../../types/test-case';

// Mock dependencies
jest.mock('../ai-engine');
jest.mock('../selector-generator');
jest.mock('../../test-case-service');

describe('TestGenerator', () => {
  let testGenerator: TestGenerator;
  let mockAIEngine: jest.Mocked<AIEngine>;
  let mockSelectorGenerator: jest.Mocked<SelectorGenerator>;
  let mockTestCaseService: jest.Mocked<TestCaseService>;

  const mockAnalysis: ApplicationAnalysis = {
    url: 'https://example.com',
    title: 'Example Page',
    elements: [
      {
        type: 'button',
        attributes: {
          id: 'submit-btn',
          text: 'Submit',
          'data-testid': 'submit-button',
        },
        xpath: '//button[@id="submit-btn"]',
        cssPath: '#submit-btn',
      },
      {
        type: 'input',
        attributes: {
          name: 'email',
          placeholder: 'Enter email',
          'aria-label': 'Email input',
        },
        xpath: '//input[@name="email"]',
        cssPath: 'input[name="email"]',
      },
      {
        type: 'link',
        attributes: {
          text: 'Login',
        },
        xpath: '//a[text()="Login"]',
        cssPath: 'a[href="/login"]',
      },
    ],
    patterns: [],
    flows: [],
    metadata: {
      viewport: { width: 1920, height: 1080 },
      loadTime: 1500,
      isSPA: false,
    },
  };

  beforeEach(() => {
    // Create mock instances
    mockAIEngine = {
      generateTestSpecification: jest.fn(),
      validateResponse: jest.fn(),
    } as any;

    mockSelectorGenerator = {
      generateSelector: jest.fn(),
      validateSelector: jest.fn(),
      refineSelector: jest.fn(),
    } as any;

    mockTestCaseService = {
      createTestCase: jest.fn(),
      getTestCase: jest.fn(),
      getSuiteTestCases: jest.fn(),
      getProjectTestCases: jest.fn(),
      updateTestCase: jest.fn(),
      deleteTestCase: jest.fn(),
    } as any;

    testGenerator = new TestGenerator(
      mockAIEngine,
      mockSelectorGenerator,
      mockTestCaseService
    );
  });

  describe('generate', () => {
    it('should generate a complete test case from specification', async () => {
      const specification: TestSpecification = {
        testName: 'Login Test',
        description: 'Test user login functionality',
        steps: [
          {
            action: 'navigate',
            description: 'Navigate to login page',
            value: 'https://example.com/login',
          },
          {
            action: 'type',
            description: 'Enter email',
            elementDescription: 'email input',
            value: 'test@example.com',
          },
          {
            action: 'click',
            description: 'Click submit button',
            elementDescription: 'submit button',
          },
        ],
        tags: ['login', 'authentication'],
      };

      const mockTestCase: TestCase = {
        testCaseId: 'test-123',
        name: 'Login Test',
        description: 'Test user login functionality',
        type: 'ui',
        steps: [],
        projectId: 'project-1',
        suiteId: 'suite-1',
        userId: 'user-1',
        tags: ['login', 'authentication', 'ai-generated'],
        priority: 'medium',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      mockSelectorGenerator.generateSelector
        .mockReturnValueOnce('input[name="email"]')
        .mockReturnValueOnce('[data-testid="submit-button"]');

      mockTestCaseService.createTestCase.mockResolvedValue(mockTestCase);

      const result = await testGenerator.generate(
        specification,
        mockAnalysis,
        'project-1',
        'suite-1',
        'user-1'
      );

      expect(result).toEqual(mockTestCase);
      
      const createCall = mockTestCaseService.createTestCase.mock.calls[0];
      expect(createCall[0]).toBe('user-1');
      expect(createCall[1].name).toBe('Login Test');
      expect(createCall[1].description).toBe('Test user login functionality');
      expect(createCall[1].type).toBe('ui');
      expect(createCall[1].projectId).toBe('project-1');
      expect(createCall[1].suiteId).toBe('suite-1');
      expect(createCall[1].tags).toEqual(['login', 'authentication', 'ai-generated']);
      expect(createCall[1].priority).toBe('medium');
      expect(createCall[1].steps).toHaveLength(3);
      expect(createCall[1].steps[0]).toMatchObject({
        stepNumber: 1,
        action: 'navigate',
        target: 'https://example.com/login',
      });
      expect(createCall[1].steps[1]).toMatchObject({
        stepNumber: 2,
        action: 'type',
        value: 'test@example.com',
      });
      expect(createCall[1].steps[2]).toMatchObject({
        stepNumber: 3,
        action: 'click',
      });
    });

    it('should include ai-generated tag in generated test case', async () => {
      const specification: TestSpecification = {
        testName: 'Simple Test',
        description: 'A simple test',
        steps: [
          {
            action: 'navigate',
            description: 'Navigate to page',
            value: 'https://example.com',
          },
        ],
        tags: ['simple'],
      };

      const mockTestCase: TestCase = {
        testCaseId: 'test-123',
        name: 'Simple Test',
        description: 'A simple test',
        type: 'ui',
        steps: [],
        projectId: 'project-1',
        suiteId: 'suite-1',
        userId: 'user-1',
        tags: ['simple', 'ai-generated'],
        priority: 'medium',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      mockTestCaseService.createTestCase.mockResolvedValue(mockTestCase);

      const result = await testGenerator.generate(
        specification,
        mockAnalysis,
        'project-1',
        'suite-1',
        'user-1'
      );

      expect(result.tags).toContain('ai-generated');
    });

    it('should handle navigate steps correctly', async () => {
      const specification: TestSpecification = {
        testName: 'Navigation Test',
        description: 'Test navigation',
        steps: [
          {
            action: 'navigate',
            description: 'Go to homepage',
            value: 'https://example.com',
          },
        ],
        tags: [],
      };

      const mockTestCase: TestCase = {
        testCaseId: 'test-123',
        name: 'Navigation Test',
        description: 'Test navigation',
        type: 'ui',
        steps: [
          {
            stepNumber: 1,
            action: 'navigate',
            target: 'https://example.com',
            expectedResult: 'Navigate to https://example.com',
          },
        ],
        projectId: 'project-1',
        suiteId: 'suite-1',
        userId: 'user-1',
        tags: ['ai-generated'],
        priority: 'medium',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      mockTestCaseService.createTestCase.mockResolvedValue(mockTestCase);

      await testGenerator.generate(
        specification,
        mockAnalysis,
        'project-1',
        'suite-1',
        'user-1'
      );

      expect(mockTestCaseService.createTestCase).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({
          steps: [
            {
              stepNumber: 1,
              action: 'navigate',
              target: 'https://example.com',
              expectedResult: 'Navigate to https://example.com',
            },
          ],
        })
      );
    });

    it('should handle click steps with selector generation', async () => {
      const specification: TestSpecification = {
        testName: 'Click Test',
        description: 'Test clicking',
        steps: [
          {
            action: 'click',
            description: 'Click submit button',
            elementDescription: 'submit',
          },
        ],
        tags: [],
      };

      mockSelectorGenerator.generateSelector.mockReturnValue('[data-testid="submit-button"]');

      const mockTestCase: TestCase = {
        testCaseId: 'test-123',
        name: 'Click Test',
        description: 'Test clicking',
        type: 'ui',
        steps: [],
        projectId: 'project-1',
        suiteId: 'suite-1',
        userId: 'user-1',
        tags: ['ai-generated'],
        priority: 'medium',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      mockTestCaseService.createTestCase.mockResolvedValue(mockTestCase);

      await testGenerator.generate(
        specification,
        mockAnalysis,
        'project-1',
        'suite-1',
        'user-1'
      );

      expect(mockSelectorGenerator.generateSelector).toHaveBeenCalled();
      expect(mockTestCaseService.createTestCase).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({
          steps: [
            expect.objectContaining({
              action: 'click',
              target: '[data-testid="submit-button"]',
            }),
          ],
        })
      );
    });

    it('should handle type steps with selector and value', async () => {
      const specification: TestSpecification = {
        testName: 'Type Test',
        description: 'Test typing',
        steps: [
          {
            action: 'type',
            description: 'Enter email',
            elementDescription: 'email',
            value: 'test@example.com',
          },
        ],
        tags: [],
      };

      mockSelectorGenerator.generateSelector.mockReturnValue('input[name="email"]');

      const mockTestCase: TestCase = {
        testCaseId: 'test-123',
        name: 'Type Test',
        description: 'Test typing',
        type: 'ui',
        steps: [],
        projectId: 'project-1',
        suiteId: 'suite-1',
        userId: 'user-1',
        tags: ['ai-generated'],
        priority: 'medium',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      mockTestCaseService.createTestCase.mockResolvedValue(mockTestCase);

      await testGenerator.generate(
        specification,
        mockAnalysis,
        'project-1',
        'suite-1',
        'user-1'
      );

      expect(mockTestCaseService.createTestCase).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({
          steps: [
            expect.objectContaining({
              action: 'type',
              target: 'input[name="email"]',
              value: 'test@example.com',
            }),
          ],
        })
      );
    });

    it('should handle assert steps with formatted assertions', async () => {
      const specification: TestSpecification = {
        testName: 'Assert Test',
        description: 'Test assertions',
        steps: [
          {
            action: 'assert',
            description: 'Verify text',
            elementDescription: 'submit',
            assertion: {
              type: 'text',
              expected: 'Submit',
            },
          },
        ],
        tags: [],
      };

      mockSelectorGenerator.generateSelector.mockReturnValue('[data-testid="submit-button"]');

      const mockTestCase: TestCase = {
        testCaseId: 'test-123',
        name: 'Assert Test',
        description: 'Test assertions',
        type: 'ui',
        steps: [],
        projectId: 'project-1',
        suiteId: 'suite-1',
        userId: 'user-1',
        tags: ['ai-generated'],
        priority: 'medium',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      mockTestCaseService.createTestCase.mockResolvedValue(mockTestCase);

      await testGenerator.generate(
        specification,
        mockAnalysis,
        'project-1',
        'suite-1',
        'user-1'
      );

      expect(mockTestCaseService.createTestCase).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({
          steps: [
            expect.objectContaining({
              action: 'assert',
              target: '[data-testid="submit-button"]',
              expectedResult: 'Text equals "Submit"',
            }),
          ],
        })
      );
    });

    it('should handle wait steps', async () => {
      const specification: TestSpecification = {
        testName: 'Wait Test',
        description: 'Test waiting',
        steps: [
          {
            action: 'wait',
            description: 'Wait for page load',
            value: '3000',
          },
        ],
        tags: [],
      };

      const mockTestCase: TestCase = {
        testCaseId: 'test-123',
        name: 'Wait Test',
        description: 'Test waiting',
        type: 'ui',
        steps: [],
        projectId: 'project-1',
        suiteId: 'suite-1',
        userId: 'user-1',
        tags: ['ai-generated'],
        priority: 'medium',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      mockTestCaseService.createTestCase.mockResolvedValue(mockTestCase);

      await testGenerator.generate(
        specification,
        mockAnalysis,
        'project-1',
        'suite-1',
        'user-1'
      );

      expect(mockTestCaseService.createTestCase).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({
          steps: [
            expect.objectContaining({
              action: 'wait',
              target: '3000',
            }),
          ],
        })
      );
    });

    it('should assign sequential step numbers', async () => {
      const specification: TestSpecification = {
        testName: 'Multi-step Test',
        description: 'Test with multiple steps',
        steps: [
          {
            action: 'navigate',
            description: 'Navigate',
            value: 'https://example.com',
          },
          {
            action: 'wait',
            description: 'Wait',
            value: '1000',
          },
          {
            action: 'click',
            description: 'Click',
            elementDescription: 'submit',
          },
        ],
        tags: [],
      };

      mockSelectorGenerator.generateSelector.mockReturnValue('[data-testid="submit-button"]');

      const mockTestCase: TestCase = {
        testCaseId: 'test-123',
        name: 'Multi-step Test',
        description: 'Test with multiple steps',
        type: 'ui',
        steps: [],
        projectId: 'project-1',
        suiteId: 'suite-1',
        userId: 'user-1',
        tags: ['ai-generated'],
        priority: 'medium',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      mockTestCaseService.createTestCase.mockResolvedValue(mockTestCase);

      await testGenerator.generate(
        specification,
        mockAnalysis,
        'project-1',
        'suite-1',
        'user-1'
      );

      expect(mockTestCaseService.createTestCase).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({
          steps: [
            expect.objectContaining({ stepNumber: 1 }),
            expect.objectContaining({ stepNumber: 2 }),
            expect.objectContaining({ stepNumber: 3 }),
          ],
        })
      );
    });

    it('should set test case type to ui', async () => {
      const specification: TestSpecification = {
        testName: 'UI Test',
        description: 'Test UI',
        steps: [
          {
            action: 'navigate',
            description: 'Navigate',
            value: 'https://example.com',
          },
        ],
        tags: [],
      };

      const mockTestCase: TestCase = {
        testCaseId: 'test-123',
        name: 'UI Test',
        description: 'Test UI',
        type: 'ui',
        steps: [],
        projectId: 'project-1',
        suiteId: 'suite-1',
        userId: 'user-1',
        tags: ['ai-generated'],
        priority: 'medium',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      mockTestCaseService.createTestCase.mockResolvedValue(mockTestCase);

      await testGenerator.generate(
        specification,
        mockAnalysis,
        'project-1',
        'suite-1',
        'user-1'
      );

      expect(mockTestCaseService.createTestCase).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({
          type: 'ui',
        })
      );
    });

    it('should handle element not found in analysis', async () => {
      const specification: TestSpecification = {
        testName: 'Missing Element Test',
        description: 'Test with missing element',
        steps: [
          {
            action: 'click',
            description: 'Click non-existent button',
            elementDescription: 'non-existent-button',
          },
        ],
        tags: [],
      };

      const mockTestCase: TestCase = {
        testCaseId: 'test-123',
        name: 'Missing Element Test',
        description: 'Test with missing element',
        type: 'ui',
        steps: [],
        projectId: 'project-1',
        suiteId: 'suite-1',
        userId: 'user-1',
        tags: ['ai-generated'],
        priority: 'medium',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      mockTestCaseService.createTestCase.mockResolvedValue(mockTestCase);

      await testGenerator.generate(
        specification,
        mockAnalysis,
        'project-1',
        'suite-1',
        'user-1'
      );

      // Should use element description as fallback selector
      expect(mockTestCaseService.createTestCase).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({
          steps: [
            expect.objectContaining({
              action: 'click',
              target: 'non-existent-button',
            }),
          ],
        })
      );
    });
  });
});

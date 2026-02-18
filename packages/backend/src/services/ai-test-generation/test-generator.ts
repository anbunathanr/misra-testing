import { TestCase, TestStep } from '../../types/test-case';
import { TestSpecification, AIGeneratedStep, ApplicationAnalysis } from '../../types/ai-test-generation';
import { AIEngine } from './ai-engine';
import { SelectorGenerator } from './selector-generator';
import { TestCaseService } from '../test-case-service';

/**
 * Test Generator
 * 
 * Converts AI-generated test specifications into executable test cases.
 * Integrates with AI Engine, Selector Generator, and Test Case Service.
 */
export class TestGenerator {
  private aiEngine: AIEngine;
  private selectorGenerator: SelectorGenerator;
  private testCaseService: TestCaseService;

  constructor(
    aiEngine: AIEngine,
    selectorGenerator: SelectorGenerator,
    testCaseService: TestCaseService
  ) {
    this.aiEngine = aiEngine;
    this.selectorGenerator = selectorGenerator;
    this.testCaseService = testCaseService;
  }

  /**
   * Generate a complete test case from AI specification
   * 
   * @param specification - AI-generated test specification
   * @param analysis - Application analysis results
   * @param projectId - Project identifier
   * @param suiteId - Test suite identifier
   * @param userId - User identifier
   * @returns Generated and persisted test case
   */
  async generate(
    specification: TestSpecification,
    analysis: ApplicationAnalysis,
    projectId: string,
    suiteId: string,
    userId: string
  ): Promise<TestCase> {
    console.log(`[Test Generator] Generating test case: ${specification.testName}`);

    // Convert AI steps to TestStep format
    const steps = await this.convertSteps(specification.steps, analysis);

    // Prepare tags (include 'ai-generated' tag)
    const tags = [...specification.tags, 'ai-generated'];

    // Create test case using TestCaseService
    const testCase = await this.testCaseService.createTestCase(userId, {
      name: specification.testName,
      description: specification.description,
      type: 'ui', // AI-generated tests are primarily UI tests
      steps,
      projectId,
      suiteId,
      tags,
      priority: 'medium',
    });

    console.log(`[Test Generator] Generated test case: ${testCase.testCaseId}`);
    return testCase;
  }

  /**
   * Convert AI-generated steps to TestStep format
   * 
   * @param aiSteps - AI-generated steps
   * @param analysis - Application analysis for selector generation
   * @returns Array of TestStep objects
   */
  private async convertSteps(
    aiSteps: AIGeneratedStep[],
    analysis: ApplicationAnalysis
  ): Promise<TestStep[]> {
    const steps: TestStep[] = [];

    for (let i = 0; i < aiSteps.length; i++) {
      const aiStep = aiSteps[i];
      const stepNumber = i + 1;

      switch (aiStep.action) {
        case 'navigate':
          steps.push({
            stepNumber,
            action: 'navigate',
            target: aiStep.value || '',
            expectedResult: `Navigate to ${aiStep.value}`,
          });
          break;

        case 'click':
          const clickSelector = await this.generateSelectorForElement(
            aiStep.elementDescription || '',
            analysis
          );
          steps.push({
            stepNumber,
            action: 'click',
            target: clickSelector,
            expectedResult: aiStep.description,
          });
          break;

        case 'type':
          const typeSelector = await this.generateSelectorForElement(
            aiStep.elementDescription || '',
            analysis
          );
          steps.push({
            stepNumber,
            action: 'type',
            target: typeSelector,
            value: aiStep.value || '',
            expectedResult: aiStep.description,
          });
          break;

        case 'assert':
          const assertSelector = await this.generateSelectorForElement(
            aiStep.elementDescription || '',
            analysis
          );
          steps.push({
            stepNumber,
            action: 'assert',
            target: assertSelector,
            expectedResult: this.formatAssertion(aiStep),
          });
          break;

        case 'wait':
          steps.push({
            stepNumber,
            action: 'wait',
            target: aiStep.value || '2000', // Default 2 seconds
            expectedResult: aiStep.description,
          });
          break;

        default:
          console.warn(`[Test Generator] Unknown action type: ${aiStep.action}`);
      }
    }

    return steps;
  }

  /**
   * Generate selector for an element based on description
   * 
   * @param elementDescription - Description of the element
   * @param analysis - Application analysis containing identified elements
   * @returns Generated selector
   */
  private async generateSelectorForElement(
    elementDescription: string,
    analysis: ApplicationAnalysis
  ): Promise<string> {
    // Find matching element in analysis by description
    const matchingElement = this.findElementByDescription(elementDescription, analysis);

    if (matchingElement) {
      return this.selectorGenerator.generateSelector(matchingElement, analysis.elements);
    }

    // Fallback: use description as selector (may need refinement)
    console.warn(`[Test Generator] No matching element found for: ${elementDescription}`);
    return elementDescription;
  }

  /**
   * Find element in analysis by description
   * 
   * @param description - Element description
   * @param analysis - Application analysis
   * @returns Matching element or undefined
   */
  private findElementByDescription(
    description: string,
    analysis: ApplicationAnalysis
  ): any {
    const lowerDesc = description.toLowerCase();

    // Try to match by text content
    let match = analysis.elements.find(
      (el) => el.attributes.text?.toLowerCase().includes(lowerDesc)
    );
    if (match) return match;

    // Try to match by aria-label
    match = analysis.elements.find(
      (el) => el.attributes['aria-label']?.toLowerCase().includes(lowerDesc)
    );
    if (match) return match;

    // Try to match by placeholder
    match = analysis.elements.find(
      (el) => el.attributes.placeholder?.toLowerCase().includes(lowerDesc)
    );
    if (match) return match;

    // Try to match by name
    match = analysis.elements.find(
      (el) => el.attributes.name?.toLowerCase().includes(lowerDesc)
    );
    if (match) return match;

    // Try to match by id
    match = analysis.elements.find(
      (el) => el.attributes.id?.toLowerCase().includes(lowerDesc)
    );
    if (match) return match;

    return undefined;
  }

  /**
   * Format assertion for expected result
   * 
   * @param aiStep - AI-generated step with assertion
   * @returns Formatted assertion string
   */
  private formatAssertion(aiStep: AIGeneratedStep): string {
    if (!aiStep.assertion) {
      return aiStep.description;
    }

    const { type, expected } = aiStep.assertion;

    switch (type) {
      case 'exists':
        return `Element exists`;
      case 'visible':
        return `Element is visible`;
      case 'text':
        return `Text equals "${expected}"`;
      case 'value':
        return `Value equals "${expected}"`;
      case 'attribute':
        return `Attribute equals "${expected}"`;
      default:
        return aiStep.description;
    }
  }
}

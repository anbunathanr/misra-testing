import { TestCase } from '../../types/test-case';
import { TestSpecification, ApplicationAnalysis } from '../../types/ai-test-generation';
import { IAIEngine } from './ai-engine-factory';
import { SelectorGenerator } from './selector-generator';
import { TestCaseService } from '../test-case-service';
/**
 * Test Generator
 *
 * Converts AI-generated test specifications into executable test cases.
 * Integrates with AI Engine, Selector Generator, and Test Case Service.
 */
export declare class TestGenerator {
    private aiEngine;
    private selectorGenerator;
    private testCaseService;
    constructor(aiEngine: IAIEngine, selectorGenerator: SelectorGenerator, testCaseService: TestCaseService);
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
    generate(specification: TestSpecification, analysis: ApplicationAnalysis, projectId: string, suiteId: string, userId: string): Promise<TestCase>;
    /**
     * Convert AI-generated steps to TestStep format
     *
     * @param aiSteps - AI-generated steps
     * @param analysis - Application analysis for selector generation
     * @returns Array of TestStep objects
     */
    private convertSteps;
    /**
     * Generate selector for an element based on description
     *
     * @param elementDescription - Description of the element
     * @param analysis - Application analysis containing identified elements
     * @returns Generated selector
     */
    private generateSelectorForElement;
    /**
     * Find element in analysis by description
     *
     * @param description - Element description
     * @param analysis - Application analysis
     * @returns Matching element or undefined
     */
    private findElementByDescription;
    /**
     * Format assertion for expected result
     *
     * @param aiStep - AI-generated step with assertion
     * @returns Formatted assertion string
     */
    private formatAssertion;
}

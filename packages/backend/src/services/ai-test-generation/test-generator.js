"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestGenerator = void 0;
/**
 * Test Generator
 *
 * Converts AI-generated test specifications into executable test cases.
 * Integrates with AI Engine, Selector Generator, and Test Case Service.
 */
class TestGenerator {
    aiEngine;
    selectorGenerator;
    testCaseService;
    constructor(aiEngine, selectorGenerator, testCaseService) {
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
    async generate(specification, analysis, projectId, suiteId, userId) {
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
    async convertSteps(aiSteps, analysis) {
        const steps = [];
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
                    const clickSelector = await this.generateSelectorForElement(aiStep.elementDescription || '', analysis);
                    steps.push({
                        stepNumber,
                        action: 'click',
                        target: clickSelector,
                        expectedResult: aiStep.description,
                    });
                    break;
                case 'type':
                    const typeSelector = await this.generateSelectorForElement(aiStep.elementDescription || '', analysis);
                    steps.push({
                        stepNumber,
                        action: 'type',
                        target: typeSelector,
                        value: aiStep.value || '',
                        expectedResult: aiStep.description,
                    });
                    break;
                case 'assert':
                    const assertSelector = await this.generateSelectorForElement(aiStep.elementDescription || '', analysis);
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
    async generateSelectorForElement(elementDescription, analysis) {
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
    findElementByDescription(description, analysis) {
        const lowerDesc = description.toLowerCase();
        // Try to match by text content
        let match = analysis.elements.find((el) => el.attributes.text?.toLowerCase().includes(lowerDesc));
        if (match)
            return match;
        // Try to match by aria-label
        match = analysis.elements.find((el) => el.attributes['aria-label']?.toLowerCase().includes(lowerDesc));
        if (match)
            return match;
        // Try to match by placeholder
        match = analysis.elements.find((el) => el.attributes.placeholder?.toLowerCase().includes(lowerDesc));
        if (match)
            return match;
        // Try to match by name
        match = analysis.elements.find((el) => el.attributes.name?.toLowerCase().includes(lowerDesc));
        if (match)
            return match;
        // Try to match by id
        match = analysis.elements.find((el) => el.attributes.id?.toLowerCase().includes(lowerDesc));
        if (match)
            return match;
        return undefined;
    }
    /**
     * Format assertion for expected result
     *
     * @param aiStep - AI-generated step with assertion
     * @returns Formatted assertion string
     */
    formatAssertion(aiStep) {
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
exports.TestGenerator = TestGenerator;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdC1nZW5lcmF0b3IuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ0ZXN0LWdlbmVyYXRvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFNQTs7Ozs7R0FLRztBQUNILE1BQWEsYUFBYTtJQUNoQixRQUFRLENBQVc7SUFDbkIsaUJBQWlCLENBQW9CO0lBQ3JDLGVBQWUsQ0FBa0I7SUFFekMsWUFDRSxRQUFrQixFQUNsQixpQkFBb0MsRUFDcEMsZUFBZ0M7UUFFaEMsSUFBSSxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUM7UUFDekIsSUFBSSxDQUFDLGlCQUFpQixHQUFHLGlCQUFpQixDQUFDO1FBQzNDLElBQUksQ0FBQyxlQUFlLEdBQUcsZUFBZSxDQUFDO0lBQ3pDLENBQUM7SUFFRDs7Ozs7Ozs7O09BU0c7SUFDSCxLQUFLLENBQUMsUUFBUSxDQUNaLGFBQWdDLEVBQ2hDLFFBQTZCLEVBQzdCLFNBQWlCLEVBQ2pCLE9BQWUsRUFDZixNQUFjO1FBRWQsT0FBTyxDQUFDLEdBQUcsQ0FBQywwQ0FBMEMsYUFBYSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7UUFFaEYsc0NBQXNDO1FBQ3RDLE1BQU0sS0FBSyxHQUFHLE1BQU0sSUFBSSxDQUFDLFlBQVksQ0FBQyxhQUFhLENBQUMsS0FBSyxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBRXJFLDRDQUE0QztRQUM1QyxNQUFNLElBQUksR0FBRyxDQUFDLEdBQUcsYUFBYSxDQUFDLElBQUksRUFBRSxjQUFjLENBQUMsQ0FBQztRQUVyRCx5Q0FBeUM7UUFDekMsTUFBTSxRQUFRLEdBQUcsTUFBTSxJQUFJLENBQUMsZUFBZSxDQUFDLGNBQWMsQ0FBQyxNQUFNLEVBQUU7WUFDakUsSUFBSSxFQUFFLGFBQWEsQ0FBQyxRQUFRO1lBQzVCLFdBQVcsRUFBRSxhQUFhLENBQUMsV0FBVztZQUN0QyxJQUFJLEVBQUUsSUFBSSxFQUFFLDRDQUE0QztZQUN4RCxLQUFLO1lBQ0wsU0FBUztZQUNULE9BQU87WUFDUCxJ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QztZQUN0QyxLQUFLLFdBQVc7Z0JBQ2QsT0FBTyxxQkFBcUIsUUFBUSxHQUFHLENBQUM7WUFDMUM7Z0JBQ0UsT0FBTyxNQUFNLENBQUMsV0FBVyxDQUFDO1FBQzlCLENBQUM7SUFDSCxDQUFDO0NBQ0Y7QUE3T0Qsc0NBNk9DIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgVGVzdENhc2UsIFRlc3RTdGVwIH0gZnJvbSAnLi4vLi4vdHlwZXMvdGVzdC1jYXNlJztcclxuaW1wb3J0IHsgVGVzdFNwZWNpZmljYXRpb24sIEFJR2VuZXJhdGVkU3RlcCwgQXBwbGljYXRpb25BbmFseXNpcyB9IGZyb20gJy4uLy4uL3R5cGVzL2FpLXRlc3QtZ2VuZXJhdGlvbic7XHJcbmltcG9ydCB7IEFJRW5naW5lIH0gZnJvbSAnLi9haS1lbmdpbmUnO1xyXG5pbXBvcnQgeyBTZWxlY3RvckdlbmVyYXRvciB9IGZyb20gJy4vc2VsZWN0b3ItZ2VuZXJhdG9yJztcclxuaW1wb3J0IHsgVGVzdENhc2VTZXJ2aWNlIH0gZnJvbSAnLi4vdGVzdC1jYXNlLXNlcnZpY2UnO1xyXG5cclxuLyoqXHJcbiAqIFRlc3QgR2VuZXJhdG9yXHJcbiAqIFxyXG4gKiBDb252ZXJ0cyBBSS1nZW5lcmF0ZWQgdGVzdCBzcGVjaWZpY2F0aW9ucyBpbnRvIGV4ZWN1dGFibGUgdGVzdCBjYXNlcy5cclxuICogSW50ZWdyYXRlcyB3aXRoIEFJIEVuZ2luZSwgU2VsZWN0b3IgR2VuZXJhdG9yLCBhbmQgVGVzdCBDYXNlIFNlcnZpY2UuXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgVGVzdEdlbmVyYXRvciB7XHJcbiAgcHJpdmF0ZSBhaUVuZ2luZTogQUlFbmdpbmU7XHJcbiAgcHJpdmF0ZSBzZWxlY3RvckdlbmVyYXRvcjogU2VsZWN0b3JHZW5lcmF0b3I7XHJcbiAgcHJpdmF0ZSB0ZXN0Q2FzZVNlcnZpY2U6IFRlc3RDYXNlU2VydmljZTtcclxuXHJcbiAgY29uc3RydWN0b3IoXHJcbiAgICBhaUVuZ2luZTogQUlFbmdpbmUsXHJcbiAgICBzZWxlY3RvckdlbmVyYXRvcjogU2VsZWN0b3JHZW5lcmF0b3IsXHJcbiAgICB0ZXN0Q2FzZVNlcnZpY2U6IFRlc3RDYXNlU2VydmljZVxyXG4gICkge1xyXG4gICAgdGhpcy5haUVuZ2luZSA9IGFpRW5naW5lO1xyXG4gICAgdGhpcy5zZWxlY3RvckdlbmVyYXRvciA9IHNlbGVjdG9yR2VuZXJhdG9yO1xyXG4gICAgdGhpcy50ZXN0Q2FzZVNlcnZpY2UgPSB0ZXN0Q2FzZVNlcnZpY2U7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBHZW5lcmF0ZSBhIGNvbXBsZXRlIHRlc3QgY2FzZSBmcm9tIEFJIHNwZWNpZmljYXRpb25cclxuICAgKiBcclxuICAgKiBAcGFyYW0gc3BlY2lmaWNhdGlvbiAtIEFJLWdlbmVyYXRlZCB0ZXN0IHNwZWNpZmljYXRpb25cclxuICAgKiBAcGFyYW0gYW5hbHlzaXMgLSBBcHBsaWNhdGlvbiBhbmFseXNpcyByZXN1bHRzXHJcbiAgICogQHBhcmFtIHByb2plY3RJZCAtIFByb2plY3QgaWRlbnRpZmllclxyXG4gICAqIEBwYXJhbSBzdWl0ZUlkIC0gVGVzdCBzdWl0ZSBpZGVudGlmaWVyXHJcbiAgICogQHBhcmFtIHVzZXJJZCAtIFVzZXIgaWRlbnRpZmllclxyXG4gICAqIEByZXR1cm5zIEdlbmVyYXRlZCBhbmQgcGVyc2lzdGVkIHRlc3QgY2FzZVxyXG4gICAqL1xyXG4gIGFzeW5jIGdlbmVyYXRlKFxyXG4gICAgc3BlY2lmaWNhdGlvbjogVGVzdFNwZWNpZmljYXRpb24sXHJcbiAgICBhbmFseXNpczogQXBwbGljYXRpb25BbmFseXNpcyxcclxuICAgIHByb2plY3RJZDogc3RyaW5nLFxyXG4gICAgc3VpdGVJZDogc3RyaW5nLFxyXG4gICAgdXNlcklkOiBzdHJpbmdcclxuICApOiBQcm9taXNlPFRlc3RDYXNlPiB7XHJcbiAgICBjb25zb2xlLmxvZyhgW1Rlc3QgR2VuZXJhdG9yXSBHZW5lcmF0aW5nIHRlc3QgY2FzZTogJHtzcGVjaWZpY2F0aW9uLnRlc3ROYW1lfWApO1xyXG5cclxuICAgIC8vIENvbnZlcnQgQUkgc3RlcHMgdG8gVGVzdFN0ZXAgZm9ybWF0XHJcbiAgICBjb25zdCBzdGVwcyA9IGF3YWl0IHRoaXMuY29udmVydFN0ZXBzKHNwZWNpZmljYXRpb24uc3RlcHMsIGFuYWx5c2lzKTtcclxuXHJcbiAgICAvLyBQcmVwYXJlIHRhZ3MgKGluY2x1ZGUgJ2FpLWdlbmVyYXRlZCcgdGFnKVxyXG4gICAgY29uc3QgdGFncyA9IFsuLi5zcGVjaWZpY2F0aW9uLnRhZ3MsICdhaS1nZW5lcmF0ZWQnXTtcclxuXHJcbiAgICAvLyBDcmVhdGUgdGVzdCBjYXNlIHVzaW5nIFRlc3RDYXNlU2VydmljZVxyXG4gICAgY29uc3QgdGVzdENhc2UgPSBhd2FpdCB0aGlzLnRlc3RDYXNlU2VydmljZS5jcmVhdGVUZXN0Q2FzZSh1c2VySWQsIHtcclxuICAgICAgbmFtZTogc3BlY2lmaWNhdGlvbi50ZXN0TmFtZSxcclxuICAgICAgZGVzY3JpcHRpb246IHNwZWNpZmljYXRpb24uZGVzY3JpcHRpb24sXHJcbiAgICAgIHR5cGU6ICd1aScsIC8vIEFJLWdlbmVyYXRlZCB0ZXN0cyBhcmUgcHJpbWFyaWx5IFVJIHRlc3RzXHJcbiAgICAgIHN0ZXBzLFxyXG4gICAgICBwcm9qZWN0SWQsXHJcbiAgICAgIHN1aXRlSWQsXHJcbiAgICAgIHRhZ3MsXHJcbiAgICAgIHByaW9yaXR5OiAnbWVkaXVtJyxcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnNvbGUubG9nKGBbVGVzdCBHZW5lcmF0b3JdIEdlbmVyYXRlZCB0ZXN0IGNhc2U6ICR7dGVzdENhc2UudGVzdENhc2VJZH1gKTtcclxuICAgIHJldHVybiB0ZXN0Q2FzZTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENvbnZlcnQgQUktZ2VuZXJhdGVkIHN0ZXBzIHRvIFRlc3RTdGVwIGZvcm1hdFxyXG4gICAqIFxyXG4gICAqIEBwYXJhbSBhaVN0ZXBzIC0gQUktZ2VuZXJhdGVkIHN0ZXBzXHJcbiAgICogQHBhcmFtIGFuYWx5c2lzIC0gQXBwbGljYXRpb24gYW5hbHlzaXMgZm9yIHNlbGVjdG9yIGdlbmVyYXRpb25cclxuICAgKiBAcmV0dXJucyBBcnJheSBvZiBUZXN0U3RlcCBvYmplY3RzXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBhc3luYyBjb252ZXJ0U3RlcHMoXHJcbiAgICBhaVN0ZXBzOiBBSUdlbmVyYXRlZFN0ZXBbXSxcclxuICAgIGFuYWx5c2lzOiBBcHBsaWNhdGlvbkFuYWx5c2lzXHJcbiAgKTogUHJvbWlzZTxUZXN0U3RlcFtdPiB7XHJcbiAgICBjb25zdCBzdGVwczogVGVzdFN0ZXBbXSA9IFtdO1xyXG5cclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYWlTdGVwcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICBjb25zdCBhaVN0ZXAgPSBhaVN0ZXBzW2ldO1xyXG4gICAgICBjb25zdCBzdGVwTnVtYmVyID0gaSArIDE7XHJcblxyXG4gICAgICBzd2l0Y2ggKGFpU3RlcC5hY3Rpb24pIHtcclxuICAgICAgICBjYXNlICduYXZpZ2F0ZSc6XHJcbiAgICAgICAgICBzdGVwcy5wdXNoKHtcclxuICAgICAgICAgICAgc3RlcE51bWJlcixcclxuICAgICAgICAgICAgYWN0aW9uOiAnbmF2aWdhdGUnLFxyXG4gICAgICAgICAgICB0YXJnZXQ6IGFpU3RlcC52YWx1ZSB8fCAnJyxcclxuICAgICAgICAgICAgZXhwZWN0ZWRSZXN1bHQ6IGBOYXZpZ2F0ZSB0byAke2FpU3RlcC52YWx1ZX1gLFxyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgICBicmVhaztcclxuXHJcbiAgICAgICAgY2FzZSAnY2xpY2snOlxyXG4gICAgICAgICAgY29uc3QgY2xpY2tTZWxlY3RvciA9IGF3YWl0IHRoaXMuZ2VuZXJhdGVTZWxlY3RvckZvckVsZW1lbnQoXHJcbiAgICAgICAgICAgIGFpU3RlcC5lbGVtZW50RGVzY3JpcHRpb24gfHwgJycsXHJcbiAgICAgICAgICAgIGFuYWx5c2lzXHJcbiAgICAgICAgICApO1xyXG4gICAgICAgICAgc3RlcHMucHVzaCh7XHJcbiAgICAgICAgICAgIHN0ZXBOdW1iZXIsXHJcbiAgICAgICAgICAgIGFjdGlvbjogJ2NsaWNrJyxcclxuICAgICAgICAgICAgdGFyZ2V0OiBjbGlja1NlbGVjdG9yLFxyXG4gICAgICAgICAgICBleHBlY3RlZFJlc3VsdDogYWlTdGVwLmRlc2NyaXB0aW9uLFxyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgICBicmVhaztcclxuXHJcbiAgICAgICAgY2FzZSAndHlwZSc6XHJcbiAgICAgICAgICBjb25zdCB0eXBlU2VsZWN0b3IgPSBhd2FpdCB0aGlzLmdlbmVyYXRlU2VsZWN0b3JGb3JFbGVtZW50KFxyXG4gICAgICAgICAgICBhaVN0ZXAuZWxlbWVudERlc2NyaXB0aW9uIHx8ICcnLFxyXG4gICAgICAgICAgICBhbmFseXNpc1xyXG4gICAgICAgICAgKTtcclxuICAgICAgICAgIHN0ZXBzLnB1c2goe1xyXG4gICAgICAgICAgICBzdGVwTnVtYmVyLFxyXG4gICAgICAgICAgICBhY3Rpb246ICd0eXBlJyxcclxuICAgICAgICAgICAgdGFyZ2V0OiB0eXBlU2VsZWN0b3IsXHJcbiAgICAgICAgICAgIHZhbHVlOiBhaVN0ZXAudmFsdWUgfHwgJycsXHJcbiAgICAgICAgICAgIGV4cGVjdGVkUmVzdWx0OiBhaVN0ZXAuZGVzY3JpcHRpb24sXHJcbiAgICAgICAgICB9KTtcclxuICAgICAgICAgIGJyZWFrO1xyXG5cclxuICAgICAgICBjYXNlICdhc3NlcnQnOlxyXG4gICAgICAgICAgY29uc3QgYXNzZXJ0U2VsZWN0b3IgPSBhd2FpdCB0aGlzLmdlbmVyYXRlU2VsZWN0b3JGb3JFbGVtZW50KFxyXG4gICAgICAgICAgICBhaVN0ZXAuZWxlbWVudERlc2NyaXB0aW9uIHx8ICcnLFxyXG4gICAgICAgICAgICBhbmFseXNpc1xyXG4gICAgICAgICAgKTtcclxuICAgICAgICAgIHN0ZXBzLnB1c2goe1xyXG4gICAgICAgICAgICBzdGVwTnVtYmVyLFxyXG4gICAgICAgICAgICBhY3Rpb246ICdhc3NlcnQnLFxyXG4gICAgICAgICAgICB0YXJnZXQ6IGFzc2VydFNlbGVjdG9yLFxyXG4gICAgICAgICAgICBleHBlY3RlZFJlc3VsdDogdGhpcy5mb3JtYXRBc3NlcnRpb24oYWlTdGVwKSxcclxuICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICAgIGNhc2UgJ3dhaXQnOlxyXG4gICAgICAgICAgc3RlcHMucHVzaCh7XHJcbiAgICAgICAgICAgIHN0ZXBOdW1iZXIsXHJcbiAgICAgICAgICAgIGFjdGlvbjogJ3dhaXQnLFxyXG4gICAgICAgICAgICB0YXJnZXQ6IGFpU3RlcC52YWx1ZSB8fCAnMjAwMCcsIC8vIERlZmF1bHQgMiBzZWNvbmRzXHJcbiAgICAgICAgICAgIGV4cGVjdGVkUmVzdWx0OiBhaVN0ZXAuZGVzY3JpcHRpb24sXHJcbiAgICAgICAgICB9KTtcclxuICAgICAgICAgIGJyZWFrO1xyXG5cclxuICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgY29uc29sZS53YXJuKGBbVGVzdCBHZW5lcmF0b3JdIFVua25vd24gYWN0aW9uIHR5cGU6ICR7YWlTdGVwLmFjdGlvbn1gKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBzdGVwcztcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEdlbmVyYXRlIHNlbGVjdG9yIGZvciBhbiBlbGVtZW50IGJhc2VkIG9uIGRlc2NyaXB0aW9uXHJcbiAgICogXHJcbiAgICogQHBhcmFtIGVsZW1lbnREZXNjcmlwdGlvbiAtIERlc2NyaXB0aW9uIG9mIHRoZSBlbGVtZW50XHJcbiAgICogQHBhcmFtIGFuYWx5c2lzIC0gQXBwbGljYXRpb24gYW5hbHlzaXMgY29udGFpbmluZyBpZGVudGlmaWVkIGVsZW1lbnRzXHJcbiAgICogQHJldHVybnMgR2VuZXJhdGVkIHNlbGVjdG9yXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBhc3luYyBnZW5lcmF0ZVNlbGVjdG9yRm9yRWxlbWVudChcclxuICAgIGVsZW1lbnREZXNjcmlwdGlvbjogc3RyaW5nLFxyXG4gICAgYW5hbHlzaXM6IEFwcGxpY2F0aW9uQW5hbHlzaXNcclxuICApOiBQcm9taXNlPHN0cmluZz4ge1xyXG4gICAgLy8gRmluZCBtYXRjaGluZyBlbGVtZW50IGluIGFuYWx5c2lzIGJ5IGRlc2NyaXB0aW9uXHJcbiAgICBjb25zdCBtYXRjaGluZ0VsZW1lbnQgPSB0aGlzLmZpbmRFbGVtZW50QnlEZXNjcmlwdGlvbihlbGVtZW50RGVzY3JpcHRpb24sIGFuYWx5c2lzKTtcclxuXHJcbiAgICBpZiAobWF0Y2hpbmdFbGVtZW50KSB7XHJcbiAgICAgIHJldHVybiB0aGlzLnNlbGVjdG9yR2VuZXJhdG9yLmdlbmVyYXRlU2VsZWN0b3IobWF0Y2hpbmdFbGVtZW50LCBhbmFseXNpcy5lbGVtZW50cyk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gRmFsbGJhY2s6IHVzZSBkZXNjcmlwdGlvbiBhcyBzZWxlY3RvciAobWF5IG5lZWQgcmVmaW5lbWVudClcclxuICAgIGNvbnNvbGUud2FybihgW1Rlc3QgR2VuZXJhdG9yXSBObyBtYXRjaGluZyBlbGVtZW50IGZvdW5kIGZvcjogJHtlbGVtZW50RGVzY3JpcHRpb259YCk7XHJcbiAgICByZXR1cm4gZWxlbWVudERlc2NyaXB0aW9uO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogRmluZCBlbGVtZW50IGluIGFuYWx5c2lzIGJ5IGRlc2NyaXB0aW9uXHJcbiAgICogXHJcbiAgICogQHBhcmFtIGRlc2NyaXB0aW9uIC0gRWxlbWVudCBkZXNjcmlwdGlvblxyXG4gICAqIEBwYXJhbSBhbmFseXNpcyAtIEFwcGxpY2F0aW9uIGFuYWx5c2lzXHJcbiAgICogQHJldHVybnMgTWF0Y2hpbmcgZWxlbWVudCBvciB1bmRlZmluZWRcclxuICAgKi9cclxuICBwcml2YXRlIGZpbmRFbGVtZW50QnlEZXNjcmlwdGlvbihcclxuICAgIGRlc2NyaXB0aW9uOiBzdHJpbmcsXHJcbiAgICBhbmFseXNpczogQXBwbGljYXRpb25BbmFseXNpc1xyXG4gICk6IGFueSB7XHJcbiAgICBjb25zdCBsb3dlckRlc2MgPSBkZXNjcmlwdGlvbi50b0xvd2VyQ2FzZSgpO1xyXG5cclxuICAgIC8vIFRyeSB0byBtYXRjaCBieSB0ZXh0IGNvbnRlbnRcclxuICAgIGxldCBtYXRjaCA9IGFuYWx5c2lzLmVsZW1lbnRzLmZpbmQoXHJcbiAgICAgIChlbCkgPT4gZWwuYXR0cmlidXRlcy50ZXh0Py50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKGxvd2VyRGVzYylcclxuICAgICk7XHJcbiAgICBpZiAobWF0Y2gpIHJldHVybiBtYXRjaDtcclxuXHJcbiAgICAvLyBUcnkgdG8gbWF0Y2ggYnkgYXJpYS1sYWJlbFxyXG4gICAgbWF0Y2ggPSBhbmFseXNpcy5lbGVtZW50cy5maW5kKFxyXG4gICAgICAoZWwpID0+IGVsLmF0dHJpYnV0ZXNbJ2FyaWEtbGFiZWwnXT8udG9Mb3dlckNhc2UoKS5pbmNsdWRlcyhsb3dlckRlc2MpXHJcbiAgICApO1xyXG4gICAgaWYgKG1hdGNoKSByZXR1cm4gbWF0Y2g7XHJcblxyXG4gICAgLy8gVHJ5IHRvIG1hdGNoIGJ5IHBsYWNlaG9sZGVyXHJcbiAgICBtYXRjaCA9IGFuYWx5c2lzLmVsZW1lbnRzLmZpbmQoXHJcbiAgICAgIChlbCkgPT4gZWwuYXR0cmlidXRlcy5wbGFjZWhvbGRlcj8udG9Mb3dlckNhc2UoKS5pbmNsdWRlcyhsb3dlckRlc2MpXHJcbiAgICApO1xyXG4gICAgaWYgKG1hdGNoKSByZXR1cm4gbWF0Y2g7XHJcblxyXG4gICAgLy8gVHJ5IHRvIG1hdGNoIGJ5IG5hbWVcclxuICAgIG1hdGNoID0gYW5hbHlzaXMuZWxlbWVudHMuZmluZChcclxuICAgICAgKGVsKSA9PiBlbC5hdHRyaWJ1dGVzLm5hbWU/LnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMobG93ZXJEZXNjKVxyXG4gICAgKTtcclxuICAgIGlmIChtYXRjaCkgcmV0dXJuIG1hdGNoO1xyXG5cclxuICAgIC8vIFRyeSB0byBtYXRjaCBieSBpZFxyXG4gICAgbWF0Y2ggPSBhbmFseXNpcy5lbGVtZW50cy5maW5kKFxyXG4gICAgICAoZWwpID0+IGVsLmF0dHJpYnV0ZXMuaWQ/LnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMobG93ZXJEZXNjKVxyXG4gICAgKTtcclxuICAgIGlmIChtYXRjaCkgcmV0dXJuIG1hdGNoO1xyXG5cclxuICAgIHJldHVybiB1bmRlZmluZWQ7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBGb3JtYXQgYXNzZXJ0aW9uIGZvciBleHBlY3RlZCByZXN1bHRcclxuICAgKiBcclxuICAgKiBAcGFyYW0gYWlTdGVwIC0gQUktZ2VuZXJhdGVkIHN0ZXAgd2l0aCBhc3NlcnRpb25cclxuICAgKiBAcmV0dXJucyBGb3JtYXR0ZWQgYXNzZXJ0aW9uIHN0cmluZ1xyXG4gICAqL1xyXG4gIHByaXZhdGUgZm9ybWF0QXNzZXJ0aW9uKGFpU3RlcDogQUlHZW5lcmF0ZWRTdGVwKTogc3RyaW5nIHtcclxuICAgIGlmICghYWlTdGVwLmFzc2VydGlvbikge1xyXG4gICAgICByZXR1cm4gYWlTdGVwLmRlc2NyaXB0aW9uO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IHsgdHlwZSwgZXhwZWN0ZWQgfSA9IGFpU3RlcC5hc3NlcnRpb247XHJcblxyXG4gICAgc3dpdGNoICh0eXBlKSB7XHJcbiAgICAgIGNhc2UgJ2V4aXN0cyc6XHJcbiAgICAgICAgcmV0dXJuIGBFbGVtZW50IGV4aXN0c2A7XHJcbiAgICAgIGNhc2UgJ3Zpc2libGUnOlxyXG4gICAgICAgIHJldHVybiBgRWxlbWVudCBpcyB2aXNpYmxlYDtcclxuICAgICAgY2FzZSAndGV4dCc6XHJcbiAgICAgICAgcmV0dXJuIGBUZXh0IGVxdWFscyBcIiR7ZXhwZWN0ZWR9XCJgO1xyXG4gICAgICBjYXNlICd2YWx1ZSc6XHJcbiAgICAgICAgcmV0dXJuIGBWYWx1ZSBlcXVhbHMgXCIke2V4cGVjdGVkfVwiYDtcclxuICAgICAgY2FzZSAnYXR0cmlidXRlJzpcclxuICAgICAgICByZXR1cm4gYEF0dHJpYnV0ZSBlcXVhbHMgXCIke2V4cGVjdGVkfVwiYDtcclxuICAgICAgZGVmYXVsdDpcclxuICAgICAgICByZXR1cm4gYWlTdGVwLmRlc2NyaXB0aW9uO1xyXG4gICAgfVxyXG4gIH1cclxufVxyXG4iXX0=
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdC1nZW5lcmF0b3IuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ0ZXN0LWdlbmVyYXRvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFNQTs7Ozs7R0FLRztBQUNILE1BQWEsYUFBYTtJQUNoQixRQUFRLENBQVk7SUFDcEIsaUJBQWlCLENBQW9CO0lBQ3JDLGVBQWUsQ0FBa0I7SUFFekMsWUFDRSxRQUFtQixFQUNuQixpQkFBb0MsRUFDcEMsZUFBZ0M7UUFFaEMsSUFBSSxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUM7UUFDekIsSUFBSSxDQUFDLGlCQUFpQixHQUFHLGlCQUFpQixDQUFDO1FBQzNDLElBQUksQ0FBQyxlQUFlLEdBQUcsZUFBZSxDQUFDO0lBQ3pDLENBQUM7SUFFRDs7Ozs7Ozs7O09BU0c7SUFDSCxLQUFLLENBQUMsUUFBUSxDQUNaLGFBQWdDLEVBQ2hDLFFBQTZCLEVBQzdCLFNBQWlCLEVBQ2pCLE9BQWUsRUFDZixNQUFjO1FBRWQsT0FBTyxDQUFDLEdBQUcsQ0FBQywwQ0FBMEMsYUFBYSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7UUFFaEYsc0NBQXNDO1FBQ3RDLE1BQU0sS0FBSyxHQUFHLE1BQU0sSUFBSSxDQUFDLFlBQVksQ0FBQyxhQUFhLENBQUMsS0FBSyxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBRXJFLDRDQUE0QztRQUM1QyxNQUFNLElBQUksR0FBRyxDQUFDLEdBQUcsYUFBYSxDQUFDLElBQUksRUFBRSxjQUFjLENBQUMsQ0FBQztRQUVyRCx5Q0FBeUM7UUFDekMsTUFBTSxRQUFRLEdBQUcsTUFBTSxJQUFJLENBQUMsZUFBZSxDQUFDLGNBQWMsQ0FBQyxNQUFNLEVBQUU7WUFDakUsSUFBSSxFQUFFLGFBQWEsQ0FBQyxRQUFRO1lBQzVCLFdBQVcsRUFBRSxhQUFhLENBQUMsV0FBVztZQUN0QyxJQUFJLEVBQUUsSUFBSSxFQUFFLDRDQUE0QztZQUN4RCxLQUFLO1lBQ0wsU0FBUztZQUNULE9BQU87WUFDUCxJ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QztZQUN0QyxLQUFLLFdBQVc7Z0JBQ2QsT0FBTyxxQkFBcUIsUUFBUSxHQUFHLENBQUM7WUFDMUM7Z0JBQ0UsT0FBTyxNQUFNLENBQUMsV0FBVyxDQUFDO1FBQzlCLENBQUM7SUFDSCxDQUFDO0NBQ0Y7QUE3T0Qsc0NBNk9DIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgVGVzdENhc2UsIFRlc3RTdGVwIH0gZnJvbSAnLi4vLi4vdHlwZXMvdGVzdC1jYXNlJztcclxuaW1wb3J0IHsgVGVzdFNwZWNpZmljYXRpb24sIEFJR2VuZXJhdGVkU3RlcCwgQXBwbGljYXRpb25BbmFseXNpcyB9IGZyb20gJy4uLy4uL3R5cGVzL2FpLXRlc3QtZ2VuZXJhdGlvbic7XHJcbmltcG9ydCB7IElBSUVuZ2luZSB9IGZyb20gJy4vYWktZW5naW5lLWZhY3RvcnknO1xyXG5pbXBvcnQgeyBTZWxlY3RvckdlbmVyYXRvciB9IGZyb20gJy4vc2VsZWN0b3ItZ2VuZXJhdG9yJztcclxuaW1wb3J0IHsgVGVzdENhc2VTZXJ2aWNlIH0gZnJvbSAnLi4vdGVzdC1jYXNlLXNlcnZpY2UnO1xyXG5cclxuLyoqXHJcbiAqIFRlc3QgR2VuZXJhdG9yXHJcbiAqIFxyXG4gKiBDb252ZXJ0cyBBSS1nZW5lcmF0ZWQgdGVzdCBzcGVjaWZpY2F0aW9ucyBpbnRvIGV4ZWN1dGFibGUgdGVzdCBjYXNlcy5cclxuICogSW50ZWdyYXRlcyB3aXRoIEFJIEVuZ2luZSwgU2VsZWN0b3IgR2VuZXJhdG9yLCBhbmQgVGVzdCBDYXNlIFNlcnZpY2UuXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgVGVzdEdlbmVyYXRvciB7XHJcbiAgcHJpdmF0ZSBhaUVuZ2luZTogSUFJRW5naW5lO1xyXG4gIHByaXZhdGUgc2VsZWN0b3JHZW5lcmF0b3I6IFNlbGVjdG9yR2VuZXJhdG9yO1xyXG4gIHByaXZhdGUgdGVzdENhc2VTZXJ2aWNlOiBUZXN0Q2FzZVNlcnZpY2U7XHJcblxyXG4gIGNvbnN0cnVjdG9yKFxyXG4gICAgYWlFbmdpbmU6IElBSUVuZ2luZSxcclxuICAgIHNlbGVjdG9yR2VuZXJhdG9yOiBTZWxlY3RvckdlbmVyYXRvcixcclxuICAgIHRlc3RDYXNlU2VydmljZTogVGVzdENhc2VTZXJ2aWNlXHJcbiAgKSB7XHJcbiAgICB0aGlzLmFpRW5naW5lID0gYWlFbmdpbmU7XHJcbiAgICB0aGlzLnNlbGVjdG9yR2VuZXJhdG9yID0gc2VsZWN0b3JHZW5lcmF0b3I7XHJcbiAgICB0aGlzLnRlc3RDYXNlU2VydmljZSA9IHRlc3RDYXNlU2VydmljZTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEdlbmVyYXRlIGEgY29tcGxldGUgdGVzdCBjYXNlIGZyb20gQUkgc3BlY2lmaWNhdGlvblxyXG4gICAqIFxyXG4gICAqIEBwYXJhbSBzcGVjaWZpY2F0aW9uIC0gQUktZ2VuZXJhdGVkIHRlc3Qgc3BlY2lmaWNhdGlvblxyXG4gICAqIEBwYXJhbSBhbmFseXNpcyAtIEFwcGxpY2F0aW9uIGFuYWx5c2lzIHJlc3VsdHNcclxuICAgKiBAcGFyYW0gcHJvamVjdElkIC0gUHJvamVjdCBpZGVudGlmaWVyXHJcbiAgICogQHBhcmFtIHN1aXRlSWQgLSBUZXN0IHN1aXRlIGlkZW50aWZpZXJcclxuICAgKiBAcGFyYW0gdXNlcklkIC0gVXNlciBpZGVudGlmaWVyXHJcbiAgICogQHJldHVybnMgR2VuZXJhdGVkIGFuZCBwZXJzaXN0ZWQgdGVzdCBjYXNlXHJcbiAgICovXHJcbiAgYXN5bmMgZ2VuZXJhdGUoXHJcbiAgICBzcGVjaWZpY2F0aW9uOiBUZXN0U3BlY2lmaWNhdGlvbixcclxuICAgIGFuYWx5c2lzOiBBcHBsaWNhdGlvbkFuYWx5c2lzLFxyXG4gICAgcHJvamVjdElkOiBzdHJpbmcsXHJcbiAgICBzdWl0ZUlkOiBzdHJpbmcsXHJcbiAgICB1c2VySWQ6IHN0cmluZ1xyXG4gICk6IFByb21pc2U8VGVzdENhc2U+IHtcclxuICAgIGNvbnNvbGUubG9nKGBbVGVzdCBHZW5lcmF0b3JdIEdlbmVyYXRpbmcgdGVzdCBjYXNlOiAke3NwZWNpZmljYXRpb24udGVzdE5hbWV9YCk7XHJcblxyXG4gICAgLy8gQ29udmVydCBBSSBzdGVwcyB0byBUZXN0U3RlcCBmb3JtYXRcclxuICAgIGNvbnN0IHN0ZXBzID0gYXdhaXQgdGhpcy5jb252ZXJ0U3RlcHMoc3BlY2lmaWNhdGlvbi5zdGVwcywgYW5hbHlzaXMpO1xyXG5cclxuICAgIC8vIFByZXBhcmUgdGFncyAoaW5jbHVkZSAnYWktZ2VuZXJhdGVkJyB0YWcpXHJcbiAgICBjb25zdCB0YWdzID0gWy4uLnNwZWNpZmljYXRpb24udGFncywgJ2FpLWdlbmVyYXRlZCddO1xyXG5cclxuICAgIC8vIENyZWF0ZSB0ZXN0IGNhc2UgdXNpbmcgVGVzdENhc2VTZXJ2aWNlXHJcbiAgICBjb25zdCB0ZXN0Q2FzZSA9IGF3YWl0IHRoaXMudGVzdENhc2VTZXJ2aWNlLmNyZWF0ZVRlc3RDYXNlKHVzZXJJZCwge1xyXG4gICAgICBuYW1lOiBzcGVjaWZpY2F0aW9uLnRlc3ROYW1lLFxyXG4gICAgICBkZXNjcmlwdGlvbjogc3BlY2lmaWNhdGlvbi5kZXNjcmlwdGlvbixcclxuICAgICAgdHlwZTogJ3VpJywgLy8gQUktZ2VuZXJhdGVkIHRlc3RzIGFyZSBwcmltYXJpbHkgVUkgdGVzdHNcclxuICAgICAgc3RlcHMsXHJcbiAgICAgIHByb2plY3RJZCxcclxuICAgICAgc3VpdGVJZCxcclxuICAgICAgdGFncyxcclxuICAgICAgcHJpb3JpdHk6ICdtZWRpdW0nLFxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc29sZS5sb2coYFtUZXN0IEdlbmVyYXRvcl0gR2VuZXJhdGVkIHRlc3QgY2FzZTogJHt0ZXN0Q2FzZS50ZXN0Q2FzZUlkfWApO1xyXG4gICAgcmV0dXJuIHRlc3RDYXNlO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQ29udmVydCBBSS1nZW5lcmF0ZWQgc3RlcHMgdG8gVGVzdFN0ZXAgZm9ybWF0XHJcbiAgICogXHJcbiAgICogQHBhcmFtIGFpU3RlcHMgLSBBSS1nZW5lcmF0ZWQgc3RlcHNcclxuICAgKiBAcGFyYW0gYW5hbHlzaXMgLSBBcHBsaWNhdGlvbiBhbmFseXNpcyBmb3Igc2VsZWN0b3IgZ2VuZXJhdGlvblxyXG4gICAqIEByZXR1cm5zIEFycmF5IG9mIFRlc3RTdGVwIG9iamVjdHNcclxuICAgKi9cclxuICBwcml2YXRlIGFzeW5jIGNvbnZlcnRTdGVwcyhcclxuICAgIGFpU3RlcHM6IEFJR2VuZXJhdGVkU3RlcFtdLFxyXG4gICAgYW5hbHlzaXM6IEFwcGxpY2F0aW9uQW5hbHlzaXNcclxuICApOiBQcm9taXNlPFRlc3RTdGVwW10+IHtcclxuICAgIGNvbnN0IHN0ZXBzOiBUZXN0U3RlcFtdID0gW107XHJcblxyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBhaVN0ZXBzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIGNvbnN0IGFpU3RlcCA9IGFpU3RlcHNbaV07XHJcbiAgICAgIGNvbnN0IHN0ZXBOdW1iZXIgPSBpICsgMTtcclxuXHJcbiAgICAgIHN3aXRjaCAoYWlTdGVwLmFjdGlvbikge1xyXG4gICAgICAgIGNhc2UgJ25hdmlnYXRlJzpcclxuICAgICAgICAgIHN0ZXBzLnB1c2goe1xyXG4gICAgICAgICAgICBzdGVwTnVtYmVyLFxyXG4gICAgICAgICAgICBhY3Rpb246ICduYXZpZ2F0ZScsXHJcbiAgICAgICAgICAgIHRhcmdldDogYWlTdGVwLnZhbHVlIHx8ICcnLFxyXG4gICAgICAgICAgICBleHBlY3RlZFJlc3VsdDogYE5hdmlnYXRlIHRvICR7YWlTdGVwLnZhbHVlfWAsXHJcbiAgICAgICAgICB9KTtcclxuICAgICAgICAgIGJyZWFrO1xyXG5cclxuICAgICAgICBjYXNlICdjbGljayc6XHJcbiAgICAgICAgICBjb25zdCBjbGlja1NlbGVjdG9yID0gYXdhaXQgdGhpcy5nZW5lcmF0ZVNlbGVjdG9yRm9yRWxlbWVudChcclxuICAgICAgICAgICAgYWlTdGVwLmVsZW1lbnREZXNjcmlwdGlvbiB8fCAnJyxcclxuICAgICAgICAgICAgYW5hbHlzaXNcclxuICAgICAgICAgICk7XHJcbiAgICAgICAgICBzdGVwcy5wdXNoKHtcclxuICAgICAgICAgICAgc3RlcE51bWJlcixcclxuICAgICAgICAgICAgYWN0aW9uOiAnY2xpY2snLFxyXG4gICAgICAgICAgICB0YXJnZXQ6IGNsaWNrU2VsZWN0b3IsXHJcbiAgICAgICAgICAgIGV4cGVjdGVkUmVzdWx0OiBhaVN0ZXAuZGVzY3JpcHRpb24sXHJcbiAgICAgICAgICB9KTtcclxuICAgICAgICAgIGJyZWFrO1xyXG5cclxuICAgICAgICBjYXNlICd0eXBlJzpcclxuICAgICAgICAgIGNvbnN0IHR5cGVTZWxlY3RvciA9IGF3YWl0IHRoaXMuZ2VuZXJhdGVTZWxlY3RvckZvckVsZW1lbnQoXHJcbiAgICAgICAgICAgIGFpU3RlcC5lbGVtZW50RGVzY3JpcHRpb24gfHwgJycsXHJcbiAgICAgICAgICAgIGFuYWx5c2lzXHJcbiAgICAgICAgICApO1xyXG4gICAgICAgICAgc3RlcHMucHVzaCh7XHJcbiAgICAgICAgICAgIHN0ZXBOdW1iZXIsXHJcbiAgICAgICAgICAgIGFjdGlvbjogJ3R5cGUnLFxyXG4gICAgICAgICAgICB0YXJnZXQ6IHR5cGVTZWxlY3RvcixcclxuICAgICAgICAgICAgdmFsdWU6IGFpU3RlcC52YWx1ZSB8fCAnJyxcclxuICAgICAgICAgICAgZXhwZWN0ZWRSZXN1bHQ6IGFpU3RlcC5kZXNjcmlwdGlvbixcclxuICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICAgIGNhc2UgJ2Fzc2VydCc6XHJcbiAgICAgICAgICBjb25zdCBhc3NlcnRTZWxlY3RvciA9IGF3YWl0IHRoaXMuZ2VuZXJhdGVTZWxlY3RvckZvckVsZW1lbnQoXHJcbiAgICAgICAgICAgIGFpU3RlcC5lbGVtZW50RGVzY3JpcHRpb24gfHwgJycsXHJcbiAgICAgICAgICAgIGFuYWx5c2lzXHJcbiAgICAgICAgICApO1xyXG4gICAgICAgICAgc3RlcHMucHVzaCh7XHJcbiAgICAgICAgICAgIHN0ZXBOdW1iZXIsXHJcbiAgICAgICAgICAgIGFjdGlvbjogJ2Fzc2VydCcsXHJcbiAgICAgICAgICAgIHRhcmdldDogYXNzZXJ0U2VsZWN0b3IsXHJcbiAgICAgICAgICAgIGV4cGVjdGVkUmVzdWx0OiB0aGlzLmZvcm1hdEFzc2VydGlvbihhaVN0ZXApLFxyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgICBicmVhaztcclxuXHJcbiAgICAgICAgY2FzZSAnd2FpdCc6XHJcbiAgICAgICAgICBzdGVwcy5wdXNoKHtcclxuICAgICAgICAgICAgc3RlcE51bWJlcixcclxuICAgICAgICAgICAgYWN0aW9uOiAnd2FpdCcsXHJcbiAgICAgICAgICAgIHRhcmdldDogYWlTdGVwLnZhbHVlIHx8ICcyMDAwJywgLy8gRGVmYXVsdCAyIHNlY29uZHNcclxuICAgICAgICAgICAgZXhwZWN0ZWRSZXN1bHQ6IGFpU3RlcC5kZXNjcmlwdGlvbixcclxuICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICBjb25zb2xlLndhcm4oYFtUZXN0IEdlbmVyYXRvcl0gVW5rbm93biBhY3Rpb24gdHlwZTogJHthaVN0ZXAuYWN0aW9ufWApO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHN0ZXBzO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR2VuZXJhdGUgc2VsZWN0b3IgZm9yIGFuIGVsZW1lbnQgYmFzZWQgb24gZGVzY3JpcHRpb25cclxuICAgKiBcclxuICAgKiBAcGFyYW0gZWxlbWVudERlc2NyaXB0aW9uIC0gRGVzY3JpcHRpb24gb2YgdGhlIGVsZW1lbnRcclxuICAgKiBAcGFyYW0gYW5hbHlzaXMgLSBBcHBsaWNhdGlvbiBhbmFseXNpcyBjb250YWluaW5nIGlkZW50aWZpZWQgZWxlbWVudHNcclxuICAgKiBAcmV0dXJucyBHZW5lcmF0ZWQgc2VsZWN0b3JcclxuICAgKi9cclxuICBwcml2YXRlIGFzeW5jIGdlbmVyYXRlU2VsZWN0b3JGb3JFbGVtZW50KFxyXG4gICAgZWxlbWVudERlc2NyaXB0aW9uOiBzdHJpbmcsXHJcbiAgICBhbmFseXNpczogQXBwbGljYXRpb25BbmFseXNpc1xyXG4gICk6IFByb21pc2U8c3RyaW5nPiB7XHJcbiAgICAvLyBGaW5kIG1hdGNoaW5nIGVsZW1lbnQgaW4gYW5hbHlzaXMgYnkgZGVzY3JpcHRpb25cclxuICAgIGNvbnN0IG1hdGNoaW5nRWxlbWVudCA9IHRoaXMuZmluZEVsZW1lbnRCeURlc2NyaXB0aW9uKGVsZW1lbnREZXNjcmlwdGlvbiwgYW5hbHlzaXMpO1xyXG5cclxuICAgIGlmIChtYXRjaGluZ0VsZW1lbnQpIHtcclxuICAgICAgcmV0dXJuIHRoaXMuc2VsZWN0b3JHZW5lcmF0b3IuZ2VuZXJhdGVTZWxlY3RvcihtYXRjaGluZ0VsZW1lbnQsIGFuYWx5c2lzLmVsZW1lbnRzKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBGYWxsYmFjazogdXNlIGRlc2NyaXB0aW9uIGFzIHNlbGVjdG9yIChtYXkgbmVlZCByZWZpbmVtZW50KVxyXG4gICAgY29uc29sZS53YXJuKGBbVGVzdCBHZW5lcmF0b3JdIE5vIG1hdGNoaW5nIGVsZW1lbnQgZm91bmQgZm9yOiAke2VsZW1lbnREZXNjcmlwdGlvbn1gKTtcclxuICAgIHJldHVybiBlbGVtZW50RGVzY3JpcHRpb247XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBGaW5kIGVsZW1lbnQgaW4gYW5hbHlzaXMgYnkgZGVzY3JpcHRpb25cclxuICAgKiBcclxuICAgKiBAcGFyYW0gZGVzY3JpcHRpb24gLSBFbGVtZW50IGRlc2NyaXB0aW9uXHJcbiAgICogQHBhcmFtIGFuYWx5c2lzIC0gQXBwbGljYXRpb24gYW5hbHlzaXNcclxuICAgKiBAcmV0dXJucyBNYXRjaGluZyBlbGVtZW50IG9yIHVuZGVmaW5lZFxyXG4gICAqL1xyXG4gIHByaXZhdGUgZmluZEVsZW1lbnRCeURlc2NyaXB0aW9uKFxyXG4gICAgZGVzY3JpcHRpb246IHN0cmluZyxcclxuICAgIGFuYWx5c2lzOiBBcHBsaWNhdGlvbkFuYWx5c2lzXHJcbiAgKTogYW55IHtcclxuICAgIGNvbnN0IGxvd2VyRGVzYyA9IGRlc2NyaXB0aW9uLnRvTG93ZXJDYXNlKCk7XHJcblxyXG4gICAgLy8gVHJ5IHRvIG1hdGNoIGJ5IHRleHQgY29udGVudFxyXG4gICAgbGV0IG1hdGNoID0gYW5hbHlzaXMuZWxlbWVudHMuZmluZChcclxuICAgICAgKGVsKSA9PiBlbC5hdHRyaWJ1dGVzLnRleHQ/LnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMobG93ZXJEZXNjKVxyXG4gICAgKTtcclxuICAgIGlmIChtYXRjaCkgcmV0dXJuIG1hdGNoO1xyXG5cclxuICAgIC8vIFRyeSB0byBtYXRjaCBieSBhcmlhLWxhYmVsXHJcbiAgICBtYXRjaCA9IGFuYWx5c2lzLmVsZW1lbnRzLmZpbmQoXHJcbiAgICAgIChlbCkgPT4gZWwuYXR0cmlidXRlc1snYXJpYS1sYWJlbCddPy50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKGxvd2VyRGVzYylcclxuICAgICk7XHJcbiAgICBpZiAobWF0Y2gpIHJldHVybiBtYXRjaDtcclxuXHJcbiAgICAvLyBUcnkgdG8gbWF0Y2ggYnkgcGxhY2Vob2xkZXJcclxuICAgIG1hdGNoID0gYW5hbHlzaXMuZWxlbWVudHMuZmluZChcclxuICAgICAgKGVsKSA9PiBlbC5hdHRyaWJ1dGVzLnBsYWNlaG9sZGVyPy50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKGxvd2VyRGVzYylcclxuICAgICk7XHJcbiAgICBpZiAobWF0Y2gpIHJldHVybiBtYXRjaDtcclxuXHJcbiAgICAvLyBUcnkgdG8gbWF0Y2ggYnkgbmFtZVxyXG4gICAgbWF0Y2ggPSBhbmFseXNpcy5lbGVtZW50cy5maW5kKFxyXG4gICAgICAoZWwpID0+IGVsLmF0dHJpYnV0ZXMubmFtZT8udG9Mb3dlckNhc2UoKS5pbmNsdWRlcyhsb3dlckRlc2MpXHJcbiAgICApO1xyXG4gICAgaWYgKG1hdGNoKSByZXR1cm4gbWF0Y2g7XHJcblxyXG4gICAgLy8gVHJ5IHRvIG1hdGNoIGJ5IGlkXHJcbiAgICBtYXRjaCA9IGFuYWx5c2lzLmVsZW1lbnRzLmZpbmQoXHJcbiAgICAgIChlbCkgPT4gZWwuYXR0cmlidXRlcy5pZD8udG9Mb3dlckNhc2UoKS5pbmNsdWRlcyhsb3dlckRlc2MpXHJcbiAgICApO1xyXG4gICAgaWYgKG1hdGNoKSByZXR1cm4gbWF0Y2g7XHJcblxyXG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEZvcm1hdCBhc3NlcnRpb24gZm9yIGV4cGVjdGVkIHJlc3VsdFxyXG4gICAqIFxyXG4gICAqIEBwYXJhbSBhaVN0ZXAgLSBBSS1nZW5lcmF0ZWQgc3RlcCB3aXRoIGFzc2VydGlvblxyXG4gICAqIEByZXR1cm5zIEZvcm1hdHRlZCBhc3NlcnRpb24gc3RyaW5nXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBmb3JtYXRBc3NlcnRpb24oYWlTdGVwOiBBSUdlbmVyYXRlZFN0ZXApOiBzdHJpbmcge1xyXG4gICAgaWYgKCFhaVN0ZXAuYXNzZXJ0aW9uKSB7XHJcbiAgICAgIHJldHVybiBhaVN0ZXAuZGVzY3JpcHRpb247XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgeyB0eXBlLCBleHBlY3RlZCB9ID0gYWlTdGVwLmFzc2VydGlvbjtcclxuXHJcbiAgICBzd2l0Y2ggKHR5cGUpIHtcclxuICAgICAgY2FzZSAnZXhpc3RzJzpcclxuICAgICAgICByZXR1cm4gYEVsZW1lbnQgZXhpc3RzYDtcclxuICAgICAgY2FzZSAndmlzaWJsZSc6XHJcbiAgICAgICAgcmV0dXJuIGBFbGVtZW50IGlzIHZpc2libGVgO1xyXG4gICAgICBjYXNlICd0ZXh0JzpcclxuICAgICAgICByZXR1cm4gYFRleHQgZXF1YWxzIFwiJHtleHBlY3RlZH1cImA7XHJcbiAgICAgIGNhc2UgJ3ZhbHVlJzpcclxuICAgICAgICByZXR1cm4gYFZhbHVlIGVxdWFscyBcIiR7ZXhwZWN0ZWR9XCJgO1xyXG4gICAgICBjYXNlICdhdHRyaWJ1dGUnOlxyXG4gICAgICAgIHJldHVybiBgQXR0cmlidXRlIGVxdWFscyBcIiR7ZXhwZWN0ZWR9XCJgO1xyXG4gICAgICBkZWZhdWx0OlxyXG4gICAgICAgIHJldHVybiBhaVN0ZXAuZGVzY3JpcHRpb247XHJcbiAgICB9XHJcbiAgfVxyXG59XHJcbiJdfQ==
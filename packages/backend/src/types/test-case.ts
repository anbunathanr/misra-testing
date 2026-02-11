export interface TestCase {
  testCaseId: string;
  suiteId: string;
  projectId: string;
  userId: string;
  name: string;
  description: string;
  type: 'functional' | 'ui' | 'api' | 'performance';
  steps: TestStep[];
  priority: 'high' | 'medium' | 'low';
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

export interface TestStep {
  stepNumber: number;
  action: 'navigate' | 'click' | 'type' | 'assert' | 'wait' | 'api-call';
  target: string;
  value?: string;
  expectedResult?: string;
}

export interface CreateTestCaseInput {
  suiteId: string;
  projectId: string;
  name: string;
  description: string;
  type: 'functional' | 'ui' | 'api' | 'performance';
  steps: TestStep[];
  priority?: 'high' | 'medium' | 'low';
  tags?: string[];
}

export interface UpdateTestCaseInput {
  testCaseId: string;
  name?: string;
  description?: string;
  type?: 'functional' | 'ui' | 'api' | 'performance';
  steps?: TestStep[];
  priority?: 'high' | 'medium' | 'low';
  tags?: string[];
}

export interface TestSuite {
  suiteId: string;
  projectId: string;
  userId: string;
  name: string;
  description: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

export interface CreateTestSuiteInput {
  projectId: string;
  name: string;
  description: string;
  tags?: string[];
}

export interface UpdateTestSuiteInput {
  suiteId: string;
  name?: string;
  description?: string;
  tags?: string[];
}

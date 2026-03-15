/**
 * Integration Test Data Generators
 * 
 * Generators for creating test data for integration tests.
 * These can be used with property-based testing libraries like fast-check.
 */

/**
 * Generate a valid web URL
 */
export function generateUrl(domain: string = 'example.com'): string {
  const paths = ['', '/login', '/dashboard', '/profile', '/settings', '/products', '/checkout'];
  const path = paths[Math.floor(Math.random() * paths.length)];
  return `https://${domain}${path}`;
}

/**
 * Generate a test scenario description
 */
export function generateScenario(): string {
  const actions = ['Login', 'Submit form', 'Navigate', 'Search', 'Filter', 'Sort', 'Delete', 'Update'];
  const objects = ['user', 'product', 'order', 'profile', 'settings', 'cart', 'item', 'record'];
  
  const action = actions[Math.floor(Math.random() * actions.length)];
  const object = objects[Math.floor(Math.random() * objects.length)];
  
  return `${action} ${object}`;
}

/**
 * Generate a test case with random steps
 */
export function generateTestCase(options: {
  minSteps?: number;
  maxSteps?: number;
  url?: string;
} = {}): any {
  const { minSteps = 2, maxSteps = 5, url = generateUrl() } = options;
  const stepCount = Math.floor(Math.random() * (maxSteps - minSteps + 1)) + minSteps;
  
  const steps = [];
  
  // First step is always navigate
  steps.push({
    stepNumber: 1,
    action: 'navigate',
    target: url,
    expected: ''
  });
  
  // Generate remaining steps
  for (let i = 2; i <= stepCount; i++) {
    steps.push(generateTestStep(i));
  }
  
  return {
    testCaseId: `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: generateScenario(),
    projectId: 'test-project',
    userId: 'test-user',
    steps,
    tags: ['integration-test'],
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
}

/**
 * Generate a single test step
 */
export function generateTestStep(stepNumber: number): any {
  const actions = ['click', 'type', 'assert', 'wait'];
  const action = actions[Math.floor(Math.random() * actions.length)];
  
  const selectors = generateSelector();
  
  return {
    stepNumber,
    action,
    target: selectors,
    expected: action === 'assert' ? 'Success' : '',
    value: action === 'type' ? 'test value' : undefined
  };
}

/**
 * Generate various selector formats
 */
export function generateSelector(): string {
  const selectorTypes = [
    // ID selectors
    () => `#${generateId()}`,
    // Class selectors
    () => `.${generateClassName()}`,
    // Attribute selectors
    () => `[data-testid="${generateId()}"]`,
    () => `[type="${['text', 'button', 'submit', 'email'][Math.floor(Math.random() * 4)]}"]`,
    // Tag selectors
    () => ['button', 'input', 'a', 'div', 'span'][Math.floor(Math.random() * 5)],
    // Complex selectors
    () => `button.${generateClassName()}`,
    () => `div#${generateId()} > button`,
  ];
  
  const generator = selectorTypes[Math.floor(Math.random() * selectorTypes.length)];
  return generator();
}

/**
 * Generate a random ID
 */
function generateId(): string {
  const prefixes = ['submit', 'login', 'search', 'filter', 'button', 'input', 'form'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const suffix = Math.floor(Math.random() * 100);
  return `${prefix}-${suffix}`;
}

/**
 * Generate a random class name
 */
function generateClassName(): string {
  const classes = ['btn', 'primary', 'secondary', 'success', 'error', 'warning', 'info', 'active', 'disabled'];
  return classes[Math.floor(Math.random() * classes.length)];
}

/**
 * Generate multiple test cases
 */
export function generateTestCases(count: number, options?: Parameters<typeof generateTestCase>[0]): any[] {
  return Array.from({ length: count }, () => generateTestCase(options));
}

/**
 * Generate test execution result
 */
export function generateExecution(testCaseId: string, result: 'pass' | 'fail' = 'pass'): any {
  return {
    executionId: `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    testCaseId,
    status: 'completed',
    result,
    duration: Math.floor(Math.random() * 5000) + 1000, // 1-6 seconds
    error: result === 'fail' ? 'Element not found' : undefined,
    screenshotUrl: result === 'fail' ? `s3://screenshots/${testCaseId}.png` : undefined,
    startedAt: Date.now() - 5000,
    completedAt: Date.now()
  };
}

/**
 * Generate notification payload
 */
export function generateNotification(executionId: string): any {
  return {
    notificationId: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    eventId: executionId,
    userId: 'test-user',
    deliveryMethod: 'email',
    deliveryStatus: 'delivered',
    retryCount: 0,
    metadata: {
      executionId,
      result: 'pass'
    },
    createdAt: Date.now()
  };
}

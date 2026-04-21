// Mock backend service for testing the automated workflow
// This simulates the API responses when the actual backend is not available

export interface MockAnalysisResult {
  analysisId: string;
  complianceScore: number;
  violations: Array<{
    ruleId: string;
    ruleName: string;
    severity: 'error' | 'warning' | 'info';
    line: number;
    column: number;
    message: string;
    suggestion?: string;
  }>;
  success: boolean;
  duration: number;
  timestamp: Date;
  reportUrl?: string;
}

export class MockBackendService {
  private static instance: MockBackendService;
  private isEnabled: boolean = false;

  static getInstance(): MockBackendService {
    if (!MockBackendService.instance) {
      MockBackendService.instance = new MockBackendService();
    }
    return MockBackendService.instance;
  }

  enable() {
    this.isEnabled = true;
    console.log('🎭 Mock Backend Service enabled for testing');
  }

  disable() {
    this.isEnabled = false;
    console.log('🎭 Mock Backend Service disabled');
  }

  isActive(): boolean {
    return this.isEnabled;
  }

  // Mock quick registration
  async mockQuickRegister(email: string, name?: string) {
    await this.delay(1000); // Simulate network delay
    
    return {
      accessToken: 'mock-jwt-token-' + Date.now(),
      refreshToken: 'mock-refresh-token-' + Date.now(),
      user: {
        userId: 'user-' + Date.now(),
        email,
        name: name || email.split('@')[0],
        organizationId: 'org-' + Date.now(),
        role: 'developer'
      },
      expiresIn: 3600,
      isNewUser: true,
      message: 'Mock registration successful'
    };
  }

  // Mock sample file upload
  async mockUploadSample(_sampleId: string, fileName: string) {
    await this.delay(1500); // Simulate upload time
    
    return {
      fileId: 'file-' + Date.now(),
      fileName,
      uploadUrl: 'https://mock-s3-url.com/upload',
      s3Key: `samples/${fileName}`
    };
  }

  // Mock analysis start
  async mockStartAnalysis(_fileId: string) {
    await this.delay(500);
    
    return {
      analysisId: 'analysis-' + Date.now(),
      status: 'queued',
      message: 'Analysis started successfully'
    };
  }

  // Mock analysis status polling
  async mockAnalysisStatus(analysisId: string, progressCallback?: (progress: number) => void): Promise<MockAnalysisResult> {
    // Simulate progressive analysis with realistic timing
    const steps = [
      { progress: 10, message: 'Initializing analysis engine...' },
      { progress: 25, message: 'Parsing source code...' },
      { progress: 40, message: 'Evaluating MISRA C rules...' },
      { progress: 60, message: 'Checking compliance violations...' },
      { progress: 80, message: 'Generating violation reports...' },
      { progress: 95, message: 'Finalizing results...' },
      { progress: 100, message: 'Analysis complete!' }
    ];

    for (const step of steps) {
      await this.delay(2000); // 2 seconds per step
      progressCallback?.(step.progress);
      console.log(`🔍 Mock Analysis: ${step.progress}% - ${step.message}`);
    }

    // Generate realistic mock results
    const mockViolations = [
      {
        ruleId: 'MISRA-C-2012-8.4',
        ruleName: 'A compatible declaration shall be visible when an object or function with external linkage is defined',
        severity: 'error' as const,
        line: 5,
        column: 5,
        message: 'Function undeclared_function is defined without a visible declaration',
        suggestion: 'Add function declaration before definition'
      },
      {
        ruleId: 'MISRA-C-2012-2.2',
        ruleName: 'There shall be no dead code',
        severity: 'warning' as const,
        line: 9,
        column: 9,
        message: 'Variable unused_var is declared but never used',
        suggestion: 'Remove unused variable or use it in the code'
      },
      {
        ruleId: 'MISRA-C-2012-17.7',
        ruleName: 'The value returned by a function having non-void return type shall be used',
        severity: 'warning' as const,
        line: 12,
        column: 12,
        message: 'Return value of printf function is not used',
        suggestion: 'Check return value or cast to void if intentionally ignored'
      }
    ];

    const complianceScore = Math.round(((50 - mockViolations.length) / 50) * 100);

    return {
      analysisId,
      complianceScore,
      violations: mockViolations,
      success: true,
      duration: 14000, // 14 seconds total
      timestamp: new Date(),
      reportUrl: `https://mock-reports.com/analysis-${analysisId}.pdf`
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Helper method to check if we should use mock backend
  shouldUseMock(apiUrl?: string): boolean {
    // Check for explicit environment variable to control mock mode
    const explicitMockSetting = import.meta.env.VITE_USE_MOCK_BACKEND;
    
    // If explicitly set, use that value (string 'true'/'false' from env vars)
    if (explicitMockSetting !== undefined) {
      const shouldMock = explicitMockSetting === 'true';
      console.log(`🎭 Mock Backend: Explicit setting VITE_USE_MOCK_BACKEND=${explicitMockSetting}, using mock: ${shouldMock}`);
      return shouldMock;
    }
    
    // If not explicitly set, check if manually enabled
    if (this.isEnabled) {
      console.log('🎭 Mock Backend: Manually enabled via enable() method');
      return true;
    }
    
    // Default behavior: disable mock mode when real backend is available and configured
    const isDevelopment = import.meta.env.MODE === 'development';
    const isProduction = import.meta.env.MODE === 'production';
    
    // In production, default to false (use real backend)
    if (isProduction) {
      console.log('🎭 Mock Backend: Production mode detected, using real backend');
      return false;
    }
    
    // In development, check if real backend is available and configured
    if (isDevelopment && apiUrl) {
      const hasRealBackend = apiUrl && 
                           !apiUrl.includes('localhost') && 
                           !apiUrl.includes('127.0.0.1') &&
                           !apiUrl.includes('mock') &&
                           apiUrl.startsWith('http');
      
      if (hasRealBackend) {
        console.log(`🎭 Mock Backend: Real backend available at ${apiUrl}, using real backend`);
        return false;
      } else {
        console.log(`🎭 Mock Backend: No real backend configured (${apiUrl}), using mock backend`);
        return true;
      }
    }
    
    // Fallback: use mock in development if no API URL provided
    const shouldUseMockFallback = isDevelopment;
    console.log(`🎭 Mock Backend: Fallback decision - development: ${isDevelopment}, using mock: ${shouldUseMockFallback}`);
    return shouldUseMockFallback;
  }
}

export const mockBackend = MockBackendService.getInstance();

// Auto-enable based on environment configuration
// Only auto-enable if VITE_USE_MOCK_BACKEND is explicitly set to 'true'
// or if in development mode with no explicit setting and no real backend configured
const explicitMockSetting = import.meta.env.VITE_USE_MOCK_BACKEND;
const isDevelopment = import.meta.env.MODE === 'development';
const apiUrl = import.meta.env.VITE_API_URL;

if (explicitMockSetting === 'true') {
  console.log('🎭 Auto-enabling mock backend due to VITE_USE_MOCK_BACKEND=true');
  mockBackend.enable();
} else if (explicitMockSetting === 'false') {
  console.log('🎭 Mock backend explicitly disabled via VITE_USE_MOCK_BACKEND=false');
  mockBackend.disable();
} else if (isDevelopment && (!apiUrl || apiUrl.includes('localhost') || apiUrl.includes('127.0.0.1'))) {
  // Only auto-enable in development if no real backend is configured
  console.log('🎭 Auto-enabling mock backend in development mode (no real backend configured)');
  mockBackend.enable();
} else {
  console.log('🎭 Mock backend not auto-enabled - using real backend configuration');
}
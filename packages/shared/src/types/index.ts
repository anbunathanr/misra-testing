// Core domain types for MISRA Web Testing Platform

export interface User {
  userId: string;
  email: string;
  organizationId: string;
  role: 'admin' | 'developer' | 'viewer';
  preferences: UserPreferences;
  createdAt: Date;
  lastLoginAt: Date;
}

export interface UserPreferences {
  theme: 'light' | 'dark';
  notifications: {
    email: boolean;
    webhook: boolean;
  };
  defaultMisraRuleSet: MisraRuleSet;
}

export interface Project {
  projectId: string;
  name: string;
  description: string;
  organizationId: string;
  misraRuleSet: MisraRuleSet;
  settings: ProjectSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectSettings {
  autoAnalysis: boolean;
  webhookUrl?: string;
  cicdIntegration: {
    enabled: boolean;
    platform: 'github' | 'gitlab' | 'jenkins';
    config: Record<string, any>;
  };
}

export type MisraRuleSet = 'MISRA_C_2004' | 'MISRA_C_2012' | 'MISRA_CPP_2008';

export interface MISRAAnalysis {
  analysisId: string;
  projectId: string;
  fileId: string;
  violations: MISRAViolation[];
  summary: AnalysisSummary;
  status: 'pending' | 'completed' | 'failed';
  createdAt: Date;
  completedAt?: Date;
}

export interface MISRAViolation {
  ruleId: string;
  severity: 'error' | 'warning' | 'info';
  lineNumber: number;
  columnNumber: number;
  message: string;
  suggestion?: string;
}

export interface AnalysisSummary {
  totalViolations: number;
  errorCount: number;
  warningCount: number;
  infoCount: number;
  codeQualityScore: number;
}

export interface TestRun {
  testRunId: string;
  projectId: string;
  triggerSource: 'manual' | 'ci_cd' | 'scheduled';
  results: TestResult[];
  summary: TestSummary;
  status: 'running' | 'completed' | 'failed';
  createdAt: Date;
  completedAt?: Date;
}

export interface TestResult {
  testId: string;
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  browser: string;
  screenshots: string[];
  errorMessage?: string;
}

export interface TestSummary {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  totalDuration: number;
}
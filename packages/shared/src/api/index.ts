// API request/response types

// Authentication
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: import('../types').User;
  expiresIn: number;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface RefreshResponse {
  accessToken: string;
  expiresIn: number;
}

// File Management
export interface FileUploadRequest {
  projectId: string;
  files: File[];
  analysisType: 'misra' | 'regression' | 'both';
}

export interface UploadedFile {
  fileId: string;
  filename: string;
  size: number;
  uploadUrl: string;
}

export interface FileUploadResponse {
  uploadId: string;
  files: UploadedFile[];
  status: 'uploaded' | 'processing';
}

export interface AnalysisResponse {
  analysis: import('../types').MISRAAnalysis;
  downloadUrl?: string;
}

// Testing
export interface TestRunRequest {
  projectId: string;
  testSuite?: string;
  browsers: string[];
  environment: 'staging' | 'production';
}

export interface TestRunResponse {
  testRunId: string;
  status: 'queued' | 'running';
  estimatedDuration: number;
}

export interface TestResultsResponse {
  testRun: import('../types').TestRun;
  downloadUrl?: string;
}

// Error Response
export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
    timestamp: string;
    requestId: string;
  };
}
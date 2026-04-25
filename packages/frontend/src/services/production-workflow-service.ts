/**
 * Production Workflow Service
 * 
 * Real AWS backend integration for the automated MISRA analysis workflow.
 * Replaces the demo/mock workflow with actual AWS Cognito, S3, and Lambda integration.
 * 
 * Flow:
 * 1. Authentication with AWS Cognito (email verification + MFA)
 * 2. File upload to S3 with presigned URLs
 * 3. Trigger MISRA analysis Lambda
 * 4. Poll for analysis results
 * 5. Display results with real violations
 */

import { authService } from './auth-service';

export interface ProductionWorkflowProgress {
  currentStep: number;
  completedSteps: number[];
  overallProgress: number;
  isRunning: boolean;
  estimatedTimeRemaining?: number;
  analysisProgress?: number;
  rulesProcessed?: number;
  totalRules?: number;
  currentMessage?: string;
}

export interface ProductionWorkflowResult {
  success: boolean;
  analysisResults?: any;
  selectedFile?: any;
  executionTime: number;
  error?: string;
  logs: string[];
}

export interface ProductionWorkflowOptions {
  email: string;
  name?: string;
  fileContent?: string;
  fileName?: string;
  language?: 'c' | 'cpp';
}

export type ProductionProgressCallback = (progress: ProductionWorkflowProgress) => void;

export class ProductionWorkflowService {
  private apiUrl: string;
  private currentWorkflow: ProductionWorkflowProgress | null = null;
  private progressCallback: ProductionProgressCallback | null = null;
  private pollingInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.apiUrl = import.meta.env.VITE_API_URL || '';
    
    if (!this.apiUrl) {
      console.warn('⚠️ VITE_API_URL not configured. Please set it in .env file');
    }
  }

  /**
   * Start the production automated workflow with real AWS backend
   */
  public async startAutomatedWorkflow(
    options: ProductionWorkflowOptions,
    onProgress?: ProductionProgressCallback
  ): Promise<ProductionWorkflowResult> {
    this.progressCallback = onProgress || null;
    const startTime = Date.now();
    const logs: string[] = [];

    // Initialize workflow progress
    this.currentWorkflow = {
      currentStep: 1,
      completedSteps: [],
      overallProgress: 0,
      isRunning: true,
      estimatedTimeRemaining: 60,
      analysisProgress: 0,
      rulesProcessed: 0,
      totalRules: 50,
      currentMessage: 'Initializing workflow...'
    };

    try {
      logs.push(`🚀 Starting production workflow for ${options.email}`);
      this.updateProgress();

      // Step 1: Authentication with AWS Cognito
      const authResult = await this.executeAuthenticationStep(options, logs);
      if (!authResult.success) {
        return this.handleWorkflowError(authResult.error!, logs, startTime);
      }

      // Step 2: File Selection and Upload to S3
      const fileResult = await this.executeFileUploadStep(options, logs);
      if (!fileResult.success) {
        return this.handleWorkflowError(fileResult.error!, logs, startTime);
      }

      // Step 3: Trigger MISRA Analysis Lambda
      const analysisResult = await this.executeAnalysisStep(fileResult.fileId!, logs);
      if (!analysisResult.success) {
        return this.handleWorkflowError(analysisResult.error!, logs, startTime);
      }

      // Step 4: Results Processing
      const resultsResult = await this.executeResultsStep(analysisResult.results, logs);
      if (!resultsResult.success) {
        return this.handleWorkflowError(resultsResult.error!, logs, startTime);
      }

      // Workflow completed successfully
      this.completeWorkflow();
      const executionTime = Date.now() - startTime;

      logs.push(`✅ Production workflow completed successfully in ${executionTime}ms`);

      return {
        success: true,
        analysisResults: resultsResult.results,
        selectedFile: fileResult.file,
        executionTime,
        logs
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return this.handleWorkflowError(errorMessage, logs, startTime);
    } finally {
      if (this.pollingInterval) {
        clearInterval(this.pollingInterval);
      }
    }
  }

  /**
   * Step 1: Authentication with AWS Cognito
   */
  private async executeAuthenticationStep(
    options: ProductionWorkflowOptions,
    logs: string[]
  ): Promise<{ success: boolean; error?: string }> {
    this.setStepActive(1, 'Authenticating with AWS Cognito...');
    logs.push(`🔐 Step 1: Authenticating user ${options.email}`);

    try {
      // Check if user is already authenticated
      const isAuthenticated = await authService.isAuthenticated();

      if (!isAuthenticated) {
        logs.push(`⚠️ User not authenticated - authentication required`);
        logs.push(`📝 Please log in through the Login page first`);
        
        // For production, users must authenticate through the proper login flow
        // This includes email verification and MFA setup
        throw new Error('Authentication required. Please log in first.');
      } else {
        logs.push(`✅ User already authenticated`);
      }

      this.completeStep(1);
      return { success: true };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
      this.setStepError(1, errorMessage);
      logs.push(`❌ Authentication failed: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Step 2: File Upload to S3
   */
  private async executeFileUploadStep(
    options: ProductionWorkflowOptions,
    logs: string[]
  ): Promise<{ success: boolean; fileId?: string; s3Key?: string; file?: any; error?: string }> {
    this.setStepActive(2, 'Uploading file to S3...');
    logs.push(`📁 Step 2: Uploading file to S3`);

    try {
      // Get authentication token
      const token = await authService.getToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      // Select sample file or use provided file
      const fileName = options.fileName || this.selectSampleFileName(options.language);
      const fileContent = options.fileContent || this.getSampleFileContent(fileName);
      const fileSize = new Blob([fileContent]).size;

      logs.push(`📄 Selected file: ${fileName} (${fileSize} bytes)`);

      // Request presigned upload URL
      logs.push(`🔗 Requesting presigned upload URL`);
      
      const uploadUrlResponse = await fetch(`${this.apiUrl}/files/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          fileName,
          fileSize,
          contentType: 'text/plain'
        })
      });

      if (!uploadUrlResponse.ok) {
        const error = await uploadUrlResponse.json();
        throw new Error(error.error?.message || 'Failed to get upload URL');
      }

      const uploadData = await uploadUrlResponse.json();
      console.log(`✅ Upload response received:`, {
        fileId: uploadData.fileId,
        s3Key: uploadData.s3Key,
        uploadUrlPrefix: uploadData.uploadUrl.substring(0, 100)
      });
      logs.push(`✅ Presigned URL obtained: ${uploadData.fileId}`);
      logs.push(`🔑 S3 Key: ${uploadData.s3Key}`);

      // Upload file to S3 using presigned URL
      logs.push(`☁️ Uploading file to S3...`);
      
      const s3UploadResponse = await fetch(uploadData.uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'text/plain'
        },
        body: fileContent
      });

      if (!s3UploadResponse.ok) {
        throw new Error('Failed to upload file to S3');
      }

      logs.push(`✅ File uploaded successfully to S3`);

      this.completeStep(2);
      return {
        success: true,
        fileId: uploadData.fileId,
        s3Key: uploadData.s3Key,
        file: {
          name: fileName,
          size: fileSize,
          language: fileName.endsWith('.cpp') ? 'cpp' : 'c'
        }
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'File upload failed';
      this.setStepError(2, errorMessage);
      logs.push(`❌ File upload failed: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Step 3: Trigger MISRA Analysis
   */
  private async executeAnalysisStep(
    fileId: string,
    logs: string[]
  ): Promise<{ success: boolean; results?: any; error?: string }> {
    this.setStepActive(3, 'Running MISRA analysis...');
    logs.push(`🔍 Step 3: Starting MISRA analysis for file ${fileId}`);

    try {
      const token = await authService.getToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      // Analysis is triggered automatically via SQS queue after upload
      // We need to poll for results
      logs.push(`⏳ Waiting for analysis to complete...`);

      const results = await this.pollForAnalysisResults(fileId, logs);

      logs.push(`✅ Analysis completed: ${results.summary.compliancePercentage}% compliance`);
      logs.push(`📊 Found ${results.violations.length} violations`);

      this.completeStep(3);
      return { success: true, results };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Analysis failed';
      this.setStepError(3, errorMessage);
      logs.push(`❌ Analysis failed: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Poll for analysis results with progress updates
   */
  private async pollForAnalysisResults(fileId: string, logs: string[]): Promise<any> {
    const maxAttempts = 60; // 5 minutes max (5 second intervals)
    let attempts = 0;

    return new Promise((resolve, reject) => {
      this.pollingInterval = setInterval(async () => {
        attempts++;

        try {
          // Get fresh token on each poll attempt
          const token = await authService.getToken();
          if (!token) {
            throw new Error('No authentication token available - user may have been logged out');
          }

          // Check file metadata for analysis status
          const response = await fetch(`${this.apiUrl}/files/${fileId}/status`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (!response.ok) {
            throw new Error('Failed to check analysis status');
          }

          const data = await response.json();

          // Update progress
          if (data.analysisProgress !== undefined) {
            if (this.currentWorkflow) {
              this.currentWorkflow.analysisProgress = data.analysisProgress;
              this.currentWorkflow.rulesProcessed = data.rulesProcessed || 0;
              this.currentWorkflow.currentMessage = data.analysisMessage || 'Analyzing...';
              this.updateProgress();
            }
            logs.push(`🔍 Analysis progress: ${data.analysisProgress}%`);
          }

          // Check if analysis is complete
          if (data.analysisStatus === 'completed') {
            if (this.pollingInterval) {
              clearInterval(this.pollingInterval);
            }

            // Get fresh token for results fetch
            const resultsToken = await authService.getToken();
            if (!resultsToken) {
              throw new Error('No authentication token available for results fetch');
            }

            // Fetch full analysis results
            const resultsResponse = await fetch(`${this.apiUrl}/analysis/results/${data.analysisId}`, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${resultsToken}`,
                'Content-Type': 'application/json'
              }
            });

            if (!resultsResponse.ok) {
              throw new Error('Failed to fetch analysis results');
            }

            const results = await resultsResponse.json();
            resolve(results);
            return;
          }

          // Check if analysis failed
          if (data.analysisStatus === 'failed') {
            if (this.pollingInterval) {
              clearInterval(this.pollingInterval);
            }
            reject(new Error(data.errorMessage || 'Analysis failed'));
            return;
          }

          // Check timeout
          if (attempts >= maxAttempts) {
            if (this.pollingInterval) {
              clearInterval(this.pollingInterval);
            }
            reject(new Error('Analysis timeout - please try again'));
            return;
          }

        } catch (error) {
          if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
          }
          reject(error);
        }
      }, 5000); // Poll every 5 seconds
    });
  }

  /**
   * Step 4: Results Processing
   */
  private async executeResultsStep(
    analysisResults: any,
    logs: string[]
  ): Promise<{ success: boolean; results?: any; error?: string }> {
    this.setStepActive(4, 'Processing results...');
    logs.push(`📊 Step 4: Processing and formatting results`);

    try {
      // Format results for display
      const processedResults = {
        ...analysisResults,
        timestamp: new Date().toISOString(),
        processingTime: Date.now(),
        formatted: true
      };

      logs.push(`✅ Results processed and formatted successfully`);

      this.completeStep(4);
      return { success: true, results: processedResults };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Results processing failed';
      this.setStepError(4, errorMessage);
      logs.push(`❌ Results processing failed: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Helper: Select sample file name
   */
  private selectSampleFileName(language?: 'c' | 'cpp'): string {
    const cFiles = ['perfect_compliance.c', 'medium_compliance.c', 'complex_violations.c'];
    const cppFiles = ['high_compliance.cpp', 'problematic_code.cpp'];
    
    const files = language === 'cpp' ? cppFiles : (language === 'c' ? cFiles : [...cFiles, ...cppFiles]);
    return files[Math.floor(Math.random() * files.length)];
  }

  /**
   * Helper: Get sample file content
   */
  private getSampleFileContent(fileName: string): string {
    // Return simple sample content
    // In production, this would come from the sample files library
    return `/* Sample ${fileName} */
#include <stdio.h>

int main(void) {
    printf("Hello, MISRA!\\n");
    return 0;
}`;
  }

  /**
   * Update progress and notify callback
   */
  private updateProgress(): void {
    if (this.progressCallback && this.currentWorkflow) {
      this.progressCallback(this.currentWorkflow);
    }
  }

  /**
   * Set step as active
   */
  private setStepActive(stepId: number, message: string): void {
    if (!this.currentWorkflow) return;

    this.currentWorkflow.currentStep = stepId;
    this.currentWorkflow.currentMessage = message;
    this.updateProgress();
  }

  /**
   * Complete a step
   */
  private completeStep(stepId: number): void {
    if (!this.currentWorkflow) return;

    this.currentWorkflow.completedSteps.push(stepId);
    this.currentWorkflow.overallProgress = 
      (this.currentWorkflow.completedSteps.length / 4) * 100;
    
    this.updateProgress();
  }

  /**
   * Set step error
   */
  private setStepError(stepId: number, error: string): void {
    if (!this.currentWorkflow) return;

    this.currentWorkflow.currentMessage = `Error: ${error}`;
    this.updateProgress();
  }

  /**
   * Complete entire workflow
   */
  private completeWorkflow(): void {
    if (!this.currentWorkflow) return;

    this.currentWorkflow.isRunning = false;
    this.currentWorkflow.overallProgress = 100;
    this.currentWorkflow.estimatedTimeRemaining = 0;
    this.currentWorkflow.currentMessage = 'Workflow completed successfully';
    this.updateProgress();
  }

  /**
   * Handle workflow error
   */
  private handleWorkflowError(
    error: string,
    logs: string[],
    startTime: number
  ): ProductionWorkflowResult {
    logs.push(`❌ Workflow failed: ${error}`);
    
    if (this.currentWorkflow) {
      this.currentWorkflow.isRunning = false;
      this.currentWorkflow.currentMessage = `Error: ${error}`;
      this.updateProgress();
    }

    return {
      success: false,
      error,
      executionTime: Date.now() - startTime,
      logs
    };
  }
}

// Export singleton instance
export const productionWorkflowService = new ProductionWorkflowService();

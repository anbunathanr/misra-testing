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
import { API_URL } from '../config/api-config';

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
    this.apiUrl = API_URL;
    
    // Debug: Log the API URL being used
    console.log('🔧 ProductionWorkflowService API URL:', this.apiUrl);
    console.log('🔧 Environment variables:', {
      VITE_API_URL: import.meta.env.VITE_API_URL,
      VITE_ENVIRONMENT: import.meta.env.VITE_ENVIRONMENT,
      VITE_USE_MOCK_BACKEND: import.meta.env.VITE_USE_MOCK_BACKEND
    });
    
    if (!this.apiUrl) {
      console.warn('⚠️ API URL not configured properly');
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
      totalRules: 357, // Updated to reflect actual MISRA rule count (151 C + 206 C++)
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

      // Step 2.5: Queue Analysis (after S3 upload completes)
      const queueResult = await this.executeQueueAnalysisStep(fileResult, logs);
      if (!queueResult.success) {
        return this.handleWorkflowError(queueResult.error!, logs, startTime);
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
      console.log(`📄 File content prepared:`, {
        fileName,
        fileSize,
        contentLength: fileContent.length,
        contentPreview: fileContent.substring(0, 100)
      });

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

      const etag = s3UploadResponse.headers.get('etag');
      console.log(`📤 S3 upload response:`, {
        status: s3UploadResponse.status,
        statusText: s3UploadResponse.statusText,
        etag,
        headers: {
          contentLength: s3UploadResponse.headers.get('content-length'),
          location: s3UploadResponse.headers.get('location')
        }
      });

      if (!s3UploadResponse.ok) {
        const errorText = await s3UploadResponse.text();
        console.error(`❌ S3 upload failed:`, {
          status: s3UploadResponse.status,
          statusText: s3UploadResponse.statusText,
          errorText,
          uploadUrl: uploadData.uploadUrl.substring(0, 100)
        });
        throw new Error(`S3 upload failed: ${s3UploadResponse.status} ${s3UploadResponse.statusText}`);
      }

      // Verify upload completed with ETag
      if (!etag) {
        throw new Error('S3 upload verification failed - no ETag returned');
      }

      logs.push(`✅ File uploaded successfully to S3 (ETag: ${etag})`);

      // Add delay for S3 eventual consistency
      // S3 is eventually consistent - wait before queuing analysis
      // Increased to 2 seconds for nested folder paths
      console.log(`⏳ Waiting for S3 consistency (2000ms)...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      logs.push(`⏳ S3 consistency check complete`);

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
      console.error(`❌ File upload error:`, error);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Step 2.5: Queue Analysis (after S3 upload completes)
   * This ensures S3 eventual consistency before Lambda tries to download
   */
  private async executeQueueAnalysisStep(
    fileResult: { success: boolean; fileId?: string; s3Key?: string; file?: any; error?: string },
    logs: string[]
  ): Promise<{ success: boolean; error?: string }> {
    this.setStepActive(2.5, 'Queuing analysis...');
    logs.push(`📋 Step 2.5: Queuing analysis after S3 upload`);

    try {
      const token = await authService.getToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      if (!fileResult.fileId || !fileResult.s3Key || !fileResult.file) {
        throw new Error('Missing file information for analysis queue');
      }

      const language = fileResult.file.language === 'cpp' ? 'CPP' : 'C';

      console.log(`📋 Queuing analysis:`, {
        fileId: fileResult.fileId,
        s3Key: fileResult.s3Key,
        language
      });

      logs.push(`🔗 Calling queue-analysis endpoint...`);

      const queueResponse = await fetch(`${this.apiUrl}/files/queue-analysis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          fileId: fileResult.fileId,
          fileName: fileResult.file.name,
          s3Key: fileResult.s3Key,
          language
        })
      });

      if (!queueResponse.ok) {
        const error = await queueResponse.json();
        throw new Error(error.error?.message || 'Failed to queue analysis');
      }

      const queueData = await queueResponse.json();
      console.log(`✅ Analysis queued:`, queueData);
      logs.push(`✅ Analysis queued successfully`);

      this.completeStep(2.5);
      return { success: true };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to queue analysis';
      this.setStepError(2.5, errorMessage);
      logs.push(`❌ Queue analysis failed: ${errorMessage}`);
      console.error(`❌ Queue analysis error:`, error);
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
      const poll = async () => {
        attempts++;
        console.log(`📡 Poll attempt ${attempts}/${maxAttempts} for fileId: ${fileId}`);

        try {
          // Get fresh token on each poll attempt
          const token = await authService.getToken();
          if (!token) {
            console.error('❌ No authentication token available');
            throw new Error('No authentication token available - user may have been logged out');
          }

          // Check file metadata for analysis status
          console.log(`📍 Checking status at: ${this.apiUrl}/files/${fileId}/status`);
          const response = await fetch(`${this.apiUrl}/files/${fileId}/status`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (!response.ok) {
            console.error(`❌ Status check failed: ${response.status}`);
            throw new Error(`Failed to check analysis status: ${response.status}`);
          }

          const data = await response.json();
          console.log(`📊 Status response:`, data);

          // Update progress
          if (data.analysisProgress !== undefined) {
            if (this.currentWorkflow) {
              this.currentWorkflow.analysisProgress = data.analysisProgress;
              this.currentWorkflow.rulesProcessed = data.rulesProcessed || 0;
              this.currentWorkflow.totalRules = data.totalRules || 357; // Use backend value or fallback to actual MISRA rule count
              this.currentWorkflow.currentMessage = data.analysisMessage || 'Analyzing...';
              this.updateProgress();
            }
            logs.push(`🔍 Analysis progress: ${data.analysisProgress}%`);
            console.log(`✅ Progress updated: ${data.analysisProgress}% (${data.rulesProcessed || 0}/${data.totalRules || 357} rules)`);
          }

          // Check if analysis is complete
          if (data.analysisStatus === 'completed') {
            console.log(`✅ Analysis status is COMPLETED`);
            
            // Mark step 3 as complete immediately when analysis is done
            // Steps 2 and 2.5 should already be complete from earlier
            if (this.currentWorkflow) {
              if (!this.currentWorkflow.completedSteps.includes(3)) {
                this.currentWorkflow.completedSteps.push(3);
                console.log(`✅ Marked Step 3 as complete`);
                // Update progress calculation
                const totalSteps = 4.5;
                this.currentWorkflow.overallProgress = 
                  (this.currentWorkflow.completedSteps.length / totalSteps) * 100;
                this.updateProgress();
              }
            }

            if (this.pollingInterval) {
              clearInterval(this.pollingInterval);
              this.pollingInterval = null;
            }

            // Get fresh token for results fetch
            const resultsToken = await authService.getToken();
            if (!resultsToken) {
              throw new Error('No authentication token available for results fetch');
            }

            // Fetch full analysis results using fileId (not analysisId)
            console.log(`📍 Fetching results from: ${this.apiUrl}/analysis/results/${fileId}`);
            const resultsResponse = await fetch(`${this.apiUrl}/analysis/results/${fileId}`, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${resultsToken}`,
                'Content-Type': 'application/json'
              }
            });

            console.log(`📊 Results response status: ${resultsResponse.status}`);

            // Handle 202 Accepted - analysis still processing, continue polling
            if (resultsResponse.status === 202) {
              console.log(`⏳ Results not ready (202), will retry in 5 seconds...`);
              logs.push(`⏳ Analysis results not yet available (202 Accepted)`);
              // Schedule next poll
              this.pollingInterval = setTimeout(poll, 5000);
              return;
            }

            // Handle 500 - backend error, but continue polling
            if (resultsResponse.status === 500) {
              console.log(`⚠️ Backend error (500), will retry in 5 seconds...`);
              logs.push(`⚠️ Backend processing (500 - retrying...)`);
              // Schedule next poll
              this.pollingInterval = setTimeout(poll, 5000);
              return;
            }

            if (!resultsResponse.ok) {
              throw new Error(`Failed to fetch analysis results: ${resultsResponse.status} ${resultsResponse.statusText}`);
            }

            const results = await resultsResponse.json();
            console.log(`✅ Results received:`, results);
            resolve(results);
            return;
          }

          // Check if analysis failed
          if (data.analysisStatus === 'failed') {
            console.error(`❌ Analysis failed`);
            if (this.pollingInterval) {
              clearInterval(this.pollingInterval);
              this.pollingInterval = null;
            }
            reject(new Error(data.errorMessage || 'Analysis failed'));
            return;
          }

          // Check timeout
          if (attempts >= maxAttempts) {
            console.error(`❌ Analysis timeout after ${maxAttempts} attempts`);
            if (this.pollingInterval) {
              clearInterval(this.pollingInterval);
              this.pollingInterval = null;
            }
            reject(new Error('Analysis timeout - please try again'));
            return;
          }

          console.log(`⏳ Analysis still running, will retry in 5 seconds...`);
          // Schedule next poll
          this.pollingInterval = setTimeout(poll, 5000);

        } catch (error) {
          console.error(`❌ Poll error on attempt ${attempts}:`, error);
          if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
          }
          reject(error);
        }
      };

      // Start polling immediately
      console.log(`🚀 Starting polling for fileId: ${fileId}`);
      poll();
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
      // PRODUCTION: Only process REAL results from backend
      // No demo/mock results fallback
      if (!analysisResults) {
        const errorMsg = 'No analysis results received from backend';
        logs.push(`❌ ${errorMsg}`);
        return { success: false, error: errorMsg };
      }

      // Validate that we have real analysis data
      if (!analysisResults.analysisId || !analysisResults.fileId) {
        const errorMsg = 'Invalid analysis results - missing required fields';
        logs.push(`❌ ${errorMsg}`);
        return { success: false, error: errorMsg };
      }

      // Format results for display (no modifications to data)
      const finalResults = {
        ...analysisResults,
        timestamp: new Date().toISOString(),
        processingTime: Date.now(),
        formatted: true
      };

      // Log actual results
      logs.push(`✅ Results processed successfully`);
      logs.push(`📊 Violations found: ${analysisResults.violations?.length || 0}`);
      logs.push(`📊 Compliance score: ${analysisResults.summary?.compliancePercentage || 0}%`);

      this.completeStep(4);
      return { success: true, results: finalResults };

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
      // Create a NEW object to force React to detect the change
      // This is critical - React won't re-render if we pass the same object reference
      const progressCopy = { ...this.currentWorkflow };
      this.progressCallback(progressCopy);
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

    // Avoid duplicates
    if (!this.currentWorkflow.completedSteps.includes(stepId)) {
      this.currentWorkflow.completedSteps.push(stepId);
      console.log(`✅ Step ${stepId} marked as complete. Completed steps:`, this.currentWorkflow.completedSteps);
    }
    
    // Update progress calculation to handle step 2.5
    const totalSteps = 4.5; // Steps: 1, 2, 2.5, 3, 4
    this.currentWorkflow.overallProgress = 
      (this.currentWorkflow.completedSteps.length / totalSteps) * 100;
    
    console.log(`📊 Progress: ${this.currentWorkflow.completedSteps.length}/${totalSteps} steps = ${this.currentWorkflow.overallProgress.toFixed(1)}%`);
    this.updateProgress();
  }

  /**
   * Set step error
   */
  private setStepError(_stepId: number, error: string): void {
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
   * Handle workflow error with recovery suggestions
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

    // Add recovery suggestions based on error type
    let recoveryMessage = '';
    if (error.includes('Authentication')) {
      recoveryMessage = 'Please log in again and try the workflow.';
      logs.push(`💡 Recovery: ${recoveryMessage}`);
    } else if (error.includes('timeout') || error.includes('Timeout')) {
      recoveryMessage = 'The analysis took too long. Try again with a smaller file.';
      logs.push(`💡 Recovery: ${recoveryMessage}`);
    } else if (error.includes('S3') || error.includes('upload')) {
      recoveryMessage = 'File upload failed. Check your internet connection and try again.';
      logs.push(`💡 Recovery: ${recoveryMessage}`);
    } else if (error.includes('Analysis')) {
      recoveryMessage = 'Analysis failed. Try with a different file.';
      logs.push(`💡 Recovery: ${recoveryMessage}`);
    } else {
      recoveryMessage = 'An unexpected error occurred. Please try again.';
      logs.push(`💡 Recovery: ${recoveryMessage}`);
    }

    return {
      success: false,
      error: `${error}. ${recoveryMessage}`,
      executionTime: Date.now() - startTime,
      logs
    };
  }

  /**
   * Retry workflow with exponential backoff
   * Useful for transient failures like network timeouts
   */
  public async retryWorkflow(
    options: ProductionWorkflowOptions,
    onProgress?: ProductionProgressCallback,
    maxRetries: number = 3
  ): Promise<ProductionWorkflowResult> {
    let lastError: ProductionWorkflowResult | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(`🔄 Workflow retry attempt ${attempt}/${maxRetries}`);
      
      try {
        const result = await this.startAutomatedWorkflow(options, onProgress);
        
        if (result.success) {
          return result;
        }
        
        lastError = result;
        
        // Only retry on transient errors
        if (!this.isTransientError(result.error || '')) {
          console.log(`❌ Non-transient error, not retrying: ${result.error}`);
          return result;
        }
        
        if (attempt < maxRetries) {
          // Exponential backoff: 2s, 4s, 8s
          const delayMs = Math.pow(2, attempt) * 1000;
          console.log(`⏳ Waiting ${delayMs}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      } catch (error) {
        console.error(`Retry attempt ${attempt} failed:`, error);
        lastError = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          executionTime: 0,
          logs: [`Retry attempt ${attempt} failed`]
        };
        
        if (attempt < maxRetries) {
          const delayMs = Math.pow(2, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }
    }
    
    return lastError || {
      success: false,
      error: 'Workflow failed after all retry attempts',
      executionTime: 0,
      logs: ['All retry attempts exhausted']
    };
  }

  /**
   * Check if error is transient (can be retried)
   */
  private isTransientError(error: string): boolean {
    const transientPatterns = [
      'timeout',
      'ETIMEDOUT',
      'ECONNRESET',
      'NetworkError',
      'ServiceUnavailable',
      'temporarily unavailable',
      'try again',
      '503',
      '502',
      '429' // Rate limit
    ];
    
    return transientPatterns.some(pattern => 
      error.toLowerCase().includes(pattern.toLowerCase())
    );
  }
}

// Export singleton instance
export const productionWorkflowService = new ProductionWorkflowService();

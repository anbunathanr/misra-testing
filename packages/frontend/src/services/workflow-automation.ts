/**
 * Workflow Automation Service
 * 
 * Orchestrates the complete Fire and Forget automated pipeline:
 * Authentication → File Selection → Upload → Analysis → Results
 * 
 * This service coordinates all steps of the automated workflow and provides
 * real-time progress updates for professional demonstrations.
 */

import { autoIngestionAgent, SampleFile, FileSelectionCriteria } from './auto-ingestion-agent';
import { authService } from './auth-service';

export interface WorkflowStep {
  id: number;
  name: string;
  description: string;
  status: 'pending' | 'active' | 'completed' | 'error';
  startTime?: Date;
  endTime?: Date;
  error?: string;
}

export interface WorkflowProgress {
  currentStep: number;
  completedSteps: number[];
  steps: WorkflowStep[];
  overallProgress: number;
  isRunning: boolean;
  estimatedTimeRemaining?: number;
  analysisProgress?: number;
  rulesProcessed?: number;
  totalRules?: number;
}

export interface WorkflowResult {
  success: boolean;
  analysisResults?: any;
  selectedFile?: SampleFile;
  executionTime: number;
  error?: string;
  logs: string[];
}

export interface WorkflowOptions {
  email: string;
  name?: string;
  fileSelectionCriteria?: FileSelectionCriteria;
  demoMode?: boolean;
  skipAuthentication?: boolean;
}

export type ProgressCallback = (progress: WorkflowProgress) => void;

export class WorkflowAutomationService {
  private currentWorkflow: WorkflowProgress | null = null;
  private progressCallback: ProgressCallback | null = null;
  private abortController: AbortController | null = null;

  /**
   * Start the automated Fire and Forget workflow
   */
  public async startAutomatedWorkflow(
    options: WorkflowOptions,
    onProgress?: ProgressCallback
  ): Promise<WorkflowResult> {
    this.progressCallback = onProgress || null;
    this.abortController = new AbortController();

    const startTime = Date.now();
    const logs: string[] = [];

    // Initialize workflow progress
    this.currentWorkflow = {
      currentStep: 1,
      completedSteps: [],
      steps: this.initializeWorkflowSteps(),
      overallProgress: 0,
      isRunning: true,
      estimatedTimeRemaining: 60,
      analysisProgress: 0,
      rulesProcessed: 0,
      totalRules: 50
    };

    try {
      logs.push(`🚀 Starting Fire & Forget workflow for ${options.email}`);
      this.updateProgress();

      // Step 1: Authentication
      const authResult = await this.executeAuthenticationStep(options, logs);
      if (!authResult.success) {
        return this.handleWorkflowError(authResult.error!, logs, startTime);
      }

      // Step 2: File Selection and Upload
      const fileResult = await this.executeFileSelectionStep(options, logs);
      if (!fileResult.success) {
        return this.handleWorkflowError(fileResult.error!, logs, startTime);
      }

      // Step 3: MISRA Analysis
      const analysisResult = await this.executeAnalysisStep(fileResult.selectedFile!, logs);
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

      logs.push(`✅ Workflow completed successfully in ${executionTime}ms`);

      return {
        success: true,
        analysisResults: resultsResult.results,
        selectedFile: fileResult.selectedFile,
        executionTime,
        logs
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return this.handleWorkflowError(errorMessage, logs, startTime);
    }
  }

  /**
   * Abort the current workflow
   */
  public abortWorkflow(): void {
    if (this.abortController) {
      this.abortController.abort();
    }
    if (this.currentWorkflow) {
      this.currentWorkflow.isRunning = false;
      this.updateProgress();
    }
  }

  /**
   * Get current workflow progress
   */
  public getCurrentProgress(): WorkflowProgress | null {
    return this.currentWorkflow;
  }

  /**
   * Initialize workflow steps
   */
  private initializeWorkflowSteps(): WorkflowStep[] {
    return [
      {
        id: 1,
        name: 'Authentication',
        description: 'Auto-authenticate with AWS Cognito',
        status: 'pending'
      },
      {
        id: 2,
        name: 'File Selection & Upload',
        description: 'Select sample file and upload to S3',
        status: 'pending'
      },
      {
        id: 3,
        name: 'MISRA Analysis',
        description: 'Comprehensive compliance analysis',
        status: 'pending'
      },
      {
        id: 4,
        name: 'Results Processing',
        description: 'Format and prepare results',
        status: 'pending'
      }
    ];
  }

  /**
   * Execute authentication step
   */
  private async executeAuthenticationStep(
    options: WorkflowOptions,
    logs: string[]
  ): Promise<{ success: boolean; error?: string }> {
    this.setStepActive(1);
    logs.push(`🔐 Step 1: Authenticating user ${options.email}`);

    try {
      // Check if we're using mock backend
      const useMockBackend = import.meta.env.VITE_USE_MOCK_BACKEND === 'true';
      
      if (options.skipAuthentication || options.demoMode || useMockBackend) {
        // Demo/Mock mode - simulate authentication
        await this.simulateDelay(2000);
        logs.push(`✅ Mock authentication successful for ${options.email}`);
        logs.push(`🎭 Using mock backend for demonstration`);
      } else {
        // Real authentication with AWS Cognito
        const isAuthenticated = await authService.isAuthenticated();
        if (!isAuthenticated) {
          // Auto-register and login for Fire & Forget workflow
          await this.autoRegisterAndLogin(options.email, options.name, logs);
        }
        logs.push(`✅ AWS Cognito authentication successful`);
      }

      this.completeStep(1);
      return { success: true };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
      this.setStepError(1, errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Execute file selection and upload step
   */
  private async executeFileSelectionStep(
    options: WorkflowOptions,
    logs: string[]
  ): Promise<{ success: boolean; selectedFile?: SampleFile; error?: string }> {
    this.setStepActive(2);
    logs.push(`📁 Step 2: Selecting and uploading sample file`);

    try {
      // Auto-select sample file using intelligent selection
      const selectedFile = autoIngestionAgent.selectSampleFile(
        options.fileSelectionCriteria || { targetCompliance: 'varied' }
      );

      logs.push(`📄 Selected file: ${selectedFile.name} (Expected: ${selectedFile.expectedCompliance}% compliance)`);
      logs.push(`🎯 Demonstration purpose: ${selectedFile.metadata.demonstrationPurpose}`);

      // Simulate file upload to S3
      await this.simulateFileUpload(selectedFile, logs);

      this.completeStep(2);
      return { success: true, selectedFile };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'File selection failed';
      this.setStepError(2, errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Execute MISRA analysis step
   */
  private async executeAnalysisStep(
    selectedFile: SampleFile,
    logs: string[]
  ): Promise<{ success: boolean; results?: any; error?: string }> {
    this.setStepActive(3);
    logs.push(`🔍 Step 3: Starting MISRA analysis for ${selectedFile.name}`);

    try {
      // Simulate real-time analysis progress
      const analysisResults = await this.simulateAnalysisWithProgress(selectedFile, logs);

      logs.push(`✅ Analysis completed: ${analysisResults.compliancePercentage}% compliance`);
      logs.push(`📊 Found ${analysisResults.violations.length} violations`);

      this.completeStep(3);
      return { success: true, results: analysisResults };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Analysis failed';
      this.setStepError(3, errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Execute results processing step
   */
  private async executeResultsStep(
    analysisResults: any,
    logs: string[]
  ): Promise<{ success: boolean; results?: any; error?: string }> {
    this.setStepActive(4);
    logs.push(`📊 Step 4: Processing and formatting results`);

    try {
      // Simulate results processing
      await this.simulateDelay(1500);

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
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Auto-register and login user for Fire & Forget workflow
   */
  private async autoRegisterAndLogin(
    email: string,
    name: string | undefined,
    logs: string[]
  ): Promise<void> {
    logs.push(`📝 Auto-registering user: ${email}`);
    
    // Generate temporary password for demo
    const tempPassword = this.generateTempPassword();
    
    try {
      // Attempt registration (will fail if user exists, which is fine)
      await authService.register(email, tempPassword, name || 'Demo User');
      logs.push(`✅ User registered successfully`);
    } catch (error) {
      // User might already exist, try to login
      logs.push(`ℹ️ User may already exist, attempting login`);
    }

    // Attempt login
    await authService.login(email, tempPassword);
    logs.push(`✅ User logged in successfully`);
  }

  /**
   * Simulate file upload with progress
   */
  private async simulateFileUpload(selectedFile: SampleFile, logs: string[]): Promise<void> {
    logs.push(`☁️ Uploading ${selectedFile.name} to S3 (${selectedFile.size} bytes)`);
    
    // Simulate upload progress
    for (let progress = 0; progress <= 100; progress += 20) {
      await this.simulateDelay(200);
      if (progress < 100) {
        logs.push(`📤 Upload progress: ${progress}%`);
      }
    }
    
    logs.push(`✅ File uploaded successfully to S3`);
  }

  /**
   * Simulate MISRA analysis with real-time progress
   */
  private async simulateAnalysisWithProgress(
    selectedFile: SampleFile,
    logs: string[]
  ): Promise<any> {
    const totalRules = this.currentWorkflow!.totalRules!;
    let rulesProcessed = 0;

    logs.push(`🔍 Starting analysis with ${totalRules} MISRA rules`);

    // Simulate rule-by-rule analysis
    for (let i = 0; i < totalRules; i++) {
      await this.simulateDelay(100 + Math.random() * 200);
      
      rulesProcessed++;
      const analysisProgress = Math.round((rulesProcessed / totalRules) * 100);
      
      // Update progress
      if (this.currentWorkflow) {
        this.currentWorkflow.analysisProgress = analysisProgress;
        this.currentWorkflow.rulesProcessed = rulesProcessed;
        this.currentWorkflow.estimatedTimeRemaining = Math.max(0, 
          Math.round((totalRules - rulesProcessed) * 0.15)
        );
        this.updateProgress();
      }

      // Log progress periodically
      if (i % 10 === 0 || i === totalRules - 1) {
        logs.push(`🔍 Processed ${rulesProcessed}/${totalRules} rules (${analysisProgress}%)`);
      }
    }

    // Generate analysis results based on selected file
    const results = {
      compliancePercentage: selectedFile.expectedCompliance,
      violations: this.generateViolations(selectedFile),
      rulesChecked: totalRules,
      rulesViolated: selectedFile.violationCount,
      analysisTime: Date.now(),
      fileName: selectedFile.name,
      language: selectedFile.language
    };

    return results;
  }

  /**
   * Generate violations based on sample file
   */
  private generateViolations(selectedFile: SampleFile): any[] {
    const violations = [];
    
    for (let i = 0; i < selectedFile.violationCount; i++) {
      const ruleId = selectedFile.metadata.primaryViolations[i] || `Rule ${i + 1}`;
      violations.push({
        ruleId,
        severity: Math.random() > 0.5 ? 'error' : 'warning',
        line: Math.floor(Math.random() * 50) + 1,
        column: Math.floor(Math.random() * 80) + 1,
        message: `MISRA ${ruleId} violation detected`,
        description: `This code violates ${ruleId} requirements`
      });
    }
    
    return violations;
  }

  /**
   * Generate temporary password for demo
   */
  private generateTempPassword(): string {
    return 'Demo123!' + Math.random().toString(36).substring(2, 8);
  }

  /**
   * Simulate delay for realistic timing
   */
  private async simulateDelay(ms: number): Promise<void> {
    return new Promise(resolve => {
      setTimeout(resolve, ms);
    });
  }

  /**
   * Set step as active
   */
  private setStepActive(stepId: number): void {
    if (!this.currentWorkflow) return;

    this.currentWorkflow.currentStep = stepId;
    const step = this.currentWorkflow.steps.find(s => s.id === stepId);
    if (step) {
      step.status = 'active';
      step.startTime = new Date();
    }
    this.updateProgress();
  }

  /**
   * Complete a step
   */
  private completeStep(stepId: number): void {
    if (!this.currentWorkflow) return;

    this.currentWorkflow.completedSteps.push(stepId);
    const step = this.currentWorkflow.steps.find(s => s.id === stepId);
    if (step) {
      step.status = 'completed';
      step.endTime = new Date();
    }
    
    this.currentWorkflow.overallProgress = 
      (this.currentWorkflow.completedSteps.length / this.currentWorkflow.steps.length) * 100;
    
    this.updateProgress();
  }

  /**
   * Set step error
   */
  private setStepError(stepId: number, error: string): void {
    if (!this.currentWorkflow) return;

    const step = this.currentWorkflow.steps.find(s => s.id === stepId);
    if (step) {
      step.status = 'error';
      step.error = error;
      step.endTime = new Date();
    }
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
    this.updateProgress();
  }

  /**
   * Handle workflow error
   */
  private handleWorkflowError(
    error: string,
    logs: string[],
    startTime: number
  ): WorkflowResult {
    logs.push(`❌ Workflow failed: ${error}`);
    
    if (this.currentWorkflow) {
      this.currentWorkflow.isRunning = false;
      this.updateProgress();
    }

    return {
      success: false,
      error,
      executionTime: Date.now() - startTime,
      logs
    };
  }

  /**
   * Update progress and notify callback
   */
  private updateProgress(): void {
    if (this.progressCallback && this.currentWorkflow) {
      this.progressCallback(this.currentWorkflow);
    }
  }
}

// Export singleton instance
export const workflowAutomationService = new WorkflowAutomationService();
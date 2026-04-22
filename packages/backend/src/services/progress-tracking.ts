export class ProgressTrackingService {
  async updateProgress(analysisId: string, progress: number): Promise<void> {
    // Stub implementation
  }

  async getProgress(analysisId: string): Promise<number> {
    return 0;
  }

  async updateStepProgress(
    workflowId: string,
    stepNumber: number,
    stepName: string,
    progress: number,
    message?: string,
    metadata?: any
  ): Promise<void> {
    // Stub implementation
  }

  async handleWorkflowError(
    workflowId: string,
    stepNumber?: number,
    stepName?: string,
    errorMessage?: string
  ): Promise<void> {
    // Stub implementation
  }

  async updateAnalysisProgress(
    analysisId: string,
    completedRules?: number,
    totalRules?: number,
    ruleId?: string,
    estimatedTimeRemaining?: number
  ): Promise<void> {
    // Stub implementation
  }
}

export const progressTrackingService = new ProgressTrackingService();

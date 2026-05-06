/**
 * Progress Display Manager - Handles real-time progress updates with social media poster style
 */

export interface ProgressStep {
  id: string;
  name: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  error?: string;
}

export class ProgressDisplay {
  private steps: Map<string, ProgressStep> = new Map();
  private startTime: Date;
  private stepOrder: string[] = [
    'launch-browser',
    'navigate-misra',
    'otp-verification',
    'file-upload',
    'code-analysis',
    'download-reports',
    'verification-complete'
  ];

  private stepNames: Map<string, string> = new Map([
    ['launch-browser', 'Launch Browser'],
    ['navigate-misra', 'Navigate to MISRA'],
    ['otp-verification', 'OTP Verification'],
    ['file-upload', 'File Upload'],
    ['code-analysis', 'Code Analysis'],
    ['download-reports', 'Download Reports'],
    ['verification-complete', 'Verification Complete']
  ]);

  constructor() {
    this.startTime = new Date();
    this.initializeSteps();
  }

  /**
   * Initialize all progress steps
   */
  private initializeSteps(): void {
    this.stepOrder.forEach(stepId => {
      this.steps.set(stepId, {
        id: stepId,
        name: this.stepNames.get(stepId) || stepId,
        status: 'pending'
      });
    });
  }

  /**
   * Start a step
   */
  startStep(stepId: string): void {
    const step = this.steps.get(stepId);
    if (step) {
      step.status = 'in-progress';
      step.startTime = new Date();
      this.displayProgress();
    }
  }

  /**
   * Complete a step
   */
  completeStep(stepId: string): void {
    const step = this.steps.get(stepId);
    if (step) {
      step.status = 'completed';
      step.endTime = new Date();
      if (step.startTime) {
        step.duration = step.endTime.getTime() - step.startTime.getTime();
      }
      this.displayProgress();
    }
  }

  /**
   * Fail a step
   */
  failStep(stepId: string, error?: string): void {
    const step = this.steps.get(stepId);
    if (step) {
      step.status = 'failed';
      step.endTime = new Date();
      step.error = error;
      if (step.startTime) {
        step.duration = step.endTime.getTime() - step.startTime.getTime();
      }
      this.displayProgress();
    }
  }

  /**
   * Display progress in terminal
   */
  private displayProgress(): void {
    console.log('\n' + '='.repeat(80));
    console.log('📊 AUTOMATION PROGRESS');
    console.log('='.repeat(80));

    this.stepOrder.forEach((stepId, index) => {
      const step = this.steps.get(stepId);
      if (step) {
        let statusIcon = '';
        let statusText = '';

        switch (step.status) {
          case 'completed':
            statusIcon = '✅';
            statusText = 'Completed';
            break;
          case 'in-progress':
            statusIcon = '⏳';
            statusText = 'In Progress';
            break;
          case 'failed':
            statusIcon = '❌';
            statusText = 'Failed';
            break;
          case 'pending':
            statusIcon = '⭕';
            statusText = 'Pending';
            break;
        }

        let line = `  ${index + 1}. ${statusIcon} ${step.name.padEnd(25)} ${statusText}`;

        if (step.endTime && step.startTime) {
          const duration = ((step.endTime.getTime() - step.startTime.getTime()) / 1000).toFixed(2);
          line += ` (${duration}s)`;
        }

        if (step.error) {
          line += ` - Error: ${step.error}`;
        }

        console.log(line);
      }
    });

    const totalTime = ((new Date().getTime() - this.startTime.getTime()) / 1000).toFixed(2);
    console.log('='.repeat(80));
    console.log(`⏱️  Total Time: ${totalTime}s`);
    console.log('='.repeat(80) + '\n');
  }

  /**
   * Get progress as HTML for browser display
   */
  getProgressHTML(): string {
    let html = '<div id="progressDisplay" class="mt-6 p-4 bg-gray-50 rounded-lg">';
    html += '<h3 class="text-lg font-semibold text-gray-800 mb-4">📊 Automation Progress</h3>';
    html += '<div class="space-y-2">';

    this.stepOrder.forEach((stepId, index) => {
      const step = this.steps.get(stepId);
      if (step) {
        let statusIcon = '';
        let statusClass = '';

        switch (step.status) {
          case 'completed':
            statusIcon = '✅';
            statusClass = 'text-green-600';
            break;
          case 'in-progress':
            statusIcon = '⏳';
            statusClass = 'text-blue-600';
            break;
          case 'failed':
            statusIcon = '❌';
            statusClass = 'text-red-600';
            break;
          case 'pending':
            statusIcon = '⭕';
            statusClass = 'text-gray-400';
            break;
        }

        html += `<div class="flex items-center ${statusClass}">`;
        html += `  <span class="text-xl mr-2">${statusIcon}</span>`;
        html += `  <span class="font-medium">${index + 1}. ${step.name}</span>`;

        if (step.duration) {
          html += `  <span class="text-sm text-gray-600 ml-auto">${(step.duration / 1000).toFixed(2)}s</span>`;
        }

        html += '</div>';
      }
    });

    html += '</div>';
    html += '</div>';

    return html;
  }

  /**
   * Get progress as JSON for API responses
   */
  getProgressJSON(): object {
    const progress: any = {
      startTime: this.startTime,
      totalTime: (new Date().getTime() - this.startTime.getTime()) / 1000,
      steps: []
    };

    this.stepOrder.forEach(stepId => {
      const step = this.steps.get(stepId);
      if (step) {
        progress.steps.push({
          id: step.id,
          name: step.name,
          status: step.status,
          duration: step.duration ? step.duration / 1000 : null,
          error: step.error || null
        });
      }
    });

    return progress;
  }

  /**
   * Get summary
   */
  getSummary(): string {
    const completedCount = Array.from(this.steps.values()).filter(s => s.status === 'completed').length;
    const failedCount = Array.from(this.steps.values()).filter(s => s.status === 'failed').length;
    const totalTime = ((new Date().getTime() - this.startTime.getTime()) / 1000).toFixed(2);

    return `\n✅ Automation Complete!\n  Completed: ${completedCount}/${this.stepOrder.length}\n  Failed: ${failedCount}\n  Total Time: ${totalTime}s\n`;
  }
}

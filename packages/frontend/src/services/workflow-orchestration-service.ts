/**
 * Workflow Orchestration Service
 * 
 * Manages the complete autonomous pipeline on the frontend:
 * - Coordinates auth → upload → analysis → results
 * - Handles real-time progress updates
 * - Manages error recovery
 */

import { API_URL } from '../config/api-config';

export interface WorkflowProgress {
  workflowId: string;
  status: 'INITIATED' | 'AUTH_VERIFIED' | 'FILE_INGESTED' | 'ANALYSIS_TRIGGERED' | 'COMPLETED' | 'FAILED';
  progress: number;
  currentStep: string;
  timestamp: number;
}

export class WorkflowOrchestrationService {
  private static pollInterval = 2000; // 2 seconds
  private static maxRetries = 3;

  /**
   * Start one-click autonomous workflow
   */
  static async startOneClickWorkflow(email: string): Promise<string> {
    console.log('🚀 Starting one-click workflow for:', email);

    try {
      // Step 1: Register user
      const registerResponse = await this.registerUser(email);
      console.log('✅ User registered:', registerResponse);

      // Step 2: Login user
      const loginResponse = await this.loginUser(email);
      console.log('✅ User logged in');

      // Step 3: Fetch OTP from email
      const otp = await this.fetchOTPFromEmail(email);
      console.log('✅ OTP fetched from email');

      // Step 4: Verify OTP
      const authResponse = await this.verifyOTP(email, otp, loginResponse.session);
      console.log('✅ OTP verified, auth complete');

      // Step 5: Trigger automated workflow
      const workflowId = await this.triggerAutomatedWorkflow(
        email,
        authResponse.userId,
        authResponse.sessionToken
      );
      console.log('✅ Workflow triggered:', workflowId);

      return workflowId;
    } catch (error: any) {
      console.error('❌ Workflow failed:', error.message);
      throw error;
    }
  }

  /**
   * Register user
   */
  private static async registerUser(email: string): Promise<any> {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });

    if (!response.ok) {
      throw new Error(`Registration failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Login user
   */
  private static async loginUser(email: string): Promise<any> {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });

    if (!response.ok) {
      throw new Error(`Login failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Fetch OTP from email (via webhook)
   */
  private static async fetchOTPFromEmail(email: string, retries = 0): Promise<string> {
    try {
      const response = await fetch(`${API_URL}/auth/fetch-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      if (!response.ok) {
        if (retries < this.maxRetries) {
          console.log(`⏳ OTP not yet received, retrying... (${retries + 1}/${this.maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds
          return this.fetchOTPFromEmail(email, retries + 1);
        }
        throw new Error('OTP fetch timeout');
      }

      const data = await response.json();
      return data.otp;
    } catch (error: any) {
      throw new Error(`OTP fetch failed: ${error.message}`);
    }
  }

  /**
   * Verify OTP
   */
  private static async verifyOTP(email: string, otp: string, session: any): Promise<any> {
    const response = await fetch(`${API_URL}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        otp,
        session
      })
    });

    if (!response.ok) {
      throw new Error(`OTP verification failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Trigger automated workflow on backend
   */
  private static async triggerAutomatedWorkflow(
    email: string,
    userId: string,
    sessionToken: string
  ): Promise<string> {
    const response = await fetch(`${API_URL}/workflow/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionToken}`
      },
      body: JSON.stringify({
        email,
        userId,
        sessionToken
      })
    });

    if (!response.ok) {
      throw new Error(`Workflow trigger failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.workflowId;
  }

  /**
   * Poll workflow progress
   */
  static async pollWorkflowProgress(
    workflowId: string,
    onProgress: (progress: WorkflowProgress) => void,
    onComplete: (result: any) => void,
    onError: (error: Error) => void
  ): Promise<void> {
    console.log('📊 Starting progress polling for:', workflowId);

    const maxWaitTime = 600000; // 10 minutes
    const startTime = Date.now();

    const poll = async () => {
      try {
        if (Date.now() - startTime > maxWaitTime) {
          throw new Error('Workflow timeout');
        }

        const response = await fetch(`${API_URL}/workflow/progress/${workflowId}`);

        if (!response.ok) {
          throw new Error(`Progress fetch failed: ${response.statusText}`);
        }

        const progress: WorkflowProgress = await response.json();
        onProgress(progress);

        if (progress.status === 'COMPLETED') {
          console.log('✅ Workflow completed');
          onComplete(progress);
          return;
        }

        if (progress.status === 'FAILED') {
          throw new Error(`Workflow failed: ${progress.currentStep}`);
        }

        // Continue polling
        setTimeout(poll, this.pollInterval);
      } catch (error: any) {
        console.error('❌ Polling error:', error.message);
        onError(error);
      }
    };

    poll();
  }

  /**
   * Get final analysis results
   */
  static async getAnalysisResults(analysisId: string, sessionToken: string): Promise<any> {
    const response = await fetch(`${API_URL}/analysis/results?analysisId=${analysisId}`, {
      headers: {
        'Authorization': `Bearer ${sessionToken}`
      }
    });

    if (!response.ok) {
      throw new Error(`Results fetch failed: ${response.statusText}`);
    }

    return response.json();
  }
}

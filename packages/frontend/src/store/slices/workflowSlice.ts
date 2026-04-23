/**
 * Workflow Redux Slice
 * 
 * Manages workflow state:
 * - Current step
 * - Progress percentage
 * - Status
 * - Error handling
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface WorkflowState {
  workflowId: string | null;
  email: string | null;
  status: 'IDLE' | 'INITIATED' | 'AUTH_VERIFIED' | 'FILE_INGESTED' | 'ANALYSIS_TRIGGERED' | 'COMPLETED' | 'FAILED';
  progress: number;
  currentStep: string;
  steps: {
    authVerified: boolean;
    fileIngested: boolean;
    analysisTriggered: boolean;
    reportGenerated: boolean;
  };
  error: string | null;
  isLoading: boolean;
  timestamp: number;
}

const initialState: WorkflowState = {
  workflowId: null,
  email: null,
  status: 'IDLE',
  progress: 0,
  currentStep: '',
  steps: {
    authVerified: false,
    fileIngested: false,
    analysisTriggered: false,
    reportGenerated: false
  },
  error: null,
  isLoading: false,
  timestamp: 0
};

const workflowSlice = createSlice({
  name: 'workflow',
  initialState,
  reducers: {
    // Start workflow
    startWorkflow: (state, action: PayloadAction<{ email: string }>) => {
      state.email = action.payload.email;
      state.status = 'INITIATED';
      state.progress = 0;
      state.currentStep = 'Initializing workflow...';
      state.isLoading = true;
      state.error = null;
      state.timestamp = Date.now();
    },

    // Update workflow progress
    updateProgress: (
      state,
      action: PayloadAction<{
        workflowId: string;
        status: WorkflowState['status'];
        progress: number;
        currentStep: string;
      }>
    ) => {
      state.workflowId = action.payload.workflowId;
      state.status = action.payload.status;
      state.progress = action.payload.progress;
      state.currentStep = action.payload.currentStep;
      state.timestamp = Date.now();

      // Update step completion
      if (action.payload.status === 'AUTH_VERIFIED') {
        state.steps.authVerified = true;
      } else if (action.payload.status === 'FILE_INGESTED') {
        state.steps.fileIngested = true;
      } else if (action.payload.status === 'ANALYSIS_TRIGGERED') {
        state.steps.analysisTriggered = true;
      } else if (action.payload.status === 'COMPLETED') {
        state.steps.reportGenerated = true;
        state.isLoading = false;
      }
    },

    // Workflow completed
    workflowCompleted: (state) => {
      state.status = 'COMPLETED';
      state.progress = 100;
      state.currentStep = '✅ Analysis Complete!';
      state.isLoading = false;
      state.error = null;
    },

    // Workflow failed
    workflowFailed: (state, action: PayloadAction<string>) => {
      state.status = 'FAILED';
      state.error = action.payload;
      state.isLoading = false;
    },

    // Reset workflow
    resetWorkflow: () => initialState
  }
});

export const {
  startWorkflow,
  updateProgress,
  workflowCompleted,
  workflowFailed,
  resetWorkflow
} = workflowSlice.actions;

export default workflowSlice.reducer;

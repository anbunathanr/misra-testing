/**
 * Workflow Progress Tracker Component
 * 
 * Real-time progress display with animated steps:
 * 🔐 Auth Verified
 * 📁 File Ingested (S3)
 * 🧠 AI Analysis Triggered (Lambda)
 * 📋 MISRA Report Generated
 */

import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { updateProgress, workflowFailed } from '../store/slices/workflowSlice';
import { WorkflowOrchestrationService } from '../services/workflow-orchestration-service';
import './WorkflowProgressTracker.css';

interface ProgressStep {
  icon: string;
  label: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
}

export const WorkflowProgressTracker: React.FC = () => {
  const dispatch = useDispatch();
  const workflow = useSelector((state: RootState) => state.workflow);
  const [steps, setSteps] = useState<ProgressStep[]>([
    { icon: '🔐', label: 'Auth Verified', status: 'pending' },
    { icon: '📁', label: 'File Ingested (S3)', status: 'pending' },
    { icon: '🧠', label: 'AI Analysis Triggered', status: 'pending' },
    { icon: '📋', label: 'MISRA Report Generated', status: 'pending' }
  ]);

  useEffect(() => {
    if (!workflow.workflowId) return;

    // Start polling for progress
    const unsubscribe = WorkflowOrchestrationService.pollWorkflowProgress(
      workflow.workflowId,
      (progress) => {
        // Update Redux state
        dispatch(
          updateProgress({
            workflowId: progress.workflowId,
            status: progress.status,
            progress: progress.progress,
            currentStep: progress.currentStep
          })
        );

        // Update step statuses
        const newSteps = [...steps];
        if (progress.status === 'AUTH_VERIFIED') {
          newSteps[0].status = 'completed';
          newSteps[1].status = 'in-progress';
        } else if (progress.status === 'FILE_INGESTED') {
          newSteps[1].status = 'completed';
          newSteps[2].status = 'in-progress';
        } else if (progress.status === 'ANALYSIS_TRIGGERED') {
          newSteps[2].status = 'completed';
          newSteps[3].status = 'in-progress';
        } else if (progress.status === 'COMPLETED') {
          newSteps[3].status = 'completed';
        }
        setSteps(newSteps);
      },
      (result) => {
        console.log('✅ Workflow completed:', result);
      },
      (error) => {
        console.error('❌ Workflow error:', error);
        dispatch(workflowFailed(error.message));
        setSteps(steps.map(s => ({ ...s, status: 'failed' })));
      }
    );

    return () => {
      // Cleanup polling
    };
  }, [workflow.workflowId, dispatch]);

  return (
    <div className="workflow-progress-tracker">
      <div className="progress-header">
        <h2>🚀 Autonomous MISRA Analysis Pipeline</h2>
        <p className="email-display">{workflow.email}</p>
      </div>

      {/* Progress Bar */}
      <div className="progress-bar-container">
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${workflow.progress}%` }}
          />
        </div>
        <div className="progress-percentage">{workflow.progress}%</div>
      </div>

      {/* Steps */}
      <div className="steps-container">
        {steps.map((step, index) => (
          <div key={index} className={`step ${step.status}`}>
            <div className="step-icon">{step.icon}</div>
            <div className="step-label">{step.label}</div>
            <div className="step-status">
              {step.status === 'completed' && '✓'}
              {step.status === 'in-progress' && '⟳'}
              {step.status === 'failed' && '✗'}
            </div>
          </div>
        ))}
      </div>

      {/* Current Step */}
      <div className="current-step">
        <p className="step-text">{workflow.currentStep}</p>
      </div>

      {/* Error Display */}
      {workflow.error && (
        <div className="error-message">
          <p>❌ {workflow.error}</p>
        </div>
      )}

      {/* Completion Message */}
      {workflow.status === 'COMPLETED' && (
        <div className="completion-message">
          <p>✅ Analysis Complete! Check the results below.</p>
        </div>
      )}
    </div>
  );
};

export default WorkflowProgressTracker;

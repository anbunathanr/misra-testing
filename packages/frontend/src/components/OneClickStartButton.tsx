/**
 * One-Click Start Button Component
 * 
 * Triggers the complete autonomous workflow with just email input
 */

import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { startWorkflow } from '../store/slices/workflowSlice';
import { WorkflowOrchestrationService } from '../services/workflow-orchestration-service';
import './OneClickStartButton.css';

interface OneClickStartButtonProps {
  onWorkflowStart?: (workflowId: string) => void;
}

export const OneClickStartButton: React.FC<OneClickStartButtonProps> = ({ onWorkflowStart }) => {
  const dispatch = useDispatch();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleStartAnalysis = async () => {
    setError(null);

    // Validate email
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);

    try {
      // Dispatch Redux action
      dispatch(startWorkflow({ email }));

      // Start workflow
      const workflowId = await WorkflowOrchestrationService.startOneClickWorkflow(email);

      console.log('✅ Workflow started:', workflowId);

      if (onWorkflowStart) {
        onWorkflowStart(workflowId);
      }
    } catch (err: any) {
      console.error('❌ Workflow error:', err);
      setError(err.message || 'Failed to start workflow. Please try again.');
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      handleStartAnalysis();
    }
  };

  return (
    <div className="one-click-start-container">
      <div className="start-card">
        <div className="card-header">
          <h1>🚀 One-Click MISRA Analysis</h1>
          <p>Enter your email to start the autonomous analysis pipeline</p>
        </div>

        <div className="input-group">
          <input
            type="email"
            placeholder="Enter your email (e.g., user@example.com)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isLoading}
            className="email-input"
          />
        </div>

        {error && (
          <div className="error-alert">
            <p>⚠️ {error}</p>
          </div>
        )}

        <button
          onClick={handleStartAnalysis}
          disabled={isLoading || !email.trim()}
          className={`start-button ${isLoading ? 'loading' : ''}`}
        >
          {isLoading ? (
            <>
              <span className="spinner"></span>
              Starting Analysis...
            </>
          ) : (
            <>
              <span className="button-icon">▶</span>
              Start Analysis
            </>
          )}
        </button>

        <div className="info-box">
          <p>
            <strong>What happens next:</strong>
          </p>
          <ul>
            <li>✅ Auto-register & login</li>
            <li>✅ Auto-verify OTP from email</li>
            <li>✅ Auto-upload sample C file</li>
            <li>✅ Auto-analyze MISRA compliance</li>
            <li>✅ Real-time progress tracking</li>
          </ul>
        </div>

        <div className="security-note">
          <p>🔒 Your email is secure and only used for authentication</p>
        </div>
      </div>
    </div>
  );
};

export default OneClickStartButton;

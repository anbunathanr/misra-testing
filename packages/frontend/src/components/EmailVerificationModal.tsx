import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Divider
} from '@mui/material';
import { Email as EmailIcon, Security as SecurityIcon } from '@mui/icons-material';
import { AuthStateManager, OTPSetupData, AuthError } from '../services/auth-state-manager';

interface EmailVerificationModalProps {
  open: boolean;
  email: string;
  onClose: () => void;
  onVerificationComplete: (otpSetup: OTPSetupData) => void;
  onVerificationError?: (error: AuthError) => void;
  authStateManager?: AuthStateManager;
}

const EmailVerificationModal: React.FC<EmailVerificationModalProps> = ({
  open,
  email,
  onClose,
  onVerificationComplete,
  onVerificationError,
  authStateManager
}) => {
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const handleVerifyEmail = async () => {
    if (!verificationCode.trim()) {
      setError('Please enter the verification code');
      return;
    }

    // Validate code format (6 digits)
    if (!/^\d{6}$/.test(verificationCode.trim())) {
      setError('Verification code must be 6 digits');
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      // Use AuthStateManager if available, otherwise direct API call
      if (authStateManager) {
        const otpSetup = await authStateManager.handleEmailVerification(verificationCode.trim());
        setSuccess('Email verified successfully! Setting up OTP...');
        onVerificationComplete(otpSetup);
      } else {
        // Fallback to direct API call
        const response = await fetch('/api/auth/verify-email-with-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            confirmationCode: verificationCode.trim()
          })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error?.message || 'Verification failed');
        }

        if (data.otpSetup) {
          setSuccess('Email verified successfully! Setting up OTP...');
          onVerificationComplete(data.otpSetup);
        }
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Verification failed';
      setError(errorMessage);
      setRetryCount(prev => prev + 1);

      // Notify error handler if provided
      if (onVerificationError) {
        const authError: AuthError = {
          code: 'EMAIL_VERIFICATION_FAILED',
          message: errorMessage,
          userMessage: getUserFriendlyErrorMessage(errorMessage),
          retryable: isRetryableError(errorMessage),
          suggestion: getErrorSuggestion(errorMessage),
          correlationId: `verify-${Date.now()}`,
          timestamp: new Date(),
          step: 'email_verifying' as any
        };
        onVerificationError(authError);
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendCode = async () => {
    setIsResending(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to resend code');
      }

      setSuccess('Verification code sent to your email. Please check your inbox and spam folder.');
      setVerificationCode(''); // Clear the input for new code
    } catch (error: any) {
      setError(error.message || 'Failed to resend code. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  const getUserFriendlyErrorMessage = (errorMessage: string): string => {
    if (errorMessage.includes('Invalid verification code') || errorMessage.includes('INVALID_VERIFICATION_CODE')) {
      return 'The verification code you entered is incorrect. Please check and try again.';
    }
    if (errorMessage.includes('expired') || errorMessage.includes('CODE_EXPIRED')) {
      return 'The verification code has expired. Please request a new one.';
    }
    if (errorMessage.includes('already verified') || errorMessage.includes('ALREADY_VERIFIED')) {
      return 'This email address is already verified.';
    }
    return 'Email verification failed. Please try again.';
  };

  const isRetryableError = (errorMessage: string): boolean => {
    // Network errors and temporary issues are retryable
    return !errorMessage.includes('already verified') && 
           !errorMessage.includes('ALREADY_VERIFIED');
  };

  const getErrorSuggestion = (errorMessage: string): string => {
    if (errorMessage.includes('Invalid verification code')) {
      return 'Double-check the code in your email and try again.';
    }
    if (errorMessage.includes('expired')) {
      return 'Click "Resend Code" to get a new verification code.';
    }
    if (errorMessage.includes('already verified')) {
      return 'You can close this dialog and proceed with login.';
    }
    return 'Please try again or contact support if the issue persists.';
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !isVerifying) {
      handleVerifyEmail();
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          p: 1
        }
      }}
    >
      <DialogTitle sx={{ textAlign: 'center', pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
          <EmailIcon sx={{ fontSize: 32, color: 'primary.main', mr: 1 }} />
          <Typography variant="h5" component="span" sx={{ fontWeight: 600 }}>
            Verify Your Email
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary">
          We've sent a verification code to <strong>{email}</strong>
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        <TextField
          fullWidth
          label="Verification Code"
          value={verificationCode}
          onChange={(e) => setVerificationCode(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Enter 6-digit code"
          inputProps={{
            maxLength: 6,
            style: { textAlign: 'center', fontSize: '1.2rem', letterSpacing: '0.5rem' }
          }}
          disabled={isVerifying}
          sx={{ mb: 2 }}
        />

        <Box sx={{ textAlign: 'center', mb: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Didn't receive the code?
          </Typography>
          <Button
            variant="text"
            onClick={handleResendCode}
            disabled={isResending || isVerifying}
            size="small"
          >
            {isResending ? (
              <>
                <CircularProgress size={16} sx={{ mr: 1 }} />
                Sending...
              </>
            ) : (
              'Resend Code'
            )}
          </Button>
          {retryCount > 0 && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              Attempt {retryCount + 1}
            </Typography>
          )}
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box sx={{ display: 'flex', alignItems: 'center', p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
          <SecurityIcon sx={{ color: 'info.main', mr: 2 }} />
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
              Enhanced Security
            </Typography>
            <Typography variant="body2" color="text.secondary">
              After email verification, OTP (One-Time Password) will be automatically configured for your account security.
            </Typography>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 2 }}>
        <Button
          onClick={onClose}
          disabled={isVerifying}
          sx={{ mr: 1 }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleVerifyEmail}
          disabled={isVerifying || !verificationCode.trim()}
          sx={{
            minWidth: 120,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
          }}
        >
          {isVerifying ? (
            <>
              <CircularProgress size={20} sx={{ mr: 1, color: 'white' }} />
              Verifying...
            </>
          ) : (
            'Verify Email'
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EmailVerificationModal;
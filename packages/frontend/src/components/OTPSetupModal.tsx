import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
  Paper,
  Chip,
  Grid,
  Divider,
  TextField,
  CircularProgress
} from '@mui/material';
import {
  Security as SecurityIcon,
  QrCode as QrCodeIcon,
  ContentCopy as CopyIcon,
  CheckCircle as CheckIcon,
  Smartphone as PhoneIcon
} from '@mui/icons-material';
import { AuthStateManager, OTPSetupData, AuthError } from '../services/auth-state-manager';

interface OTPSetupModalProps {
  open: boolean;
  email: string;
  otpSetup: OTPSetupData;
  onClose: () => void;
  onSetupComplete: () => void;
  onSetupError?: (error: AuthError) => void;
  authStateManager?: AuthStateManager;
}

const OTPSetupModal: React.FC<OTPSetupModalProps> = ({
  open,
  email,
  otpSetup,
  onClose,
  onSetupComplete,
  onSetupError,
  authStateManager
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [otpCode, setOtpCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedBackupCodes, setCopiedBackupCodes] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const handleCopySecret = async () => {
    try {
      await navigator.clipboard.writeText(otpSetup.secret);
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    } catch (error) {
      console.error('Failed to copy secret:', error);
    }
  };

  const handleCopyBackupCodes = async () => {
    try {
      const codesText = otpSetup.backupCodes.join('\n');
      await navigator.clipboard.writeText(codesText);
      setCopiedBackupCodes(true);
      setTimeout(() => setCopiedBackupCodes(false), 2000);
    } catch (error) {
      console.error('Failed to copy backup codes:', error);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otpCode.trim()) {
      setError('Please enter the OTP code from your authenticator app');
      return;
    }

    // Validate OTP code format (6 digits)
    if (!/^\d{6}$/.test(otpCode.trim())) {
      setError('OTP code must be 6 digits');
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      // Use AuthStateManager if available, otherwise direct API call
      if (authStateManager) {
        await authStateManager.completeOTPSetup(otpCode.trim());
        setCurrentStep(3);
        setTimeout(() => {
          onSetupComplete();
        }, 2000);
      } else {
        // Fallback to direct API call
        const response = await fetch('/api/auth/complete-otp-setup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            otpCode: otpCode.trim()
          })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error?.message || 'OTP verification failed');
        }

        setCurrentStep(3);
        setTimeout(() => {
          onSetupComplete();
        }, 2000);
      }
    } catch (error: any) {
      const errorMessage = error.message || 'OTP verification failed';
      setError(getUserFriendlyErrorMessage(errorMessage));
      setRetryCount(prev => prev + 1);

      // Notify error handler if provided
      if (onSetupError) {
        const authError: AuthError = {
          code: 'OTP_VERIFICATION_FAILED',
          message: errorMessage,
          userMessage: getUserFriendlyErrorMessage(errorMessage),
          retryable: isRetryableError(errorMessage),
          suggestion: getErrorSuggestion(errorMessage),
          correlationId: `otp-verify-${Date.now()}`,
          timestamp: new Date(),
          step: 'otp_verifying' as any
        };
        onSetupError(authError);
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const getUserFriendlyErrorMessage = (errorMessage: string): string => {
    if (errorMessage.includes('Invalid OTP code') || errorMessage.includes('INVALID_OTP_CODE')) {
      return 'The OTP code you entered is incorrect. Please check your authenticator app and try again.';
    }
    if (errorMessage.includes('OTP not configured') || errorMessage.includes('OTP_NOT_CONFIGURED')) {
      return 'OTP is not configured for this account. Please complete email verification first.';
    }
    if (errorMessage.includes('expired') || errorMessage.includes('EXPIRED')) {
      return 'The OTP code has expired. Please enter the current code from your authenticator app.';
    }
    return 'OTP verification failed. Please try again.';
  };

  const isRetryableError = (errorMessage: string): boolean => {
    // Most OTP errors are retryable except configuration issues
    return !errorMessage.includes('OTP_NOT_CONFIGURED') && 
           !errorMessage.includes('USER_CREATION_FAILED');
  };

  const getErrorSuggestion = (errorMessage: string): string => {
    if (errorMessage.includes('Invalid OTP code')) {
      return 'Make sure your device time is correct and enter the current code from your authenticator app.';
    }
    if (errorMessage.includes('OTP not configured')) {
      return 'Please complete email verification first, then try OTP setup again.';
    }
    if (errorMessage.includes('expired')) {
      return 'OTP codes change every 30 seconds. Enter the current code displayed in your app.';
    }
    return 'Please try again or contact support if the issue persists.';
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !isVerifying && currentStep === 2) {
      handleVerifyOTP();
    }
  };

  const renderStep1 = () => (
    <Box>
      <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
        <PhoneIcon sx={{ mr: 1, color: 'primary.main' }} />
        Step 1: Install Authenticator App
      </Typography>
      
      <Typography variant="body2" sx={{ mb: 2 }}>
        Install one of these authenticator apps on your mobile device:
      </Typography>

      <Grid container spacing={1} sx={{ mb: 3 }}>
        <Grid item xs={6}>
          <Chip label="Google Authenticator" variant="outlined" size="small" />
        </Grid>
        <Grid item xs={6}>
          <Chip label="Microsoft Authenticator" variant="outlined" size="small" />
        </Grid>
        <Grid item xs={6}>
          <Chip label="Authy" variant="outlined" size="small" />
        </Grid>
        <Grid item xs={6}>
          <Chip label="1Password" variant="outlined" size="small" />
        </Grid>
      </Grid>

      <Divider sx={{ my: 2 }} />

      <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
        <QrCodeIcon sx={{ mr: 1, color: 'primary.main' }} />
        Step 2: Scan QR Code
      </Typography>

      <Box sx={{ textAlign: 'center', mb: 2 }}>
        <Paper sx={{ p: 2, display: 'inline-block', bgcolor: 'grey.50' }}>
          <img 
            src={otpSetup.qrCodeUrl} 
            alt="OTP QR Code"
            style={{ width: 200, height: 200 }}
          />
        </Paper>
      </Box>

      <Typography variant="body2" sx={{ mb: 2, textAlign: 'center' }}>
        Or manually enter this secret key:
      </Typography>

      <Paper sx={{ p: 2, bgcolor: 'grey.50', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
            {otpSetup.secret}
          </Typography>
          <Button
            size="small"
            onClick={handleCopySecret}
            startIcon={copiedSecret ? <CheckIcon /> : <CopyIcon />}
            color={copiedSecret ? 'success' : 'primary'}
          >
            {copiedSecret ? 'Copied!' : 'Copy'}
          </Button>
        </Box>
      </Paper>

      <Button
        variant="contained"
        fullWidth
        onClick={() => setCurrentStep(2)}
        sx={{ mt: 2 }}
      >
        Continue to Verification
      </Button>
    </Box>
  );

  const renderStep2 = () => (
    <Box>
      <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
        <SecurityIcon sx={{ mr: 1, color: 'primary.main' }} />
        Step 3: Verify Setup
      </Typography>

      <Typography variant="body2" sx={{ mb: 3 }}>
        Enter the 6-digit code from your authenticator app to verify the setup:
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <TextField
        fullWidth
        label="OTP Code"
        value={otpCode}
        onChange={(e) => setOtpCode(e.target.value)}
        onKeyPress={handleKeyPress}
        placeholder="000000"
        inputProps={{
          maxLength: 6,
          style: { textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5rem' }
        }}
        disabled={isVerifying}
        sx={{ mb: 2 }}
      />

      {retryCount > 0 && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2, textAlign: 'center' }}>
          Attempt {retryCount + 1}
        </Typography>
      )}

      <Typography variant="h6" sx={{ mb: 2 }}>
        Backup Codes
      </Typography>

      <Alert severity="warning" sx={{ mb: 2 }}>
        <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
          Save these backup codes in a secure location!
        </Typography>
        <Typography variant="body2">
          You can use these codes to access your account if you lose your authenticator device.
        </Typography>
      </Alert>

      <Paper sx={{ p: 2, bgcolor: 'grey.50', mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Typography variant="subtitle2">Backup Codes:</Typography>
          <Button
            size="small"
            onClick={handleCopyBackupCodes}
            startIcon={copiedBackupCodes ? <CheckIcon /> : <CopyIcon />}
            color={copiedBackupCodes ? 'success' : 'primary'}
          >
            {copiedBackupCodes ? 'Copied!' : 'Copy All'}
          </Button>
        </Box>
        <Grid container spacing={1}>
          {otpSetup.backupCodes.map((code, index) => (
            <Grid item xs={6} key={index}>
              <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>
                {code}
              </Typography>
            </Grid>
          ))}
        </Grid>
      </Paper>

      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button
          variant="outlined"
          onClick={() => setCurrentStep(1)}
          disabled={isVerifying}
        >
          Back
        </Button>
        <Button
          variant="contained"
          fullWidth
          onClick={handleVerifyOTP}
          disabled={isVerifying || !otpCode.trim()}
        >
          {isVerifying ? (
            <>
              <CircularProgress size={20} sx={{ mr: 1, color: 'white' }} />
              Verifying...
            </>
          ) : (
            'Verify & Complete Setup'
          )}
        </Button>
      </Box>
    </Box>
  );

  const renderStep3 = () => (
    <Box sx={{ textAlign: 'center', py: 3 }}>
      <CheckIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
      <Typography variant="h5" sx={{ mb: 2, color: 'success.main', fontWeight: 600 }}>
        Setup Complete!
      </Typography>
      <Typography variant="body1" sx={{ mb: 2 }}>
        Your account is now secured with two-factor authentication.
      </Typography>
      <Typography variant="body2" color="text.secondary">
        You'll be prompted for an OTP code each time you log in.
      </Typography>
    </Box>
  );

  return (
    <Dialog 
      open={open} 
      onClose={currentStep === 3 ? onClose : undefined}
      maxWidth="md"
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
          <SecurityIcon sx={{ fontSize: 32, color: 'primary.main', mr: 1 }} />
          <Typography variant="h5" component="span" sx={{ fontWeight: 600 }}>
            Two-Factor Authentication Setup
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary">
          Secure your account with OTP authentication
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ pt: 2, minHeight: 400 }}>
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
      </DialogContent>

      {currentStep === 3 && (
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button
            variant="contained"
            fullWidth
            onClick={onClose}
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
            }}
          >
            Continue to MISRA Analysis
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
};

export default OTPSetupModal;
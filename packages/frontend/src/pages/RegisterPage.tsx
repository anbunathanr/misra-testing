import { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  Link,
  InputAdornment,
  IconButton,
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material';
import { registerUser, clearError } from '../store/slices/authSlice';
import { RootState } from '../store';
import { authService } from '../services/auth-service';

function RegisterPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const { loading, error } = useSelector((state: RootState) => state.auth);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [success, setSuccess] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationError, setVerificationError] = useState('');

  const validateName = (name: string): boolean => {
    if (!name) {
      setErrors((prev) => ({ ...prev, name: 'Name is required' }));
      return false;
    }
    if (name.length < 2) {
      setErrors((prev) => ({ ...prev, name: 'Name must be at least 2 characters' }));
      return false;
    }
    setErrors((prev) => ({ ...prev, name: '' }));
    return true;
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      setErrors((prev) => ({ ...prev, email: 'Email is required' }));
      return false;
    }
    if (!emailRegex.test(email)) {
      setErrors((prev) => ({ ...prev, email: 'Please enter a valid email address' }));
      return false;
    }
    setErrors((prev) => ({ ...prev, email: '' }));
    return true;
  };

  const validatePassword = (password: string): boolean => {
    if (!password) {
      setErrors((prev) => ({ ...prev, password: 'Password is required' }));
      return false;
    }
    if (password.length < 8) {
      setErrors((prev) => ({ ...prev, password: 'Password must be at least 8 characters' }));
      return false;
    }
    if (!/[A-Z]/.test(password)) {
      setErrors((prev) => ({ ...prev, password: 'Password must contain at least one uppercase letter' }));
      return false;
    }
    if (!/[a-z]/.test(password)) {
      setErrors((prev) => ({ ...prev, password: 'Password must contain at least one lowercase letter' }));
      return false;
    }
    if (!/[0-9]/.test(password)) {
      setErrors((prev) => ({ ...prev, password: 'Password must contain at least one number' }));
      return false;
    }
    setErrors((prev) => ({ ...prev, password: '' }));
    return true;
  };

  const validateConfirmPassword = (confirmPassword: string): boolean => {
    if (!confirmPassword) {
      setErrors((prev) => ({ ...prev, confirmPassword: 'Please confirm your password' }));
      return false;
    }
    if (confirmPassword !== formData.password) {
      setErrors((prev) => ({ ...prev, confirmPassword: 'Passwords do not match' }));
      return false;
    }
    setErrors((prev) => ({ ...prev, confirmPassword: '' }));
    return true;
  };

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    
    // Clear field error on change
    if (errors[field as keyof typeof errors]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(false);

    // Clear previous errors
    dispatch(clearError());

    // Validate all fields
    const isNameValid = validateName(formData.name);
    const isEmailValid = validateEmail(formData.email);
    const isPasswordValid = validatePassword(formData.password);
    const isConfirmPasswordValid = validateConfirmPassword(formData.confirmPassword);

    if (!isNameValid || !isEmailValid || !isPasswordValid || !isConfirmPasswordValid) {
      return;
    }

    try {
      await dispatch(
        registerUser({
          email: formData.email,
          password: formData.password,
          name: formData.name,
        }) as any
      ).unwrap();
      
      // Show verification code input
      setShowVerification(true);
    } catch (err: any) {
      // Error is handled by Redux and displayed below
      console.error('Registration failed:', err);
    }
  };

  const handleVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerificationError('');

    if (!verificationCode || verificationCode.length !== 6) {
      setVerificationError('Please enter a valid 6-digit verification code');
      return;
    }

    try {
      await authService.confirmRegistration(formData.email, verificationCode);
      setSuccess(true);
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate('/login', { 
          state: { 
            message: 'Email verified successfully! You can now log in.' 
          } 
        });
      }, 2000);
    } catch (err: any) {
      console.error('Verification failed:', err);
      setVerificationError(err.message || 'Verification failed. Please try again.');
    }
  };

  const handleResendCode = async () => {
    setVerificationError('');
    try {
      await authService.resendConfirmationCode(formData.email);
      setVerificationError('Verification code resent! Please check your email.');
    } catch (err: any) {
      console.error('Resend failed:', err);
      setVerificationError(err.message || 'Failed to resend code. Please try again.');
    }
  };

  const getErrorMessage = (error: string): string => {
    if (error.includes('User already exists') || error.includes('UsernameExistsException')) {
      return 'An account with this email already exists';
    }
    if (error.includes('Invalid email')) {
      return 'Please enter a valid email address';
    }
    if (error.includes('Password did not conform')) {
      return 'Password does not meet requirements';
    }
    return error || 'An error occurred. Please try again';
  };

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: 'background.default',
      }}
    >
      <Card sx={{ maxWidth: 450, width: '100%', m: 2 }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom align="center" fontWeight="bold">
            Create Account
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            gutterBottom
            align="center"
            sx={{ mb: 4 }}
          >
            Sign up to start using AIBTS Platform
          </Typography>

          {success && (
            <Alert severity="success" sx={{ mb: 3 }}>
              Email verified successfully! Redirecting to login...
            </Alert>
          )}

          {showVerification && !success && (
            <Alert severity="info" sx={{ mb: 3 }}>
              Please check your email for a verification code and enter it below.
            </Alert>
          )}

          {error && !success && !showVerification && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {getErrorMessage(error)}
            </Alert>
          )}

          {verificationError && !success && (
            <Alert severity={verificationError.includes('resent') ? 'success' : 'error'} sx={{ mb: 3 }}>
              {verificationError}
            </Alert>
          )}

          {!showVerification ? (
            <form onSubmit={handleSubmit}>
              <TextField
                fullWidth
                label="Full Name"
                type="text"
                value={formData.name}
                onChange={handleChange('name')}
                onBlur={() => validateName(formData.name)}
                error={!!errors.name}
                helperText={errors.name}
                margin="normal"
                required
                autoFocus
                autoComplete="name"
              />
              
              <TextField
                fullWidth
                label="Email Address"
                type="email"
                value={formData.email}
                onChange={handleChange('email')}
                onBlur={() => validateEmail(formData.email)}
                error={!!errors.email}
                helperText={errors.email}
                margin="normal"
                required
                autoComplete="email"
              />
              
              <TextField
                fullWidth
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleChange('password')}
                onBlur={() => validatePassword(formData.password)}
                error={!!errors.password}
                helperText={errors.password || 'Must be at least 8 characters with uppercase, lowercase, and number'}
                margin="normal"
                required
                autoComplete="new-password"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        aria-label="toggle password visibility"
                      >
                        {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              
              <TextField
                fullWidth
                label="Confirm Password"
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={handleChange('confirmPassword')}
                onBlur={() => validateConfirmPassword(formData.confirmPassword)}
                error={!!errors.confirmPassword}
                helperText={errors.confirmPassword}
                margin="normal"
                required
                autoComplete="new-password"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        edge="end"
                        aria-label="toggle password visibility"
                      >
                        {showConfirmPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <Button
                fullWidth
                type="submit"
                variant="contained"
                size="large"
                disabled={loading || success}
                sx={{ mt: 3, mb: 2 }}
              >
                {loading ? 'Creating account...' : 'Sign Up'}
              </Button>

              <Box textAlign="center">
                <Typography variant="body2" color="text.secondary">
                  Already have an account?{' '}
                  <Link component={RouterLink} to="/login" underline="hover" fontWeight="bold">
                    Sign in
                  </Link>
                </Typography>
              </Box>
            </form>
          ) : (
            <form onSubmit={handleVerification}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                We've sent a verification code to <strong>{formData.email}</strong>
              </Typography>

              <TextField
                fullWidth
                label="Verification Code"
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                placeholder="Enter 6-digit code"
                margin="normal"
                required
                autoFocus
                inputProps={{ maxLength: 6 }}
              />

              <Button
                fullWidth
                type="submit"
                variant="contained"
                size="large"
                disabled={success}
                sx={{ mt: 3, mb: 2 }}
              >
                Verify Email
              </Button>

              <Box textAlign="center">
                <Typography variant="body2" color="text.secondary">
                  Didn't receive the code?{' '}
                  <Link component="button" type="button" onClick={handleResendCode} underline="hover" fontWeight="bold">
                    Resend
                  </Link>
                </Typography>
              </Box>
            </form>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}

export default RegisterPage;

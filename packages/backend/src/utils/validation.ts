/**
 * Validation utilities for authentication and other services
 */

/**
 * Validate email address format
 */
export function validateEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Validate OTP code format (6 digits)
 */
export function validateOTPCode(code: string): boolean {
  if (!code || typeof code !== 'string') {
    return false;
  }

  return /^\d{6}$/.test(code.trim());
}

/**
 * Validate verification code format (6 digits)
 */
export function validateVerificationCode(code: string): boolean {
  return validateOTPCode(code); // Same format as OTP
}

/**
 * Validate name format (basic validation)
 */
export function validateName(name: string): boolean {
  if (!name || typeof name !== 'string') {
    return false;
  }

  const trimmedName = name.trim();
  return trimmedName.length >= 1 && trimmedName.length <= 100;
}

/**
 * Sanitize string input
 */
export function sanitizeString(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  return input.trim().replace(/[<>]/g, '');
}

/**
 * Validate UUID format
 */
export function validateUUID(uuid: string): boolean {
  if (!uuid || typeof uuid !== 'string') {
    return false;
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Validate password strength (basic requirements)
 */
export function validatePassword(password: string): { isValid: boolean; message: string } {
  const errors: string[] = [];

  if (!password || typeof password !== 'string') {
    errors.push('Password is required');
    return { isValid: false, message: errors.join('; ') };
  }

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return { isValid: errors.length === 0, message: errors.join('; ') };
}
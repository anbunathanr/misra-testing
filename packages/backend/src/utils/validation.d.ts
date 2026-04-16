/**
 * Validation utilities for authentication and other services
 */
/**
 * Validate email address format
 */
export declare function validateEmail(email: string): boolean;
/**
 * Validate OTP code format (6 digits)
 */
export declare function validateOTPCode(code: string): boolean;
/**
 * Validate verification code format (6 digits)
 */
export declare function validateVerificationCode(code: string): boolean;
/**
 * Validate name format (basic validation)
 */
export declare function validateName(name: string): boolean;
/**
 * Sanitize string input
 */
export declare function sanitizeString(input: string): string;
/**
 * Validate UUID format
 */
export declare function validateUUID(uuid: string): boolean;
/**
 * Validate password strength (basic requirements)
 */
export declare function validatePassword(password: string): {
    valid: boolean;
    errors: string[];
};

"use strict";
/**
 * Validation utilities for authentication and other services
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateEmail = validateEmail;
exports.validateOTPCode = validateOTPCode;
exports.validateVerificationCode = validateVerificationCode;
exports.validateName = validateName;
exports.sanitizeString = sanitizeString;
exports.validateUUID = validateUUID;
exports.validatePassword = validatePassword;
/**
 * Validate email address format
 */
function validateEmail(email) {
    if (!email || typeof email !== 'string') {
        return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
}
/**
 * Validate OTP code format (6 digits)
 */
function validateOTPCode(code) {
    if (!code || typeof code !== 'string') {
        return false;
    }
    return /^\d{6}$/.test(code.trim());
}
/**
 * Validate verification code format (6 digits)
 */
function validateVerificationCode(code) {
    return validateOTPCode(code); // Same format as OTP
}
/**
 * Validate name format (basic validation)
 */
function validateName(name) {
    if (!name || typeof name !== 'string') {
        return false;
    }
    const trimmedName = name.trim();
    return trimmedName.length >= 1 && trimmedName.length <= 100;
}
/**
 * Sanitize string input
 */
function sanitizeString(input) {
    if (!input || typeof input !== 'string') {
        return '';
    }
    return input.trim().replace(/[<>]/g, '');
}
/**
 * Validate UUID format
 */
function validateUUID(uuid) {
    if (!uuid || typeof uuid !== 'string') {
        return false;
    }
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}
/**
 * Validate password strength (basic requirements)
 */
function validatePassword(password) {
    const errors = [];
    if (!password || typeof password !== 'string') {
        errors.push('Password is required');
        return { valid: false, errors };
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
    return { valid: errors.length === 0, errors };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmFsaWRhdGlvbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInZhbGlkYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOztHQUVHOztBQUtILHNDQU9DO0FBS0QsMENBTUM7QUFLRCw0REFFQztBQUtELG9DQU9DO0FBS0Qsd0NBTUM7QUFLRCxvQ0FPQztBQUtELDRDQTZCQztBQWpHRDs7R0FFRztBQUNILFNBQWdCLGFBQWEsQ0FBQyxLQUFhO0lBQ3pDLElBQUksQ0FBQyxLQUFLLElBQUksT0FBTyxLQUFLLEtBQUssUUFBUSxFQUFFLENBQUM7UUFDeEMsT0FBTyxLQUFLLENBQUM7SUFDZixDQUFDO0lBRUQsTUFBTSxVQUFVLEdBQUcsNEJBQTRCLENBQUM7SUFDaEQsT0FBTyxVQUFVLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDO0FBQ3ZDLENBQUM7QUFFRDs7R0FFRztBQUNILFNBQWdCLGVBQWUsQ0FBQyxJQUFZO0lBQzFDLElBQUksQ0FBQyxJQUFJLElBQUksT0FBTyxJQUFJLEtBQUssUUFBUSxFQUFFLENBQUM7UUFDdEMsT0FBTyxLQUFLLENBQUM7SUFDZixDQUFDO0lBRUQsT0FBTyxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDO0FBQ3JDLENBQUM7QUFFRDs7R0FFRztBQUNILFNBQWdCLHdCQUF3QixDQUFDLElBQVk7SUFDbkQsT0FBTyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxxQkFBcUI7QUFDckQsQ0FBQztBQUVEOztHQUVHO0FBQ0gsU0FBZ0IsWUFBWSxDQUFDLElBQVk7SUFDdkMsSUFBSSxDQUFDLElBQUksSUFBSSxPQUFPLElBQUksS0FBSyxRQUFRLEVBQUUsQ0FBQztRQUN0QyxPQUFPLEtBQUssQ0FBQztJQUNmLENBQUM7SUFFRCxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7SUFDaEMsT0FBTyxXQUFXLENBQUMsTUFBTSxJQUFJLENBQUMsSUFBSSxXQUFXLENBQUMsTUFBTSxJQUFJLEdBQUcsQ0FBQztBQUM5RCxDQUFDO0FBRUQ7O0dBRUc7QUFDSCxTQUFnQixjQUFjLENBQUMsS0FBYTtJQUMxQyxJQUFJLENBQUMsS0FBSyxJQUFJLE9BQU8sS0FBSyxLQUFLLFFBQVEsRUFBRSxDQUFDO1FBQ3hDLE9BQU8sRUFBRSxDQUFDO0lBQ1osQ0FBQztJQUVELE9BQU8sS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUM7QUFDM0MsQ0FBQztBQUVEOztHQUVHO0FBQ0gsU0FBZ0IsWUFBWSxDQUFDLElBQVk7SUFDdkMsSUFBSSxDQUFDLElBQUksSUFBSSxPQUFPLElBQUksS0FBSyxRQUFRLEVBQUUsQ0FBQztRQUN0QyxPQUFPLEtBQUssQ0FBQztJQUNmLENBQUM7SUFFRCxNQUFNLFNBQVMsR0FBRyw0RUFBNEUsQ0FBQztJQUMvRixPQUFPLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDOUIsQ0FBQztBQUVEOztHQUVHO0FBQ0gsU0FBZ0IsZ0JBQWdCLENBQUMsUUFBZ0I7SUFDL0MsTUFBTSxNQUFNLEdBQWEsRUFBRSxDQUFDO0lBRTVCLElBQUksQ0FBQyxRQUFRLElBQUksT0FBTyxRQUFRLEtBQUssUUFBUSxFQUFFLENBQUM7UUFDOUMsTUFBTSxDQUFDLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO1FBQ3BDLE9BQU8sRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxDQUFDO0lBQ2xDLENBQUM7SUFFRCxJQUFJLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7UUFDeEIsTUFBTSxDQUFDLElBQUksQ0FBQyw2Q0FBNkMsQ0FBQyxDQUFDO0lBQzdELENBQUM7SUFFRCxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDO1FBQzVCLE1BQU0sQ0FBQyxJQUFJLENBQUMscURBQXFELENBQUMsQ0FBQztJQUNyRSxDQUFDO0lBRUQsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQztRQUM1QixNQUFNLENBQUMsSUFBSSxDQUFDLHFEQUFxRCxDQUFDLENBQUM7SUFDckUsQ0FBQztJQUVELElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7UUFDekIsTUFBTSxDQUFDLElBQUksQ0FBQywyQ0FBMkMsQ0FBQyxDQUFDO0lBQzNELENBQUM7SUFFRCxJQUFJLENBQUMsd0JBQXdCLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7UUFDN0MsTUFBTSxDQUFDLElBQUksQ0FBQyxzREFBc0QsQ0FBQyxDQUFDO0lBQ3RFLENBQUM7SUFFRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDO0FBQ2hELENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogVmFsaWRhdGlvbiB1dGlsaXRpZXMgZm9yIGF1dGhlbnRpY2F0aW9uIGFuZCBvdGhlciBzZXJ2aWNlc1xyXG4gKi9cclxuXHJcbi8qKlxyXG4gKiBWYWxpZGF0ZSBlbWFpbCBhZGRyZXNzIGZvcm1hdFxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIHZhbGlkYXRlRW1haWwoZW1haWw6IHN0cmluZyk6IGJvb2xlYW4ge1xyXG4gIGlmICghZW1haWwgfHwgdHlwZW9mIGVtYWlsICE9PSAnc3RyaW5nJykge1xyXG4gICAgcmV0dXJuIGZhbHNlO1xyXG4gIH1cclxuXHJcbiAgY29uc3QgZW1haWxSZWdleCA9IC9eW15cXHNAXStAW15cXHNAXStcXC5bXlxcc0BdKyQvO1xyXG4gIHJldHVybiBlbWFpbFJlZ2V4LnRlc3QoZW1haWwudHJpbSgpKTtcclxufVxyXG5cclxuLyoqXHJcbiAqIFZhbGlkYXRlIE9UUCBjb2RlIGZvcm1hdCAoNiBkaWdpdHMpXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gdmFsaWRhdGVPVFBDb2RlKGNvZGU6IHN0cmluZyk6IGJvb2xlYW4ge1xyXG4gIGlmICghY29kZSB8fCB0eXBlb2YgY29kZSAhPT0gJ3N0cmluZycpIHtcclxuICAgIHJldHVybiBmYWxzZTtcclxuICB9XHJcblxyXG4gIHJldHVybiAvXlxcZHs2fSQvLnRlc3QoY29kZS50cmltKCkpO1xyXG59XHJcblxyXG4vKipcclxuICogVmFsaWRhdGUgdmVyaWZpY2F0aW9uIGNvZGUgZm9ybWF0ICg2IGRpZ2l0cylcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiB2YWxpZGF0ZVZlcmlmaWNhdGlvbkNvZGUoY29kZTogc3RyaW5nKTogYm9vbGVhbiB7XHJcbiAgcmV0dXJuIHZhbGlkYXRlT1RQQ29kZShjb2RlKTsgLy8gU2FtZSBmb3JtYXQgYXMgT1RQXHJcbn1cclxuXHJcbi8qKlxyXG4gKiBWYWxpZGF0ZSBuYW1lIGZvcm1hdCAoYmFzaWMgdmFsaWRhdGlvbilcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiB2YWxpZGF0ZU5hbWUobmFtZTogc3RyaW5nKTogYm9vbGVhbiB7XHJcbiAgaWYgKCFuYW1lIHx8IHR5cGVvZiBuYW1lICE9PSAnc3RyaW5nJykge1xyXG4gICAgcmV0dXJuIGZhbHNlO1xyXG4gIH1cclxuXHJcbiAgY29uc3QgdHJpbW1lZE5hbWUgPSBuYW1lLnRyaW0oKTtcclxuICByZXR1cm4gdHJpbW1lZE5hbWUubGVuZ3RoID49IDEgJiYgdHJpbW1lZE5hbWUubGVuZ3RoIDw9IDEwMDtcclxufVxyXG5cclxuLyoqXHJcbiAqIFNhbml0aXplIHN0cmluZyBpbnB1dFxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIHNhbml0aXplU3RyaW5nKGlucHV0OiBzdHJpbmcpOiBzdHJpbmcge1xyXG4gIGlmICghaW5wdXQgfHwgdHlwZW9mIGlucHV0ICE9PSAnc3RyaW5nJykge1xyXG4gICAgcmV0dXJuICcnO1xyXG4gIH1cclxuXHJcbiAgcmV0dXJuIGlucHV0LnRyaW0oKS5yZXBsYWNlKC9bPD5dL2csICcnKTtcclxufVxyXG5cclxuLyoqXHJcbiAqIFZhbGlkYXRlIFVVSUQgZm9ybWF0XHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gdmFsaWRhdGVVVUlEKHV1aWQ6IHN0cmluZyk6IGJvb2xlYW4ge1xyXG4gIGlmICghdXVpZCB8fCB0eXBlb2YgdXVpZCAhPT0gJ3N0cmluZycpIHtcclxuICAgIHJldHVybiBmYWxzZTtcclxuICB9XHJcblxyXG4gIGNvbnN0IHV1aWRSZWdleCA9IC9eWzAtOWEtZl17OH0tWzAtOWEtZl17NH0tWzEtNV1bMC05YS1mXXszfS1bODlhYl1bMC05YS1mXXszfS1bMC05YS1mXXsxMn0kL2k7XHJcbiAgcmV0dXJuIHV1aWRSZWdleC50ZXN0KHV1aWQpO1xyXG59XHJcblxyXG4vKipcclxuICogVmFsaWRhdGUgcGFzc3dvcmQgc3RyZW5ndGggKGJhc2ljIHJlcXVpcmVtZW50cylcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiB2YWxpZGF0ZVBhc3N3b3JkKHBhc3N3b3JkOiBzdHJpbmcpOiB7IHZhbGlkOiBib29sZWFuOyBlcnJvcnM6IHN0cmluZ1tdIH0ge1xyXG4gIGNvbnN0IGVycm9yczogc3RyaW5nW10gPSBbXTtcclxuXHJcbiAgaWYgKCFwYXNzd29yZCB8fCB0eXBlb2YgcGFzc3dvcmQgIT09ICdzdHJpbmcnKSB7XHJcbiAgICBlcnJvcnMucHVzaCgnUGFzc3dvcmQgaXMgcmVxdWlyZWQnKTtcclxuICAgIHJldHVybiB7IHZhbGlkOiBmYWxzZSwgZXJyb3JzIH07XHJcbiAgfVxyXG5cclxuICBpZiAocGFzc3dvcmQubGVuZ3RoIDwgOCkge1xyXG4gICAgZXJyb3JzLnB1c2goJ1Bhc3N3b3JkIG11c3QgYmUgYXQgbGVhc3QgOCBjaGFyYWN0ZXJzIGxvbmcnKTtcclxuICB9XHJcblxyXG4gIGlmICghL1tBLVpdLy50ZXN0KHBhc3N3b3JkKSkge1xyXG4gICAgZXJyb3JzLnB1c2goJ1Bhc3N3b3JkIG11c3QgY29udGFpbiBhdCBsZWFzdCBvbmUgdXBwZXJjYXNlIGxldHRlcicpO1xyXG4gIH1cclxuXHJcbiAgaWYgKCEvW2Etel0vLnRlc3QocGFzc3dvcmQpKSB7XHJcbiAgICBlcnJvcnMucHVzaCgnUGFzc3dvcmQgbXVzdCBjb250YWluIGF0IGxlYXN0IG9uZSBsb3dlcmNhc2UgbGV0dGVyJyk7XHJcbiAgfVxyXG5cclxuICBpZiAoIS9cXGQvLnRlc3QocGFzc3dvcmQpKSB7XHJcbiAgICBlcnJvcnMucHVzaCgnUGFzc3dvcmQgbXVzdCBjb250YWluIGF0IGxlYXN0IG9uZSBudW1iZXInKTtcclxuICB9XHJcblxyXG4gIGlmICghL1shQCMkJV4mKigpLC4/XCI6e318PD5dLy50ZXN0KHBhc3N3b3JkKSkge1xyXG4gICAgZXJyb3JzLnB1c2goJ1Bhc3N3b3JkIG11c3QgY29udGFpbiBhdCBsZWFzdCBvbmUgc3BlY2lhbCBjaGFyYWN0ZXInKTtcclxuICB9XHJcblxyXG4gIHJldHVybiB7IHZhbGlkOiBlcnJvcnMubGVuZ3RoID09PSAwLCBlcnJvcnMgfTtcclxufSJdfQ==
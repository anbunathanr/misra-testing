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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmFsaWRhdGlvbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInZhbGlkYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOztHQUVHOztBQUtILHNDQU9DO0FBS0QsMENBTUM7QUFLRCw0REFFQztBQUtELG9DQU9DO0FBS0Qsd0NBTUM7QUFLRCxvQ0FPQztBQUtELDRDQTZCQztBQWpHRDs7R0FFRztBQUNILFNBQWdCLGFBQWEsQ0FBQyxLQUFhO0lBQ3pDLElBQUksQ0FBQyxLQUFLLElBQUksT0FBTyxLQUFLLEtBQUssUUFBUSxFQUFFLENBQUM7UUFDeEMsT0FBTyxLQUFLLENBQUM7SUFDZixDQUFDO0lBRUQsTUFBTSxVQUFVLEdBQUcsNEJBQTRCLENBQUM7SUFDaEQsT0FBTyxVQUFVLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDO0FBQ3ZDLENBQUM7QUFFRDs7R0FFRztBQUNILFNBQWdCLGVBQWUsQ0FBQyxJQUFZO0lBQzFDLElBQUksQ0FBQyxJQUFJLElBQUksT0FBTyxJQUFJLEtBQUssUUFBUSxFQUFFLENBQUM7UUFDdEMsT0FBTyxLQUFLLENBQUM7SUFDZixDQUFDO0lBRUQsT0FBTyxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDO0FBQ3JDLENBQUM7QUFFRDs7R0FFRztBQUNILFNBQWdCLHdCQUF3QixDQUFDLElBQVk7SUFDbkQsT0FBTyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxxQkFBcUI7QUFDckQsQ0FBQztBQUVEOztHQUVHO0FBQ0gsU0FBZ0IsWUFBWSxDQUFDLElBQVk7SUFDdkMsSUFBSSxDQUFDLElBQUksSUFBSSxPQUFPLElBQUksS0FBSyxRQUFRLEVBQUUsQ0FBQztRQUN0QyxPQUFPLEtBQUssQ0FBQztJQUNmLENBQUM7SUFFRCxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7SUFDaEMsT0FBTyxXQUFXLENBQUMsTUFBTSxJQUFJLENBQUMsSUFBSSxXQUFXLENBQUMsTUFBTSxJQUFJLEdBQUcsQ0FBQztBQUM5RCxDQUFDO0FBRUQ7O0dBRUc7QUFDSCxTQUFnQixjQUFjLENBQUMsS0FBYTtJQUMxQyxJQUFJLENBQUMsS0FBSyxJQUFJLE9BQU8sS0FBSyxLQUFLLFFBQVEsRUFBRSxDQUFDO1FBQ3hDLE9BQU8sRUFBRSxDQUFDO0lBQ1osQ0FBQztJQUVELE9BQU8sS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUM7QUFDM0MsQ0FBQztBQUVEOztHQUVHO0FBQ0gsU0FBZ0IsWUFBWSxDQUFDLElBQVk7SUFDdkMsSUFBSSxDQUFDLElBQUksSUFBSSxPQUFPLElBQUksS0FBSyxRQUFRLEVBQUUsQ0FBQztRQUN0QyxPQUFPLEtBQUssQ0FBQztJQUNmLENBQUM7SUFFRCxNQUFNLFNBQVMsR0FBRyw0RUFBNEUsQ0FBQztJQUMvRixPQUFPLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDOUIsQ0FBQztBQUVEOztHQUVHO0FBQ0gsU0FBZ0IsZ0JBQWdCLENBQUMsUUFBZ0I7SUFDL0MsTUFBTSxNQUFNLEdBQWEsRUFBRSxDQUFDO0lBRTVCLElBQUksQ0FBQyxRQUFRLElBQUksT0FBTyxRQUFRLEtBQUssUUFBUSxFQUFFLENBQUM7UUFDOUMsTUFBTSxDQUFDLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO1FBQ3BDLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7SUFDeEQsQ0FBQztJQUVELElBQUksUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztRQUN4QixNQUFNLENBQUMsSUFBSSxDQUFDLDZDQUE2QyxDQUFDLENBQUM7SUFDN0QsQ0FBQztJQUVELElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7UUFDNUIsTUFBTSxDQUFDLElBQUksQ0FBQyxxREFBcUQsQ0FBQyxDQUFDO0lBQ3JFLENBQUM7SUFFRCxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDO1FBQzVCLE1BQU0sQ0FBQyxJQUFJLENBQUMscURBQXFELENBQUMsQ0FBQztJQUNyRSxDQUFDO0lBRUQsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQztRQUN6QixNQUFNLENBQUMsSUFBSSxDQUFDLDJDQUEyQyxDQUFDLENBQUM7SUFDM0QsQ0FBQztJQUVELElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQztRQUM3QyxNQUFNLENBQUMsSUFBSSxDQUFDLHNEQUFzRCxDQUFDLENBQUM7SUFDdEUsQ0FBQztJQUVELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsT0FBTyxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztBQUN0RSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIFZhbGlkYXRpb24gdXRpbGl0aWVzIGZvciBhdXRoZW50aWNhdGlvbiBhbmQgb3RoZXIgc2VydmljZXNcclxuICovXHJcblxyXG4vKipcclxuICogVmFsaWRhdGUgZW1haWwgYWRkcmVzcyBmb3JtYXRcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiB2YWxpZGF0ZUVtYWlsKGVtYWlsOiBzdHJpbmcpOiBib29sZWFuIHtcclxuICBpZiAoIWVtYWlsIHx8IHR5cGVvZiBlbWFpbCAhPT0gJ3N0cmluZycpIHtcclxuICAgIHJldHVybiBmYWxzZTtcclxuICB9XHJcblxyXG4gIGNvbnN0IGVtYWlsUmVnZXggPSAvXlteXFxzQF0rQFteXFxzQF0rXFwuW15cXHNAXSskLztcclxuICByZXR1cm4gZW1haWxSZWdleC50ZXN0KGVtYWlsLnRyaW0oKSk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBWYWxpZGF0ZSBPVFAgY29kZSBmb3JtYXQgKDYgZGlnaXRzKVxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIHZhbGlkYXRlT1RQQ29kZShjb2RlOiBzdHJpbmcpOiBib29sZWFuIHtcclxuICBpZiAoIWNvZGUgfHwgdHlwZW9mIGNvZGUgIT09ICdzdHJpbmcnKSB7XHJcbiAgICByZXR1cm4gZmFsc2U7XHJcbiAgfVxyXG5cclxuICByZXR1cm4gL15cXGR7Nn0kLy50ZXN0KGNvZGUudHJpbSgpKTtcclxufVxyXG5cclxuLyoqXHJcbiAqIFZhbGlkYXRlIHZlcmlmaWNhdGlvbiBjb2RlIGZvcm1hdCAoNiBkaWdpdHMpXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gdmFsaWRhdGVWZXJpZmljYXRpb25Db2RlKGNvZGU6IHN0cmluZyk6IGJvb2xlYW4ge1xyXG4gIHJldHVybiB2YWxpZGF0ZU9UUENvZGUoY29kZSk7IC8vIFNhbWUgZm9ybWF0IGFzIE9UUFxyXG59XHJcblxyXG4vKipcclxuICogVmFsaWRhdGUgbmFtZSBmb3JtYXQgKGJhc2ljIHZhbGlkYXRpb24pXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gdmFsaWRhdGVOYW1lKG5hbWU6IHN0cmluZyk6IGJvb2xlYW4ge1xyXG4gIGlmICghbmFtZSB8fCB0eXBlb2YgbmFtZSAhPT0gJ3N0cmluZycpIHtcclxuICAgIHJldHVybiBmYWxzZTtcclxuICB9XHJcblxyXG4gIGNvbnN0IHRyaW1tZWROYW1lID0gbmFtZS50cmltKCk7XHJcbiAgcmV0dXJuIHRyaW1tZWROYW1lLmxlbmd0aCA+PSAxICYmIHRyaW1tZWROYW1lLmxlbmd0aCA8PSAxMDA7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBTYW5pdGl6ZSBzdHJpbmcgaW5wdXRcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBzYW5pdGl6ZVN0cmluZyhpbnB1dDogc3RyaW5nKTogc3RyaW5nIHtcclxuICBpZiAoIWlucHV0IHx8IHR5cGVvZiBpbnB1dCAhPT0gJ3N0cmluZycpIHtcclxuICAgIHJldHVybiAnJztcclxuICB9XHJcblxyXG4gIHJldHVybiBpbnB1dC50cmltKCkucmVwbGFjZSgvWzw+XS9nLCAnJyk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBWYWxpZGF0ZSBVVUlEIGZvcm1hdFxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIHZhbGlkYXRlVVVJRCh1dWlkOiBzdHJpbmcpOiBib29sZWFuIHtcclxuICBpZiAoIXV1aWQgfHwgdHlwZW9mIHV1aWQgIT09ICdzdHJpbmcnKSB7XHJcbiAgICByZXR1cm4gZmFsc2U7XHJcbiAgfVxyXG5cclxuICBjb25zdCB1dWlkUmVnZXggPSAvXlswLTlhLWZdezh9LVswLTlhLWZdezR9LVsxLTVdWzAtOWEtZl17M30tWzg5YWJdWzAtOWEtZl17M30tWzAtOWEtZl17MTJ9JC9pO1xyXG4gIHJldHVybiB1dWlkUmVnZXgudGVzdCh1dWlkKTtcclxufVxyXG5cclxuLyoqXHJcbiAqIFZhbGlkYXRlIHBhc3N3b3JkIHN0cmVuZ3RoIChiYXNpYyByZXF1aXJlbWVudHMpXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gdmFsaWRhdGVQYXNzd29yZChwYXNzd29yZDogc3RyaW5nKTogeyBpc1ZhbGlkOiBib29sZWFuOyBtZXNzYWdlOiBzdHJpbmcgfSB7XHJcbiAgY29uc3QgZXJyb3JzOiBzdHJpbmdbXSA9IFtdO1xyXG5cclxuICBpZiAoIXBhc3N3b3JkIHx8IHR5cGVvZiBwYXNzd29yZCAhPT0gJ3N0cmluZycpIHtcclxuICAgIGVycm9ycy5wdXNoKCdQYXNzd29yZCBpcyByZXF1aXJlZCcpO1xyXG4gICAgcmV0dXJuIHsgaXNWYWxpZDogZmFsc2UsIG1lc3NhZ2U6IGVycm9ycy5qb2luKCc7ICcpIH07XHJcbiAgfVxyXG5cclxuICBpZiAocGFzc3dvcmQubGVuZ3RoIDwgOCkge1xyXG4gICAgZXJyb3JzLnB1c2goJ1Bhc3N3b3JkIG11c3QgYmUgYXQgbGVhc3QgOCBjaGFyYWN0ZXJzIGxvbmcnKTtcclxuICB9XHJcblxyXG4gIGlmICghL1tBLVpdLy50ZXN0KHBhc3N3b3JkKSkge1xyXG4gICAgZXJyb3JzLnB1c2goJ1Bhc3N3b3JkIG11c3QgY29udGFpbiBhdCBsZWFzdCBvbmUgdXBwZXJjYXNlIGxldHRlcicpO1xyXG4gIH1cclxuXHJcbiAgaWYgKCEvW2Etel0vLnRlc3QocGFzc3dvcmQpKSB7XHJcbiAgICBlcnJvcnMucHVzaCgnUGFzc3dvcmQgbXVzdCBjb250YWluIGF0IGxlYXN0IG9uZSBsb3dlcmNhc2UgbGV0dGVyJyk7XHJcbiAgfVxyXG5cclxuICBpZiAoIS9cXGQvLnRlc3QocGFzc3dvcmQpKSB7XHJcbiAgICBlcnJvcnMucHVzaCgnUGFzc3dvcmQgbXVzdCBjb250YWluIGF0IGxlYXN0IG9uZSBudW1iZXInKTtcclxuICB9XHJcblxyXG4gIGlmICghL1shQCMkJV4mKigpLC4/XCI6e318PD5dLy50ZXN0KHBhc3N3b3JkKSkge1xyXG4gICAgZXJyb3JzLnB1c2goJ1Bhc3N3b3JkIG11c3QgY29udGFpbiBhdCBsZWFzdCBvbmUgc3BlY2lhbCBjaGFyYWN0ZXInKTtcclxuICB9XHJcblxyXG4gIHJldHVybiB7IGlzVmFsaWQ6IGVycm9ycy5sZW5ndGggPT09IDAsIG1lc3NhZ2U6IGVycm9ycy5qb2luKCc7ICcpIH07XHJcbn0iXX0=
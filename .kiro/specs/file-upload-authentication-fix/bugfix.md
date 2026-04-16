# Bugfix Requirements Document

## Introduction

This document addresses the file upload authentication error where users receive a 401 "You need to log in to access this resource" error when attempting to upload files after successful registration and email verification. The bug occurs because the authentication system requires completing the full OTP setup flow before issuing tokens, but automated workflows attempt file uploads immediately after registration when users are in the `otp_setup_required` state without any authentication tokens.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a user completes registration and email verification but has not completed OTP setup THEN the system does not issue any authentication tokens

1.2 WHEN a user in `otp_setup_required` state attempts to upload a file THEN the system returns 401 "You need to log in to access this resource" error

1.3 WHEN the frontend API client makes requests for users in `otp_setup_required` state THEN no Authorization header is sent because no token exists in localStorage or Redux store

1.4 WHEN the file upload Lambda function calls `getUserFromContext()` for requests without Authorization headers THEN it returns empty user context with no userId

### Expected Behavior (Correct)

2.1 WHEN a user completes registration and email verification THEN the system SHALL issue temporary authentication tokens that allow file operations

2.2 WHEN a user in `otp_setup_required` state attempts to upload a file THEN the system SHALL authenticate the request successfully and process the file upload

2.3 WHEN the frontend API client makes requests for users in `otp_setup_required` state THEN it SHALL include valid Authorization headers with temporary tokens

2.4 WHEN the file upload Lambda function calls `getUserFromContext()` for requests with temporary tokens THEN it SHALL return valid user context with userId and organizationId

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a user completes the full authentication flow including OTP setup THEN the system SHALL CONTINUE TO issue full authentication tokens

3.2 WHEN a fully authenticated user uploads files THEN the system SHALL CONTINUE TO process uploads successfully

3.3 WHEN users without any authentication attempt file uploads THEN the system SHALL CONTINUE TO return 401 errors

3.4 WHEN the authentication flow reaches the final `authenticated` state THEN the system SHALL CONTINUE TO provide full access to all features
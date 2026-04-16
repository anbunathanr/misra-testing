/**
 * UnifiedAuthService Integration Validation Methods
 * Validates service integration and compatibility
 */
import { UnifiedAuthService } from './unified-auth-service';
import { JWTService } from './jwt-service';
import { EmailVerificationService } from './email-verification-service';
export declare class UnifiedAuthServiceValidator {
    private service;
    private jwtService;
    private emailVerificationService;
    constructor(service?: UnifiedAuthService, jwtService?: JWTService, emailVerificationService?: EmailVerificationService);
    /**
     * Verify all required methods exist and are callable
     */
    validateRequiredMethods(): {
        valid: boolean;
        methods: string[];
    };
    /**
     * Validate method signatures match expected interfaces
     */
    validateMethodSignatures(): Promise<{
        valid: boolean;
        results: Array<{
            method: string;
            valid: boolean;
            message: string;
        }>;
    }>;
    /**
     * Test integration with existing JWT service
     */
    validateJWTIntegration(): Promise<{
        valid: boolean;
        results: Array<{
            check: string;
            valid: boolean;
            message: string;
        }>;
    }>;
    /**
     * Validate user data structure compatibility
     */
    validateUserDataStructure(): {
        valid: boolean;
        message: string;
    };
    /**
     * Test error handling integration
     */
    validateErrorHandling(): Promise<{
        valid: boolean;
        results: Array<{
            scenario: string;
            valid: boolean;
            message: string;
        }>;
    }>;
    /**
     * Validate authentication state transitions
     */
    validateStateTransitions(): {
        valid: boolean;
        message: string;
    };
    /**
     * Run all validation checks
     */
    runFullValidation(): Promise<{
        allValid: boolean;
        results: {
            methods: {
                valid: boolean;
                methods: string[];
            };
            signatures: {
                valid: boolean;
                results: Array<{
                    method: string;
                    valid: boolean;
                    message: string;
                }>;
            };
            jwt: {
                valid: boolean;
                results: Array<{
                    check: string;
                    valid: boolean;
                    message: string;
                }>;
            };
            userData: {
                valid: boolean;
                message: string;
            };
            errorHandling: {
                valid: boolean;
                results: Array<{
                    scenario: string;
                    valid: boolean;
                    message: string;
                }>;
            };
            stateTransitions: {
                valid: boolean;
                message: string;
            };
        };
    }>;
}

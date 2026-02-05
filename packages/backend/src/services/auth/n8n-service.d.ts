export interface N8nUser {
    email: string;
    organizationId: string;
    role?: 'admin' | 'developer' | 'viewer';
    firstName?: string;
    lastName?: string;
}
export declare class N8nService {
    private n8nWebhookUrl;
    private n8nApiKey;
    constructor();
    validateCredentials(email: string, password: string): Promise<N8nUser | null>;
    syncUserProfile(userId: string, email: string): Promise<N8nUser | null>;
    private mockValidateCredentials;
    private mockGetUserProfile;
}

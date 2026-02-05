interface User {
    userId: string;
    email: string;
    organizationId: string;
    role: 'admin' | 'developer' | 'viewer';
    preferences: UserPreferences;
    createdAt: Date;
    lastLoginAt: Date;
}
interface UserPreferences {
    theme: 'light' | 'dark';
    notifications: {
        email: boolean;
        webhook: boolean;
    };
    defaultMisraRuleSet: 'MISRA_C_2004' | 'MISRA_C_2012' | 'MISRA_CPP_2008';
}
export interface CreateUserRequest {
    email: string;
    organizationId: string;
    role: 'admin' | 'developer' | 'viewer';
    preferences: UserPreferences;
}
export declare class UserService {
    private docClient;
    private tableName;
    constructor();
    createUser(userData: CreateUserRequest): Promise<User>;
    getUserById(userId: string): Promise<User | null>;
    getUserByEmail(email: string): Promise<User | null>;
    updateLastLogin(userId: string): Promise<void>;
    updateUserPreferences(userId: string, preferences: Partial<UserPreferences>): Promise<void>;
    getUsersByOrganization(organizationId: string): Promise<User[]>;
    private mapDynamoItemToUser;
}
export {};

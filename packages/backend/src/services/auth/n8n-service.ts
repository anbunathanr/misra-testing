// Declare Node.js globals for Lambda environment
declare const process: {
  env: {
    NODE_ENV?: string;
    N8N_WEBHOOK_URL?: string;
    N8N_API_KEY?: string;
  };
};

declare const console: {
  warn: (message: string) => void;
  error: (message: string, ...args: any[]) => void;
};

export interface N8nUser {
  email: string;
  organizationId: string;
  role?: 'admin' | 'developer' | 'viewer';
  firstName?: string;
  lastName?: string;
}

export class N8nService {
  private n8nWebhookUrl: string;
  private n8nApiKey: string;

  constructor() {
    this.n8nWebhookUrl = process.env.N8N_WEBHOOK_URL || '';
    this.n8nApiKey = process.env.N8N_API_KEY || '';

    if (!this.n8nWebhookUrl) {
      console.warn('N8N_WEBHOOK_URL not configured');
    }
  }

  async validateCredentials(email: string, password: string): Promise<N8nUser | null> {
    try {
      // For development/testing, use mock validation
      if (process.env.NODE_ENV === 'development' || !this.n8nWebhookUrl) {
        return this.mockValidateCredentials(email, password);
      }

      // In production, this would make actual HTTP request to n8n
      // For now, using mock data until n8n is properly configured
      return this.mockValidateCredentials(email, password);
    } catch (error) {
      console.error('Error validating credentials with n8n:', error);
      throw new Error('Authentication service unavailable');
    }
  }

  async syncUserProfile(userId: string, email: string): Promise<N8nUser | null> {
    try {
      // For development/testing, use mock data
      if (process.env.NODE_ENV === 'development' || !this.n8nWebhookUrl) {
        return this.mockGetUserProfile(email);
      }

      // In production, this would make actual HTTP request to n8n
      // For now, using mock data until n8n is properly configured
      return this.mockGetUserProfile(email);
    } catch (error) {
      console.error('Error syncing user profile with n8n:', error);
      return null;
    }
  }

  private mockValidateCredentials(email: string, password: string): N8nUser | null {
    // Mock validation for development - matches test users created in DynamoDB
    const validUsers = [
      {
        email: 'admin@misra-platform.com',
        password: 'password123',
        organizationId: 'org-001',
        role: 'admin' as const,
        firstName: 'Admin',
        lastName: 'User',
      },
      {
        email: 'developer@misra-platform.com',
        password: 'password123',
        organizationId: 'org-001',
        role: 'developer' as const,
        firstName: 'Developer',
        lastName: 'User',
      },
      {
        email: 'viewer@misra-platform.com',
        password: 'password123',
        organizationId: 'org-001',
        role: 'viewer' as const,
        firstName: 'Viewer',
        lastName: 'User',
      },
    ];

    const user = validUsers.find(u => u.email === email && u.password === password);
    
    if (!user) {
      return null;
    }

    return {
      email: user.email,
      organizationId: user.organizationId,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
    };
  }

  private mockGetUserProfile(email: string): N8nUser | null {
    // Mock profile data for development - matches test users created in DynamoDB
    const profiles = [
      {
        email: 'admin@misra-platform.com',
        organizationId: 'org-001',
        role: 'admin' as const,
        firstName: 'Admin',
        lastName: 'User',
      },
      {
        email: 'developer@misra-platform.com',
        organizationId: 'org-001',
        role: 'developer' as const,
        firstName: 'Developer',
        lastName: 'User',
      },
      {
        email: 'viewer@misra-platform.com',
        organizationId: 'org-001',
        role: 'viewer' as const,
        firstName: 'Viewer',
        lastName: 'User',
      },
    ];

    return profiles.find(p => p.email === email) || null;
  }
}
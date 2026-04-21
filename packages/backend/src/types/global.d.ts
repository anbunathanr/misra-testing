// Global type declarations for Lambda environment

declare const process: {
  env: {
    NODE_ENV?: 'development' | 'production' | 'test';
    AWS_REGION?: string;
    USERS_TABLE_NAME?: string;
    JWT_SECRET_NAME?: string;
    OTP_SECRET_NAME?: string;
    API_KEYS_SECRET_NAME?: string;
    DATABASE_SECRET_NAME?: string;
    N8N_WEBHOOK_URL?: string;
    N8N_API_KEY?: string;
    COGNITO_USER_POOL_ID?: string;
    COGNITO_CLIENT_ID?: string;
    ENVIRONMENT?: 'dev' | 'staging' | 'production' | 'test';
  };
};

declare const console: {
  log: (...args: any[]) => void;
  error: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  info: (...args: any[]) => void;
};

export {};
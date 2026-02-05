// Global type declarations for Lambda environment

declare const process: {
  env: {
    NODE_ENV?: 'development' | 'production' | 'test';
    AWS_REGION?: string;
    USERS_TABLE_NAME?: string;
    JWT_SECRET_NAME?: string;
    N8N_WEBHOOK_URL?: string;
    N8N_API_KEY?: string;
  };
};

declare const console: {
  log: (...args: any[]) => void;
  error: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  info: (...args: any[]) => void;
};

export {};
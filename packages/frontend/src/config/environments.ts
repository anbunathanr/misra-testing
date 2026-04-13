export interface Environment {
  name: string;
  appUrl: string;
  backendUrl: string;
  description: string;
  cognitoUserPoolId?: string;
  cognitoClientId?: string;
  enableAnalytics: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

export const environments: Record<string, Environment> = {
  demo: {
    name: 'Demo Mode',
    appUrl: 'https://demo.misra.digitransolutions.in',
    backendUrl: 'mock',
    description: 'Demo Mode (Mock Backend)',
    enableAnalytics: false,
    logLevel: 'debug'
  },
  local: {
    name: 'Local Development',
    appUrl: 'http://localhost:3000',
    backendUrl: 'http://localhost:3001',
    description: 'Local Development',
    cognitoUserPoolId: 'us-east-1_yTX8thfy9',
    cognitoClientId: '7ltt7flg73m2or3lfq534fbmee',
    enableAnalytics: false,
    logLevel: 'debug'
  },
  development: {
    name: 'Development',
    appUrl: 'https://dev.misra.digitransolutions.in',
    backendUrl: 'https://api-dev.misra.digitransolutions.in',
    description: 'Development',
    cognitoUserPoolId: 'us-east-1_yTX8thfy9',
    cognitoClientId: '7ltt7flg73m2or3lfq534fbmee',
    enableAnalytics: true,
    logLevel: 'info'
  },
  staging: {
    name: 'Staging',
    appUrl: 'https://staging.misra.digitransolutions.in',
    backendUrl: 'https://api-staging.misra.digitransolutions.in',
    description: 'Staging',
    cognitoUserPoolId: 'us-east-1_yTX8thfy9',
    cognitoClientId: '7ltt7flg73m2or3lfq534fbmee',
    enableAnalytics: true,
    logLevel: 'info'
  },
  production: {
    name: 'Production',
    appUrl: 'https://misra.digitransolutions.in',
    backendUrl: 'https://api.misra.digitransolutions.in',
    description: 'Production',
    cognitoUserPoolId: 'us-east-1_yTX8thfy9',
    cognitoClientId: '7ltt7flg73m2or3lfq534fbmee',
    enableAnalytics: true,
    logLevel: 'warn'
  }
};

export const getEnvironment = (envName: string): Environment => {
  return environments[envName] || environments.demo;
};

export const getCurrentEnvironment = (): Environment => {
  return getEnvironment('demo');
};
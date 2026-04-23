/**
 * API Configuration
 */

export const API_URL = import.meta.env.VITE_API_URL || 
  'https://jno64tiewg.execute-api.us-east-1.amazonaws.com';

export const API_CONFIG = {
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
};

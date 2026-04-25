/**
 * API Configuration
 */

// Debug: Log environment variables
console.log('🔧 API Config Environment Variables:', {
  VITE_API_URL: import.meta.env.VITE_API_URL,
  VITE_ENVIRONMENT: import.meta.env.VITE_ENVIRONMENT,
  NODE_ENV: import.meta.env.NODE_ENV,
  MODE: import.meta.env.MODE
});

// Ensure we always have the correct API URL
const API_URL_FALLBACK = 'https://jno64tiewg.execute-api.us-east-1.amazonaws.com';
export const API_URL = import.meta.env.VITE_API_URL || API_URL_FALLBACK;

console.log('🔧 Final API_URL:', API_URL);

// Validate API URL
if (!API_URL || API_URL.includes('undefined')) {
  console.error('❌ Invalid API URL detected:', API_URL);
  console.error('❌ Using fallback URL:', API_URL_FALLBACK);
}

export const API_CONFIG = {
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
};

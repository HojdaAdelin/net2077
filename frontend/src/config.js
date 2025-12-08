export const API_URL = import.meta.env.VITE_API_URL || '/api';
export const IS_PRODUCTION = import.meta.env.PROD;

if (!IS_PRODUCTION) {
  console.log('API Configuration:', {
    API_URL,
    IS_PRODUCTION,
    VITE_API_URL: import.meta.env.VITE_API_URL
  });
}

// Base API configuration
export const API_CONFIG = {
  // In development, use relative path (handled by Vite proxy)
  // In production, use VITE_API_URL or fallback to empty string (relative to current origin)
  baseURL: import.meta.env.PROD ? import.meta.env.VITE_API_URL || '' : '',
  timeout: 10000, // 10 seconds
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: true, // Important for cookies/auth
};

// Helper function to build API URLs
export const buildApiUrl = (path: string): string => {
  // Remove leading slashes to prevent double slashes
  const cleanPath = path.replace(/^\/+/, '');
  
  // In development, use the Vite proxy path
  // In production, prepend the base URL if it exists
  const base = import.meta.env.DEV ? '/api' : API_CONFIG.baseURL;
  return base ? `${base.replace(/\/+$/, '')}/${cleanPath}` : `/${cleanPath}`;
};

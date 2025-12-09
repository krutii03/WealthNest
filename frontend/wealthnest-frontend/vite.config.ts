// frontend/wealthnest-frontend/vite.config.ts
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import type { UserConfig } from 'vite';

export default defineConfig(({ mode }) => {
  // Load env file for current mode
  const env = loadEnv(mode, process.cwd(), '');

  // Expose only VITE_ prefixed vars to client under import.meta.env.*
  const envWithProcessPrefix = {
    'process.env': Object.entries(env).reduce<Record<string, string>>(
      (prev, [key, val]) => {
        if (key.startsWith('VITE_')) {
          const envKey = `import.meta.env.${key}` as const;
          prev[envKey] = JSON.stringify(val);
        }
        return prev;
      },
      {
        'import.meta.env.MODE': JSON.stringify(mode),
        'import.meta.env.DEV': JSON.stringify(mode === 'development'),
        'import.meta.env.PROD': JSON.stringify(mode === 'production'),
      }
    ),
  };

  const config: UserConfig = {
    plugins: [react()],
    define: envWithProcessPrefix,
    resolve: {
      alias: {
        '@': '/src',  // This enables @/ imports to point to the src directory
      },
    },
  };

  if (mode === 'development') {
    // Development server configuration
    config.server = {
      port: 3000,
      strictPort: true,
      proxy: {
        // Proxy API requests to the backend
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api/, '/api'),
        },
        // Proxy /alpha -> Alpha Vantage (avoid CORS for direct alpha calls)
        '/alpha': {
          target: 'https://www.alphavantage.co',
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/alpha/, ''),
        },
      },
    };
  }

  return config;
});
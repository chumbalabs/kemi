import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwind from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env files with proper priority:
  // 1. .env.local (highest priority)
  // 2. .env.development or .env.production
  // 3. .env (lowest priority)
  const env = loadEnv(mode, process.cwd(), '')
  
  // For production builds, if VITE_API_BASE_URL is not set, use the new backend URL
  const apiBaseUrl = env.VITE_API_BASE_URL || (mode === 'production' ? 'https://kemi-backend-x2a8.onrender.com' : undefined)
  
  // Debug: Log environment variables being loaded
  console.log('🔧 Vite Config - Environment Variables:', {
    mode,
    VITE_API_BASE_URL: apiBaseUrl,
    originalValue: env.VITE_API_BASE_URL,
    cwd: process.cwd()
  })
  
  return {
    plugins: [react(), tailwind()],
    server: {
      proxy: {
        // Proxy CoinGecko API requests to avoid CORS issues in development
        '/api/coingecko': {
          target: 'https://api.coingecko.com/api/v3',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/coingecko/, ''),
          headers: {
            'User-Agent': 'Kemi-Crypto-Dashboard/1.0'
          }
        }
      }
    },
    // Define environment variables from the root .env file
    define: {
      'import.meta.env.VITE_API_BASE_URL': JSON.stringify(apiBaseUrl),
      'import.meta.env.VITE_COINGECKO_API_KEY': JSON.stringify(env.VITE_COINGECKO_API_KEY),
      'import.meta.env.VITE_GEMINI_API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY),
      'import.meta.env.DEV': JSON.stringify(mode === 'development'),
      'import.meta.env.PROD': JSON.stringify(mode === 'production'),
    }
  }
})

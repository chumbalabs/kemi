import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwind from '@tailwindcss/vite'
import { join } from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file from parent directory (root of the project)
  const env = loadEnv(mode, join(process.cwd(), '..'), '')
  
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
      'import.meta.env.VITE_API_BASE_URL': JSON.stringify(env.VITE_API_BASE_URL),
      'import.meta.env.VITE_COINGECKO_API_KEY': JSON.stringify(env.VITE_COINGECKO_API_KEY),
      'import.meta.env.VITE_GEMINI_API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY),
      'import.meta.env.DEV': JSON.stringify(mode === 'development'),
      'import.meta.env.PROD': JSON.stringify(mode === 'production'),
    }
  }
})

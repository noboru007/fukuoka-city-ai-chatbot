import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vitejs.dev/config/
export default defineConfig(() => {
  console.log('[Vite Build] Using runtime config (no build-time API keys)');

  return {
    plugins: [
      react(),
      // VitePWA({
      //   registerType: 'autoUpdate',
      //   includeAssets: ['favicon.ico', 'robots.txt', 'apple-touch-icon.png'],
      //   manifest: {
      //     name: 'Fukuoka City AI Chatbot',
      //     short_name: 'FukuokaAI',
      //     description: 'AI Chatbot for Fukuoka City Information',
      //     theme_color: '#ffffff',
      //     start_url: '/',
      //     display: 'standalone',
      //     background_color: '#ffffff',
      //     icons: [
      //       {
      //         src: 'pwa-192x192.png',
      //         sizes: '192x192',
      //         type: 'image/png'
      //       },
      //       {
      //         src: 'pwa-512x512.png',
      //         sizes: '512x512',
      //         type: 'image/png'
      //       }
      //     ]
      //   }
      // })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './'),
      },
    },
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:8080',
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: 'dist',
    },
  };
});
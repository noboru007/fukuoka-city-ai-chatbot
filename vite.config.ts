import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import { fileURLToPath } from 'url';
import net from 'net';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Find a free port starting from `startPort`.
 * Unlike Vite's built-in fallback, this checks BOTH IPv4 and IPv6
 * and ensures the port is truly free (not just TIME_WAIT).
 */
function findFreePort(startPort: number, maxAttempts = 20): Promise<number> {
  return new Promise((resolve, reject) => {
    let attempt = 0;

    function tryPort(port: number) {
      if (attempt >= maxAttempts) {
        reject(new Error(`No free port found after ${maxAttempts} attempts starting from ${startPort}`));
        return;
      }
      attempt++;

      const server = net.createServer();
      server.once('error', () => {
        // Port is in use, try next
        tryPort(port + 1);
      });
      server.once('listening', () => {
        server.close(() => resolve(port));
      });
      // Use exclusive flag to prevent stealing from other processes
      server.listen({ port, host: '127.0.0.1', exclusive: true });
    }

    tryPort(startPort);
  });
}

// https://vitejs.dev/config/
export default defineConfig(async ({ command }) => {
  let port = 5173;
  if (command === 'serve') {
    try {
      port = await findFreePort(5173);
      if (port !== 5173) {
        console.log(`[Vite] Port 5173 in use, using port ${port} instead`);
      }
    } catch (e) {
      console.warn('[Vite] Failed to find free port, falling back to 5173');
    }
  }
  console.log(`[Vite Build] Mode: ${command} (no build-time API keys)`);

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['pwa-192x192.png', 'pwa-512x512.png'],
        manifest: {
          name: 'Fukuoka City AI Chatbot',
          short_name: '福岡AIチャット',
          description: 'Fukuoka City AI Chatbot - 福岡の街についてAIと楽しくおしゃべりしよう！',
          theme_color: '#2563eb',
          background_color: '#1f2937',
          display: 'standalone',
          start_url: '/',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          navigateFallback: '/index.html',
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              urlPattern: /\/api\/.*/i,
              handler: 'NetworkOnly',
            },
          ],
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port,
      strictPort: true, // We already found a free port, so bind strictly
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
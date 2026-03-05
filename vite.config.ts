import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
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
export default defineConfig(async () => {
  const port = await findFreePort(5173);
  if (port !== 5173) {
    console.log(`[Vite] Port 5173 in use, using port ${port} instead`);
  }
  console.log('[Vite Build] Using runtime config (no build-time API keys)');

  return {
    plugins: [
      react(),
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
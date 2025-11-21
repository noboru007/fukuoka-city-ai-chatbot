import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // カレントディレクトリの .env ファイル等を読み込む
  // 第3引数を '' にすることで、VITE_ プレフィックスがない変数もロード可能にする
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  // ビルド時のデバッグログ
  const apiKey = env.API_KEY || process.env.API_KEY || env.GEMINI_API_KEY;
  const fishApiKey = env.FISH_API_KEY || process.env.FISH_API_KEY;
  console.log('[Vite Build] API_KEY found:', apiKey ? `YES (${apiKey.substring(0, 10)}...)` : 'NO');
  console.log('[Vite Build] FISH_API_KEY found:', fishApiKey ? `YES (${fishApiKey.substring(0, 10)}...)` : 'NO');

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './'),
      },
    },
    define: {
      // コード内の process.env.* を、ビルド時の環境変数値に置換する
      'process.env.API_KEY': JSON.stringify(env.API_KEY || process.env.API_KEY || env.GEMINI_API_KEY),
      'process.env.FISH_API_KEY': JSON.stringify(env.FISH_API_KEY || process.env.FISH_API_KEY),
      // Default voice IDs (Japanese)
      'process.env.FISH_AGENT_VOICE_ID': JSON.stringify(env.FISH_AGENT_VOICE_ID || process.env.FISH_AGENT_VOICE_ID),
      'process.env.FISH_GRANDMA_VOICE_ID': JSON.stringify(env.FISH_GRANDMA_VOICE_ID || process.env.FISH_GRANDMA_VOICE_ID),
      // Language-specific voice IDs for all Fish Audio supported languages (13 languages)
      'process.env.FISH_AGENT_VOICE_ID_EN': JSON.stringify(env.FISH_AGENT_VOICE_ID_EN || process.env.FISH_AGENT_VOICE_ID_EN),
      'process.env.FISH_GRANDMA_VOICE_ID_EN': JSON.stringify(env.FISH_GRANDMA_VOICE_ID_EN || process.env.FISH_GRANDMA_VOICE_ID_EN),
      'process.env.FISH_AGENT_VOICE_ID_ZH': JSON.stringify(env.FISH_AGENT_VOICE_ID_ZH || process.env.FISH_AGENT_VOICE_ID_ZH),
      'process.env.FISH_GRANDMA_VOICE_ID_ZH': JSON.stringify(env.FISH_GRANDMA_VOICE_ID_ZH || process.env.FISH_GRANDMA_VOICE_ID_ZH),
      'process.env.FISH_AGENT_VOICE_ID_JA': JSON.stringify(env.FISH_AGENT_VOICE_ID_JA || process.env.FISH_AGENT_VOICE_ID_JA),
      'process.env.FISH_GRANDMA_VOICE_ID_JA': JSON.stringify(env.FISH_GRANDMA_VOICE_ID_JA || process.env.FISH_GRANDMA_VOICE_ID_JA),
      'process.env.FISH_AGENT_VOICE_ID_DE': JSON.stringify(env.FISH_AGENT_VOICE_ID_DE || process.env.FISH_AGENT_VOICE_ID_DE),
      'process.env.FISH_GRANDMA_VOICE_ID_DE': JSON.stringify(env.FISH_GRANDMA_VOICE_ID_DE || process.env.FISH_GRANDMA_VOICE_ID_DE),
      'process.env.FISH_AGENT_VOICE_ID_FR': JSON.stringify(env.FISH_AGENT_VOICE_ID_FR || process.env.FISH_AGENT_VOICE_ID_FR),
      'process.env.FISH_GRANDMA_VOICE_ID_FR': JSON.stringify(env.FISH_GRANDMA_VOICE_ID_FR || process.env.FISH_GRANDMA_VOICE_ID_FR),
      'process.env.FISH_AGENT_VOICE_ID_ES': JSON.stringify(env.FISH_AGENT_VOICE_ID_ES || process.env.FISH_AGENT_VOICE_ID_ES),
      'process.env.FISH_GRANDMA_VOICE_ID_ES': JSON.stringify(env.FISH_GRANDMA_VOICE_ID_ES || process.env.FISH_GRANDMA_VOICE_ID_ES),
      'process.env.FISH_AGENT_VOICE_ID_KO': JSON.stringify(env.FISH_AGENT_VOICE_ID_KO || process.env.FISH_AGENT_VOICE_ID_KO),
      'process.env.FISH_GRANDMA_VOICE_ID_KO': JSON.stringify(env.FISH_GRANDMA_VOICE_ID_KO || process.env.FISH_GRANDMA_VOICE_ID_KO),
      'process.env.FISH_AGENT_VOICE_ID_RU': JSON.stringify(env.FISH_AGENT_VOICE_ID_RU || process.env.FISH_AGENT_VOICE_ID_RU),
      'process.env.FISH_GRANDMA_VOICE_ID_RU': JSON.stringify(env.FISH_GRANDMA_VOICE_ID_RU || process.env.FISH_GRANDMA_VOICE_ID_RU),
      'process.env.FISH_AGENT_VOICE_ID_IT': JSON.stringify(env.FISH_AGENT_VOICE_ID_IT || process.env.FISH_AGENT_VOICE_ID_IT),
      'process.env.FISH_GRANDMA_VOICE_ID_IT': JSON.stringify(env.FISH_GRANDMA_VOICE_ID_IT || process.env.FISH_GRANDMA_VOICE_ID_IT),
      'process.env.FISH_AGENT_VOICE_ID_PT': JSON.stringify(env.FISH_AGENT_VOICE_ID_PT || process.env.FISH_AGENT_VOICE_ID_PT),
      'process.env.FISH_GRANDMA_VOICE_ID_PT': JSON.stringify(env.FISH_GRANDMA_VOICE_ID_PT || process.env.FISH_GRANDMA_VOICE_ID_PT),
      // Note: Arabic (AR), Dutch (NL), Polish (PL) are supported by Fish Audio but not in our Language type yet
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
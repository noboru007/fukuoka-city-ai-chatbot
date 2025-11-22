// Runtime configuration loader
// Fetches environment variables from server at runtime

interface Config {
  API_KEY: string | null;
  FISH_API_KEY: string | null;
  FISH_AGENT_VOICE_ID: string | null;
  FISH_GRANDMA_VOICE_ID: string | null;
  FISH_AGENT_VOICE_ID_EN: string | null;
  FISH_GRANDMA_VOICE_ID_EN: string | null;
  FISH_AGENT_VOICE_ID_KR: string | null;
  FISH_GRANDMA_VOICE_ID_KR: string | null;
  FISH_AGENT_VOICE_ID_ZH: string | null;
  FISH_GRANDMA_VOICE_ID_ZH: string | null;
  FISH_AGENT_VOICE_ID_ES: string | null;
  FISH_GRANDMA_VOICE_ID_ES: string | null;
  FISH_AGENT_VOICE_ID_FR: string | null;
  FISH_GRANDMA_VOICE_ID_FR: string | null;
  FISH_AGENT_VOICE_ID_DE: string | null;
  FISH_GRANDMA_VOICE_ID_DE: string | null;
}

let cachedConfig: Config | null = null;
let configPromise: Promise<Config> | null = null;

export const getConfig = async (): Promise<Config> => {
  // Return cached config if available
  if (cachedConfig) {
    return cachedConfig;
  }

  // Return existing promise if config is being fetched
  if (configPromise) {
    return configPromise;
  }

  // Fetch config from server
  configPromise = fetch('/api/config')
    .then(res => {
      if (!res.ok) {
        throw new Error(`Failed to fetch config: ${res.status}`);
      }
      return res.json();
    })
    .then(config => {
      cachedConfig = config;
      configPromise = null;
      console.log('[Config] Loaded runtime config:', {
        API_KEY: config.API_KEY ? 'YES' : 'NO',
        FISH_API_KEY: config.FISH_API_KEY ? 'YES' : 'NO',
      });
      return config;
    })
    .catch(error => {
      console.error('[Config] Failed to load config:', error);
      configPromise = null;
      throw error;
    });

  return configPromise;
};

// Helper to get specific config value with type safety
export const getConfigValue = async (key: keyof Config): Promise<string | null> => {
  const config = await getConfig();
  return config[key];
};


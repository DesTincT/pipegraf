import type { BotAdapter } from '../types.js';
import { createMaxReplyApi } from './reply-api.js';
import { createMaxBotApi } from './client.js';
import { createMaxPollingController } from './polling.js';

export { Keyboard } from './keyboard.js';

export interface MaxAdapterConfig {
  token: string;
}

export function createMaxAdapter(config: MaxAdapterConfig): BotAdapter {
  const { token } = config;

  return {
    createReplyApi(): ReturnType<typeof createMaxReplyApi> {
      const api = createMaxBotApi({ token });
      return createMaxReplyApi(api);
    },

    createPollingController(bot, pollConfig) {
      return createMaxPollingController(bot, {
        token,
        intervalMs: pollConfig.intervalMs,
        dedupeTtlMs: pollConfig.dedupeTtlMs,
        dedupeMaxSize: pollConfig.dedupeMaxSize as number | undefined,
        sdk: pollConfig.sdk,
      });
    },
  };
}

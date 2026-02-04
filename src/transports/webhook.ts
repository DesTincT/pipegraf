import type { UpdateHandler } from '../core/types.js';

export interface WebhookOptions {
  onError?: (err: unknown, update: unknown) => unknown | Promise<unknown>;
}

export type WebhookCallback = (update: unknown) => Promise<void>;

export function createWebhookCallback(bot: UpdateHandler, options: WebhookOptions = {}): WebhookCallback {
  return async (update) => {
    try {
      await bot.handleUpdate(update);
    } catch (err) {
      if (options.onError) {
        await options.onError(err, update);
        return;
      }
      throw err;
    }
  };
}

import type { BotAdapter, ReplyApi, ReplyTarget } from '../types.js';
import { createPollingController, type PollingController } from '../../transports/polling.js';
import type { UpdateHandler } from '../../core/types.js';

function createMockReplyApi(): ReplyApi {
  return {
    getReplyTargetFromUpdate(update: unknown): ReplyTarget | undefined {
      if (update && typeof update === 'object' && 'chat_id' in update && typeof (update as { chat_id: unknown }).chat_id === 'number') {
        return { chatId: (update as { chat_id: number }).chat_id };
      }
      return { chatId: 1 };
    },
    async sendReply(target: ReplyTarget, text: string, _extra?: unknown): Promise<unknown> {
      console.log(`[reply] chatId=${target.chatId} text=${text}`);
      return undefined;
    },
  };
}

export function createMockAdapter(): BotAdapter {
  return {
    createReplyApi(): ReplyApi {
      return createMockReplyApi();
    },
    createPollingController(bot: UpdateHandler, config): { controller: PollingController; api: ReplyApi } {
      const updates: readonly unknown[] = [
        { update_id: 1, chat_id: 1, message: { text: '/start' } },
        { update_id: 2, chat_id: 1, message: { text: 'hi' } },
        { update_id: 3, chat_id: 1, message: { text: '/hipster' } },
      ];
      let cursor = 0;
      const replyApi = createMockReplyApi();
      const controller = createPollingController(bot, {
        intervalMs: config.intervalMs ?? 250,
        getUpdates: async ({ offset, signal }) => {
          if (signal.aborted) return [];
          if (offset !== undefined) {
            while (cursor < updates.length && (updates[cursor] as { update_id: number })?.update_id < offset) cursor += 1;
          }
          const batch = cursor < updates.length ? [updates[cursor]] : [];
          cursor += batch.length;
          return batch;
        },
      });
      return { controller, api: replyApi };
    },
  };
}

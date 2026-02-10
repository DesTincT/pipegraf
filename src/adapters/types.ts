import type { PollingController } from '../transports/polling.js';
import type { UpdateHandler } from '../core/types.js';

export interface ReplyTarget {
  chatId: number;
}

export interface ReplyApi {
  getReplyTargetFromUpdate(update: unknown): ReplyTarget | undefined;
  sendReply(target: ReplyTarget, text: string, extra?: unknown): Promise<unknown>;
}

export interface PollingConfig {
  intervalMs?: number;
  dedupeTtlMs?: number;
  [key: string]: unknown;
}

export interface BotAdapter {
  createReplyApi(config: Record<string, unknown>): ReplyApi;
  createPollingController?(
    bot: UpdateHandler,
    config: PollingConfig,
  ): { controller: PollingController; api?: ReplyApi };
}

import { Bot as MaxBotSdk } from '@maxhub/max-bot-api';

import type { UpdateHandler } from '../core/types.js';
import { getNestedRecord, getNumber, isRecord } from '../utils/index.js';
import { createPollingController, type PollingController } from './polling.js';

type MaxSdkLike = {
  api: unknown;
};

type MaxApiGetUpdates = (a?: unknown, b?: unknown) => Promise<unknown>;

type MaxApiLike = {
  getUpdates: MaxApiGetUpdates;
};

function hasGetUpdates(api: unknown): api is MaxApiLike {
  return isRecord(api) && typeof api['getUpdates'] === 'function';
}

function normalizeMaxUpdate(raw: unknown): unknown {
  if (!isRecord(raw)) return raw;

  const updateId = getNumber(raw['update_id']);
  const updateType = typeof raw['update_type'] === 'string' ? raw['update_type'] : undefined;
  const timestamp = getNumber(raw['timestamp']);

  const chatId =
    getNumber(raw['chat_id']) ??
    (() => {
      const msg = getNestedRecord(raw, 'message');
      const recipient = msg ? getNestedRecord(msg, 'recipient') : undefined;
      return recipient ? getNumber(recipient['chat_id']) : undefined;
    })();

  const messageText =
    (() => {
      const msg = getNestedRecord(raw, 'message');
      if (!msg) return undefined;

      const direct = msg['text'];
      if (typeof direct === 'string') return direct;

      const body = getNestedRecord(msg, 'body');
      const text = body ? body['text'] : undefined;
      return typeof text === 'string' ? text : undefined;
    })() ?? undefined;

  const callbackData =
    (() => {
      const direct = getNestedRecord(raw, 'callback_query');
      const directData = direct ? direct['data'] : undefined;
      if (typeof directData === 'string') return directData;

      const cb = getNestedRecord(raw, 'callback');
      const payload = cb ? cb['payload'] : undefined;
      return typeof payload === 'string' ? payload : undefined;
    })() ?? undefined;

  const normalized: Record<string, unknown> = {
    ...(updateId === undefined ? {} : { update_id: updateId }),
    ...(updateType === undefined ? {} : { update_type: updateType }),
    ...(timestamp === undefined ? {} : { timestamp }),
    ...(chatId === undefined ? {} : { chat_id: chatId }),
    ...(messageText === undefined
      ? {}
      : {
          message: {
            text: messageText,
            recipient: { chat_id: chatId },
          },
        }),
    ...(callbackData === undefined ? {} : { callback_query: { data: callbackData } }),
  };

  return normalized;
}

export type MaxPollingLaunchOptions = {
  token: string;
  intervalMs?: number;
  dedupeTtlMs?: number;
  dedupeMaxSize?: number;
  sdk?: unknown; // test/advanced override
};

export type MaxPollingController = {
  controller: PollingController;
  sdk: unknown;
  api: unknown;
};

export function createMaxPollingController(bot: UpdateHandler, options: MaxPollingLaunchOptions): MaxPollingController {
  const sdk: unknown = options.sdk ?? new MaxBotSdk(options.token);
  if (!isRecord(sdk) || !('api' in sdk)) {
    throw new Error('NotImplemented');
  }

  const api = (sdk as MaxSdkLike).api;
  if (!hasGetUpdates(api)) {
    throw new Error('NotImplemented');
  }

  let marker: unknown = undefined;

  const controller = createPollingController(bot, {
    intervalMs: options.intervalMs,
    dedupe: {
      ttlMs: options.dedupeTtlMs,
      maxSize: options.dedupeMaxSize,
    },
    getUpdates: async ({ signal }) => {
      if (signal.aborted) return [];

      const res = await api.getUpdates(undefined, marker === undefined ? undefined : { marker });
      if (!isRecord(res)) return [];

      marker = res['marker'];
      const updates = res['updates'];
      if (!Array.isArray(updates)) return [];
      return updates.map(normalizeMaxUpdate);
    },
  });

  return { controller, sdk, api };
}


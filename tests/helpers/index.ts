import { Maxgraf } from '../../src/core/maxgraf.js';
import type { ReplySender } from '../../src/core/context.js';

export type MockUpdateType = 'text' | 'message' | 'callback_query' | 'inline_query';

export interface MockUpdatePayloadByType {
  text: { text: string; chat_id?: number; user_id?: number };
  message: { message: Record<string, unknown>; chat_id?: number; user_id?: number };
  callback_query: { payload: string; chat_id?: number; user_id?: number };
  inline_query: { query: string; chat_id?: number; user_id?: number };
}

export function createMockUpdate(type: 'text', payload: MockUpdatePayloadByType['text']): unknown;
export function createMockUpdate(type: 'message', payload: MockUpdatePayloadByType['message']): unknown;
export function createMockUpdate(type: 'callback_query', payload: MockUpdatePayloadByType['callback_query']): unknown;
export function createMockUpdate(type: 'inline_query', payload: MockUpdatePayloadByType['inline_query']): unknown;
export function createMockUpdate(type: MockUpdateType, payload: MockUpdatePayloadByType[MockUpdateType]): unknown {
  if (type === 'text') {
    const p = payload as MockUpdatePayloadByType['text'];
    return {
      message: { text: p.text },
      ...(p.chat_id === undefined ? {} : { chat_id: p.chat_id }),
      ...(p.user_id === undefined ? {} : { user_id: p.user_id }),
    };
  }

  if (type === 'message') {
    const p = payload as MockUpdatePayloadByType['message'];
    return {
      message: p.message,
      ...(p.chat_id === undefined ? {} : { chat_id: p.chat_id }),
      ...(p.user_id === undefined ? {} : { user_id: p.user_id }),
    };
  }

  if (type === 'callback_query') {
    const p = payload as MockUpdatePayloadByType['callback_query'];
    return {
      callback_query: { payload: p.payload },
      ...(p.chat_id === undefined ? {} : { chat_id: p.chat_id }),
      ...(p.user_id === undefined ? {} : { user_id: p.user_id }),
    };
  }

  const p = payload as MockUpdatePayloadByType['inline_query'];
  return {
    inline_query: { query: p.query },
    ...(p.chat_id === undefined ? {} : { chat_id: p.chat_id }),
    ...(p.user_id === undefined ? {} : { user_id: p.user_id }),
  };
}

export interface CreateTestBotOptions {
  senderSpy?: ReplySender;
}

export function createTestBot(options: CreateTestBotOptions = {}): {
  bot: Maxgraf;
  senderSpy: ReplySender;
  senderCalls: readonly { text: string; extra: unknown }[];
} {
  const senderCalls: { text: string; extra: unknown }[] = [];

  const senderSpy: ReplySender =
    options.senderSpy ??
    (async (_ctx, text, extra) => {
      senderCalls.push({ text, extra });
      return undefined;
    });

  const bot = new Maxgraf({ sender: senderSpy });
  return { bot, senderSpy, senderCalls };
}

export async function feedUpdate(
  bot: { handleUpdate: (update: unknown) => Promise<unknown> },
  update: unknown,
): Promise<unknown> {
  return await bot.handleUpdate(update);
}

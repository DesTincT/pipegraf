import { describe, expect, it } from 'vitest';

import type { Message } from '@maxhub/max-bot-api/types';

import { Context } from '../src/core/context.js';
import type { MaxBotApi } from '../src/max/sdk.js';

function makeMessage(chatId: number, text: string): Message {
  return {
    recipient: { chat_id: chatId, chat_type: 'chat' },
    timestamp: 0,
    body: { mid: 'm', seq: 0, text, attachments: null },
    constructor: null,
  };
}

describe('Context.reply (MAX SDK binding)', () => {
  it('calls api.sendMessageToChat using chat_id from update', async () => {
    const calls: { chatId: number; text: string }[] = [];

    const api: MaxBotApi = {
      sendMessageToChat: async (chatId, text) => {
        calls.push({ chatId, text });
        return makeMessage(chatId, text);
      },
    };

    const ctx = new Context({ update_type: 'bot_started', timestamp: 0, chat_id: 123 }, { maxApi: api });
    await ctx.reply('hi');

    expect(calls).toEqual([{ chatId: 123, text: 'hi' }]);
  });

  it('throws NotImplemented when chat_id cannot be inferred', async () => {
    const api: MaxBotApi = {
      sendMessageToChat: async (chatId, text) => makeMessage(chatId, text),
    };

    const ctx = new Context({ update_type: 'message_constructed', timestamp: 0 }, { maxApi: api });
    await expect(ctx.reply('hi')).rejects.toThrow('NotImplemented');
  });
});


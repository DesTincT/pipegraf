import { describe, expect, it } from 'vitest';

import type { Message } from '@maxhub/max-bot-api/types';
import { Context } from '../../../src/core/context.js';
import type { ReplyApi } from '../../../src/adapters/types.js';

function makeMessage(chatId: number, text: string): Message {
  return {
    recipient: { chat_id: chatId, chat_type: 'chat' },
    timestamp: 0,
    body: { mid: 'm', seq: 0, text, attachments: null },
    constructor: null,
  };
}

describe('Context.reply (ReplyApi binding)', () => {
  it('calls replyApi.sendReply using target from getReplyTargetFromUpdate', async () => {
    const calls: { target: { chatId: number }; text: string; extra: unknown }[] = [];

    const replyApi: ReplyApi = {
      getReplyTargetFromUpdate: (update) => {
        if (update && typeof update === 'object' && 'chat_id' in update && typeof (update as { chat_id: number }).chat_id === 'number') {
          return { chatId: (update as { chat_id: number }).chat_id };
        }
        return undefined;
      },
      sendReply: async (target, text, extra) => {
        calls.push({ target, text, extra });
        return makeMessage(target.chatId, text);
      },
    };

    const ctx = new Context(
      { update_type: 'bot_started', timestamp: 0, chat_id: 123 },
      { replyApi },
    );
    await ctx.reply('hi', {
      attachments: [
        {
          type: 'inline_keyboard',
          payload: {
            buttons: [[{ type: 'link', text: 't', url: 'https://example.com' }]],
          },
        },
      ],
    });

    expect(calls).toEqual([
      {
        target: { chatId: 123 },
        text: 'hi',
        extra: {
          attachments: [
            {
              type: 'inline_keyboard',
              payload: {
                buttons: [[{ type: 'link', text: 't', url: 'https://example.com' }]],
              },
            },
          ],
        },
      },
    ]);
  });

  it('throws NotImplemented when getReplyTargetFromUpdate returns undefined', async () => {
    const replyApi: ReplyApi = {
      getReplyTargetFromUpdate: () => undefined,
      sendReply: async () => makeMessage(0, ''),
    };

    const ctx = new Context({ update_type: 'message_constructed', timestamp: 0 }, { replyApi });
    await expect(ctx.reply('hi')).rejects.toThrow('NotImplemented');
  });
});

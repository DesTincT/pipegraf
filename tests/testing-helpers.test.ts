import { describe, expect, it } from 'vitest';

import { Composer } from '../src/core/composer.js';
import { createMockUpdate, createTestBot, feedUpdate } from './helpers/index.js';

describe('testing helpers', () => {
  it('createMockUpdate(text) produces an update usable by routing + ctx.reply', async () => {
    const { bot, senderCalls } = createTestBot();

    bot.use(
      Composer.on('text', async (ctx) => {
        await ctx.reply(String(ctx.messageText));
      }),
    );

    await feedUpdate(bot, createMockUpdate('text', { text: 'hi', chat_id: 1, user_id: 2 }));

    expect(senderCalls).toEqual([{ text: 'hi', extra: undefined }]);
  });

  it('createTestBot can accept a custom senderSpy', async () => {
    const calls: string[] = [];
    const { bot } = createTestBot({
      senderSpy: async (_ctx, text) => {
        calls.push(text);
      },
    });

    bot.use(Composer.on('text', async (ctx) => await ctx.reply('ok')));
    await feedUpdate(bot, createMockUpdate('text', { text: 'x' }));

    expect(calls).toEqual(['ok']);
  });
});


import { describe, expect, it } from 'vitest';

import { createReferenceAdapter } from '../src/adapters/reference-adapter/index.js';
import { Bot } from '../src/core/bot.js';
import { createMaxAdapter } from '../src/adapters/max/index.js';

describe('Bot.launch / stop', () => {
  it('constructs with sender and can handleUpdate', async () => {
    const bot = new Bot({
      sender: async (_ctx, text) => `sent:${text}`,
      createAdapter: createReferenceAdapter,
    });

    bot.on('text', async (ctx) => {
      const result = await ctx.reply('hi');
      expect(result).toBe('sent:hi');
    });

    await bot.handleUpdate({ message: { text: 'hello' }, chat_id: 1 });
  });

  it('launch({ polling }) processes normalized updates and stop() stops polling', async () => {
    const updates = [
      {
        update_id: 1,
        chat_id: 123,
        message: { body: { text: 'hi' }, recipient: { chat_id: 123 } },
      },
    ];

    let getUpdatesCalls = 0;
    const sdk = {
      api: {
        getUpdates: async () => {
          getUpdatesCalls += 1;
          return { marker: String(getUpdatesCalls), updates: getUpdatesCalls === 1 ? updates : [] };
        },
        sendMessageToChat: async () => ({}),
      },
    };

    const seen: string[] = [];
    let resolveProcessed: (() => void) | undefined;
    const processed = new Promise<void>((resolve) => {
      resolveProcessed = resolve;
    });

    const bot = new Bot({
      adapter: createMaxAdapter({ token: 'token' }),
      adapterConfig: {},
      sdk,
    });

    bot.hears('hi', async () => {
      seen.push('hi');
      resolveProcessed?.();
    });

    await bot.launch({ polling: { intervalMs: 0, dedupeTtlMs: 60_000 } });

    await processed;
    await bot.stop();

    expect(seen).toEqual(['hi']);
    expect(getUpdatesCalls).toBeGreaterThan(0);
  });
});

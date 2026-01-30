import { describe, expect, it } from 'vitest';

import { Maxgraf } from '../src/core/maxgraf.js';

describe('Maxgraf.launch / stop', () => {
  it('constructs with token and can handleUpdate with injected sender', async () => {
    const bot = new Maxgraf('token', {
      sender: async (_ctx, text) => `sent:${text}`,
    });

    bot.on('text', async (ctx) => {
      const result = await ctx.reply('hi');
      expect(result).toBe('sent:hi');
    });

    await bot.handleUpdate({ message: { text: 'hello' } });
  });

  it('launch({ polling }) processes normalized MAX updates and stop() stops polling', async () => {
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
        sendMessageToChat: async () => ({}) as unknown,
      },
    };

    const seen: string[] = [];
    let resolveProcessed: (() => void) | undefined;
    const processed = new Promise<void>((resolve) => {
      resolveProcessed = resolve;
    });

    const bot = new Maxgraf('token', {
      sdk,
      sender: async () => undefined,
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


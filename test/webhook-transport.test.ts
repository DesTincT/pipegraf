import { describe, expect, it } from 'vitest';

import { Maxgraf } from '../src/core/maxgraf.js';

describe('webhook transport', () => {
  it('webhookCallback invokes handleUpdate', async () => {
    const bot = new Maxgraf();
    const calls: unknown[] = [];

    bot.use(async (ctx) => {
      calls.push(ctx.update);
    });

    const webhook = bot.webhookCallback();
    await webhook({ message: { text: 'hi' } });

    expect(calls).toEqual([{ message: { text: 'hi' } }]);
  });

  it('webhookCallback calls onError when handleUpdate throws', async () => {
    const bot = new Maxgraf();
    bot.use(async () => {
      throw new Error('boom');
    });

    const handled: Array<{ err: unknown; update: unknown }> = [];

    const webhook = bot.webhookCallback({
      onError: (err, update) => {
        handled.push({ err, update });
      },
    });

    await webhook({ update_id: 1 });

    expect(handled).toHaveLength(1);
    expect((handled[0]?.err as Error).message).toBe('boom');
    expect(handled[0]?.update).toEqual({ update_id: 1 });
  });
});


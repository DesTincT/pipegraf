import { describe, expect, it } from 'vitest';

import { createCanonicalAdapter } from '../src/core/canonical-adapter.js';
import { Bot } from '../src/core/bot.js';

const testAdapter = createCanonicalAdapter(async () => undefined);

describe('webhook transport', () => {
  it('webhookCallback invokes handleUpdate', async () => {
    const bot = new Bot({ adapter: testAdapter });
    const calls: unknown[] = [];

    bot.use(async (ctx) => {
      calls.push(ctx.update);
    });

    const webhook = bot.webhookCallback();
    await webhook({ message: { text: 'hi' } });

    expect(calls).toEqual([{ message: { text: 'hi' } }]);
  });

  it('webhookCallback calls onError when handleUpdate throws', async () => {
    const bot = new Bot({ adapter: testAdapter });
    bot.use(async () => {
      throw new Error('boom');
    });

    const handled: { err: unknown; update: unknown }[] = [];

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

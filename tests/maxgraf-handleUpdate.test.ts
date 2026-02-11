import { describe, expect, it } from 'vitest';

import { createCanonicalAdapter } from '../src/core/canonical-adapter.js';
import { Bot } from '../src/core/bot.js';
import { Composer } from '../src/core/composer.js';

const testAdapter = createCanonicalAdapter(async () => undefined);

describe('Bot.handleUpdate', () => {
  it('runs middleware in deterministic order', async () => {
    const calls: string[] = [];
    const bot = new Bot({ adapter: testAdapter });

    bot.use(async (_ctx, next) => {
      calls.push('a:before');
      await next();
      calls.push('a:after');
    });

    bot.use(async (_ctx, next) => {
      calls.push('b:before');
      await next();
      calls.push('b:after');
    });

    await bot.handleUpdate({ message: { text: 'hi' } });

    expect(calls).toEqual(['a:before', 'b:before', 'b:after', 'a:after']);
  });

  it('bubbles errors by default', async () => {
    const bot = new Bot({ adapter: testAdapter });
    bot.use(async () => {
      throw new Error('boom');
    });

    await expect(bot.handleUpdate({})).rejects.toThrow('boom');
  });

  it('delegates errors to .catch(handler)', async () => {
    const bot = new Bot({ adapter: testAdapter });
    let handled: { err: unknown; update: unknown } | undefined;

    bot.catch((err, ctx) => {
      handled = { err, update: ctx.update };
    });

    bot.use(async () => {
      throw new Error('boom');
    });

    await bot.handleUpdate({ message: { text: 'hi' } });

    expect(handled).toBeDefined();
    expect((handled?.err as Error).message).toBe('boom');
    expect(handled?.update).toEqual({ message: { text: 'hi' } });
  });

  it('injects sender for ctx.reply and throws NotImplemented by default', async () => {
    const bot = new Bot({
      sender: async (_ctx, text) => `sent:${text}`,
    });

    bot.use(
      Composer.on('text', async (ctx) => {
        const result = await ctx.reply('hi');
        expect(result).toBe('sent:hi');
      }),
    );

    await bot.handleUpdate({ message: { text: 'hello' } });

    const noReplyAdapter = createCanonicalAdapter(async () => {
      throw new Error('NotImplemented');
    });
    const bot2 = new Bot({ adapter: noReplyAdapter });
    bot2.use(Composer.on('text', async (ctx) => await ctx.reply('hi')));
    await expect(bot2.handleUpdate({ message: { text: 'hello' } })).rejects.toThrow('NotImplemented');
  });
});

import { describe, expect, it } from 'vitest';

import { Maxgraf } from '../src/core/maxgraf.js';
import { Composer } from '../src/core/composer.js';

describe('Maxgraf.handleUpdate', () => {
  it('runs middleware in deterministic order', async () => {
    const calls: string[] = [];
    const bot = new Maxgraf();

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
    const bot = new Maxgraf();
    bot.use(async () => {
      throw new Error('boom');
    });

    await expect(bot.handleUpdate({})).rejects.toThrow('boom');
  });

  it('delegates errors to .catch(handler)', async () => {
    const bot = new Maxgraf();
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
    const bot = new Maxgraf({
      sender: async (_ctx, text) => `sent:${text}`,
    });

    bot.use(Composer.on('text', async (ctx) => {
      const result = await ctx.reply('hi');
      expect(result).toBe('sent:hi');
    }));

    await bot.handleUpdate({ message: { text: 'hello' } });

    const bot2 = new Maxgraf();
    bot2.use(Composer.on('text', async (ctx) => await ctx.reply('hi')));
    await expect(bot2.handleUpdate({ message: { text: 'hello' } })).rejects.toThrow('NotImplemented');
  });
});

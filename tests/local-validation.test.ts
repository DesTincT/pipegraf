import { describe, expect, it } from 'vitest';

import { createReferenceAdapter } from '../src/adapters/reference-adapter/index.js';
import { Composer } from '../src/core/composer.js';
import { Bot } from '../src/core/bot.js';

interface FakeMessageUpdate {
  type: 'message_created';
  message: {
    text: string;
  };
}

function msg(text: string): FakeMessageUpdate {
  return { type: 'message_created', message: { text } };
}

describe('local validation (v0.1)', () => {
  it('validates routing, slash-only commands, middleware order, error boundary, and reply (local)', async () => {
    const calls: string[] = [];
    const replies: { text: string; extra: unknown }[] = [];
    let caught = 0;

    const bot = new Bot({
      sender: async (_ctx, text, extra) => {
        replies.push({ text, extra });
      },
      createAdapter: createReferenceAdapter,
    });

    bot.catch(() => {
      caught += 1;
    });

    bot.use(async (_ctx, next) => {
      calls.push('global:before');
      await next();
      calls.push('global:after');
    });

    bot.start(async () => {
      calls.push('start');
    });

    bot.help(async () => {
      calls.push('help');
    });

    bot.use(
      Composer.command('hipster', async () => {
        calls.push('hipster');
      }),
    );

    bot.use(
      Composer.hears('hi', async (ctx) => {
        calls.push('hears:hi');
        await ctx.reply('hi-back', { local: true });
      }),
    );

    // 1) Command handling
    await bot.handleUpdate(msg('/start'));
    await bot.handleUpdate(msg('/help'));
    await bot.handleUpdate(msg('/hipster'));
    await bot.handleUpdate(msg('start'));
    await bot.handleUpdate(msg('/start foo bar'));

    expect(calls).toContain('start');
    expect(calls).toContain('help');
    expect(calls).toContain('hipster');
    expect(calls.filter((c) => c === 'start')).toHaveLength(2);

    // 2) hears()
    await bot.handleUpdate(msg('hi'));
    await bot.handleUpdate(msg('hello'));
    expect(calls.filter((c) => c === 'hears:hi')).toHaveLength(1);

    // 3) Middleware order (global wraps handlers deterministically)
    const startTrace: string[] = [];
    const orderAdapter = createReferenceAdapter(async () => undefined);
    const orderBot = new Bot({ adapter: orderAdapter });
    orderBot.use(async (_ctx, next) => {
      startTrace.push('global:before');
      await next();
      startTrace.push('global:after');
    });
    orderBot.start(async () => {
      startTrace.push('start');
    });
    await orderBot.handleUpdate(msg('/start'));
    expect(startTrace).toEqual(['global:before', 'start', 'global:after']);

    // 4) Error handling
    const errorAdapter = createReferenceAdapter(async () => undefined);
    const errorBot = new Bot({ adapter: errorAdapter });
    let errorCaught = 0;
    errorBot.catch(() => {
      errorCaught += 1;
    });
    errorBot.use(async () => {
      throw new Error('boom');
    });
    await errorBot.handleUpdate(msg('/start'));
    await errorBot.handleUpdate(msg('/start'));
    expect(errorCaught).toBe(2);

    // 5) ctx.reply behavior (local) + Bot.reply middleware
    const replyBot = new Bot({
      sender: async (_ctx, text, extra) => {
        replies.push({ text, extra });
      },
      createAdapter: createReferenceAdapter,
    });
    replyBot.start(Bot.reply('hello'));
    await replyBot.handleUpdate(msg('/start'));
    expect(replies).toEqual(
      expect.arrayContaining([
        { text: 'hi-back', extra: { local: true } },
        { text: 'hello', extra: undefined },
      ]),
    );

    expect(caught).toBe(0);
  });
});

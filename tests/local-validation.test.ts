import { describe, expect, it } from 'vitest';

import { Composer } from '../src/core/composer.js';
import { Maxgraf } from '../src/core/maxgraf.js';

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

    const bot = new Maxgraf({
      sender: async (_ctx, text, extra) => {
        replies.push({ text, extra });
      },
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
    const orderBot = new Maxgraf();
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
    const errorBot = new Maxgraf();
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

    // 5) ctx.reply behavior (local) + Maxgraf.reply middleware
    const replyBot = new Maxgraf({
      sender: async (_ctx, text, extra) => {
        replies.push({ text, extra });
      },
    });
    replyBot.start(Maxgraf.reply('hello'));
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

import { describe, expect, it } from 'vitest';

import { Maxgraf } from '../src/core/maxgraf.js';
import { session } from '../src/middleware/session.js';

function msg(text: string, chatId?: number, userId?: number): unknown {
  return {
    message: { text },
    ...(chatId === undefined ? {} : { chat_id: chatId }),
    ...(userId === undefined ? {} : { user_id: userId }),
  };
}

describe('session middleware', () => {
  it('same chat+user key persists across updates', async () => {
    interface S {
      count?: number;
    }

    const bot = new Maxgraf({ sender: async () => undefined });
    bot.use(session<S>());

    bot.start(async (ctx) => {
      const s = ctx.session as unknown as S;
      s.count = (s.count ?? 0) + 1;
    });

    await bot.handleUpdate(msg('/start', 1, 2));
    await bot.handleUpdate(msg('/start', 1, 2));

    const ctxProbe: { value?: unknown } = {};
    bot.use(async (ctx) => {
      ctxProbe.value = ctx.session;
    });
    await bot.handleUpdate(msg('noop', 1, 2));

    expect(ctxProbe.value).toEqual(expect.objectContaining({ count: 2 }));
  });

  it('different keys are isolated', async () => {
    const bot = new Maxgraf({ sender: async () => undefined });
    bot.use(session<{ seen?: string }>());

    bot.use(async (ctx, next) => {
      const text = ctx.messageText;
      if (text !== undefined) {
        const s = ctx.session as unknown as { seen?: string };
        if (s.seen === undefined) {
          s.seen = text;
        }
      }
      await next();
    });

    await bot.handleUpdate(msg('a', 1, 1));
    await bot.handleUpdate(msg('b', 1, 2));

    const seen: string[] = [];
    bot.use(async (ctx) => {
      seen.push(String((ctx.session ?? {})['seen']));
    });

    await bot.handleUpdate(msg('x', 1, 1));
    await bot.handleUpdate(msg('y', 1, 2));

    expect(seen).toEqual(['a', 'b']);
  });

  it('middleware order: ctx.session exists only after session middleware', async () => {
    const traces: ('before' | 'after')[] = [];

    const bot = new Maxgraf({ sender: async () => undefined });
    bot.use(async (ctx, next) => {
      if (ctx.session === undefined) traces.push('before');
      await next();
    });
    bot.use(session());
    bot.use(async (ctx) => {
      if (ctx.session !== undefined) traces.push('after');
    });

    await bot.handleUpdate(msg('hi', 1, 1));

    expect(traces).toEqual(['before', 'after']);
  });

  it('missing key uses fallback and persists across updates', async () => {
    const bot = new Maxgraf({ sender: async () => undefined });
    bot.use(session<{ n?: number }>({ fallbackKey: 'global' }));

    bot.use(async (ctx, next) => {
      const s = ctx.session as unknown as { n?: number };
      s.n = (s.n ?? 0) + 1;
      await next();
    });

    await bot.handleUpdate({ message: { text: 'one' } });
    await bot.handleUpdate({ message: { text: 'two' } });

    const probe: { value?: unknown } = {};
    bot.use(async (ctx) => {
      probe.value = ctx.session;
    });
    await bot.handleUpdate({ message: { text: 'three' } });

    expect(probe.value).toEqual(expect.objectContaining({ n: 3 }));
  });
});

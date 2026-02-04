import { describe, expect, it } from 'vitest';

import { compose } from '../src/core/compose.js';
import { Composer } from '../src/core/composer.js';
import { Context } from '../src/core/context.js';

describe('Composer routing', () => {
  it('on(text) runs only for message with text', async () => {
    const calls: string[] = [];

    const fn = compose<Context>([
      Composer.on('text', async (_ctx) => {
        calls.push('text');
      }),
      async (_ctx) => {
        calls.push('fallback');
      },
    ]);

    await fn(new Context({ message: { text: 'hi' } }));
    await fn(new Context({ message: { caption: 'nope' } }));

    expect(calls).toEqual(['text', 'fallback']);
  });

  it('hears matches string and sets ctx.match', async () => {
    const calls: string[] = [];
    const ctx = new Context({ message: { text: 'hi' } });

    const fn = compose<Context>([
      Composer.hears('hi', async (ctx2) => {
        calls.push('hit');
        expect(ctx2.match).toEqual(['hi']);
      }),
      async () => {
        calls.push('fallback');
      },
    ]);

    await fn(ctx);

    expect(calls).toEqual(['hit']);
  });

  it('hears matches regex and sets ctx.match', async () => {
    const ctx = new Context({ message: { text: 'hello world' } });

    const fn = compose<Context>([
      Composer.hears(/^hello (.+)$/, async (ctx2) => {
        expect(ctx2.match?.[1]).toBe('world');
      }),
    ]);

    await fn(ctx);
  });

  it('action matches callback query payload and sets ctx.match', async () => {
    const ctx = new Context({ callback_query: { payload: 'ok:1' } });
    const calls: string[] = [];

    const fn = compose<Context>([
      Composer.action(/^ok:(\d+)$/, async (ctx2) => {
        calls.push('hit');
        expect(ctx2.match?.[1]).toBe('1');
      }),
      async () => {
        calls.push('fallback');
      },
    ]);

    await fn(ctx);
    expect(calls).toEqual(['hit']);
  });

  it('command matches only with leading slash and sets ctx.command + ctx.payload', async () => {
    const ctx = new Context({
      message: {
        text: '/start hello',
      },
    });

    const fn = compose<Context>([
      Composer.command('start', async (ctx2) => {
        expect(ctx2.command).toBe('start');
        expect(ctx2.payload).toBe('hello');
      }),
    ]);

    await fn(ctx);
  });

  it('command does not match without leading slash', async () => {
    const calls: string[] = [];

    const fn = compose<Context>([
      Composer.command('start', async () => {
        calls.push('hit');
      }),
      async () => {
        calls.push('fallback');
      },
    ]);

    await fn(new Context({ message: { text: 'start hello' } }));

    expect(calls).toEqual(['fallback']);
  });
});

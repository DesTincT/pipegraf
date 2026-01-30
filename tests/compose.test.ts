import { describe, expect, it } from 'vitest';

import { compose } from '../src/core/compose.js';

describe('compose', () => {
  it('runs middleware in order with nested before/after', async () => {
    const calls: string[] = [];

    const fn = compose<unknown>([
      async (_ctx, next) => {
        calls.push('a:before');
        await next();
        calls.push('a:after');
      },
      async (_ctx, next) => {
        calls.push('b:before');
        await next();
        calls.push('b:after');
      },
      async (_ctx, next) => {
        calls.push('c:before');
        await next();
        calls.push('c:after');
      },
    ]);

    await fn({});

    expect(calls).toEqual(['a:before', 'b:before', 'c:before', 'c:after', 'b:after', 'a:after']);
  });

  it('rejects when a middleware calls next() more than once', async () => {
    const fn = compose<unknown>([
      async (_ctx, next) => {
        await next();
      },
      async (_ctx, next) => {
        await next();
        await next();
      },
    ]);

    await expect(fn({})).rejects.toThrow('next() called multiple times');
  });

  it('throws TypeError when middleware is not a function', () => {
    const bad = 123 as unknown;

    expect(() => compose<unknown>([bad as unknown as (ctx: unknown, next: () => Promise<unknown>) => unknown])).toThrow(
      TypeError,
    );
  });
});

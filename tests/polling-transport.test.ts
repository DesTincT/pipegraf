import { describe, expect, it } from 'vitest';

import { Composer } from '../src/core/composer.js';
import { Bot } from '../src/core/bot.js';
import { createPollingTransport } from '../src/transports/polling.js';

Bot.createPollingTransport = createPollingTransport;

describe('polling transport', () => {
  it('processes updates in order and stop() terminates the loop', async () => {
    const calls: string[] = [];
    const bot = new Bot();

    let resolveProcessed: (() => void) | undefined;
    const processed = new Promise<void>((resolve) => {
      resolveProcessed = resolve;
    });

    bot.use(
      Composer.on('text', async (ctx) => {
        calls.push(String(ctx.messageText));
        if (calls.length === 2) {
          resolveProcessed?.();
        }
      }),
    );

    const updates = [
      { update_id: 1, message: { text: 'a' } },
      { update_id: 2, message: { text: 'b' } },
    ];

    let cursor = 0;
    const controller = bot.startPolling({
      intervalMs: 0,
      getUpdates: async ({ offset, signal }) => {
        if (signal.aborted) return [];
        if (offset !== undefined) {
          while (cursor < updates.length && updates[cursor].update_id < offset) cursor += 1;
        }
        const batch = updates.slice(cursor, cursor + 1);
        cursor += batch.length;
        return batch;
      },
    });

    await processed;
    await controller.stop();

    expect(calls).toEqual(['a', 'b']);
    expect((controller as { isRunning(): boolean }).isRunning()).toBe(false);
  });

  it('advances offset based on update_id', async () => {
    const bot = new Bot();
    const offsets: (number | undefined)[] = [];

    const updates = [
      { update_id: 10, message: { text: 'x' } },
      { update_id: 12, message: { text: 'y' } },
    ];
    let sent = false;

    let resolveSecondCall: (() => void) | undefined;
    const sawSecondCall = new Promise<void>((resolve) => {
      resolveSecondCall = resolve;
    });

    const controller = bot.startPolling({
      intervalMs: 0,
      getUpdates: async ({ offset, signal }) => {
        offsets.push(offset);
        if (offsets.length === 2) {
          resolveSecondCall?.();
        }
        if (signal.aborted) return [];
        if (!sent) {
          sent = true;
          return updates;
        }
        return [];
      },
    });

    await sawSecondCall;
    await controller.stop();

    expect(offsets[0]).toBeUndefined();
    expect(offsets[1]).toBe(13);
  });

  it('dedupes repeated update_id within TTL', async () => {
    const calls: string[] = [];
    const bot = new Bot();

    bot.use(
      Composer.on('text', async (ctx) => {
        calls.push(String(ctx.messageText));
      }),
    );

    const controller = bot.startPolling({
      intervalMs: 0,
      dedupe: { ttlMs: 60_000 },
      getUpdates: async ({ signal }) => {
        if (signal.aborted) return [];
        return [
          { update_id: 1, message: { text: 'x' } },
          { update_id: 1, message: { text: 'x' } },
        ];
      },
    });

    // allow one loop tick
    await new Promise((r) => setTimeout(r, 0));
    await controller.stop();

    expect(calls).toEqual(['x']);
  });

  it('expires dedupe entries after TTL', async () => {
    const calls: string[] = [];
    const bot = new Bot();

    bot.use(
      Composer.on('text', async (ctx) => {
        calls.push(String(ctx.messageText));
      }),
    );

    let n = 0;
    const controller = bot.startPolling({
      intervalMs: 0,
      dedupe: { ttlMs: 5 },
      getUpdates: async ({ signal }) => {
        if (signal.aborted) return [];
        n += 1;
        if (n === 1) return [{ update_id: 1, message: { text: 'x' } }];
        if (n === 2) {
          await new Promise((r) => setTimeout(r, 10));
          return [{ update_id: 1, message: { text: 'x' } }];
        }
        return [];
      },
    });

    // wait for both deliveries
    while (calls.length < 2) {
      await new Promise((r) => setTimeout(r, 1));
    }
    await controller.stop();

    expect(calls).toEqual(['x', 'x']);
  });

  it('dedupes using dedupe.getKey when update_id is missing', async () => {
    const calls: string[] = [];
    const bot = new Bot();

    bot.use(
      Composer.on('text', async (ctx) => {
        calls.push(String(ctx.messageText));
      }),
    );

    const controller = bot.startPolling({
      intervalMs: 0,
      dedupe: {
        ttlMs: 60_000,
        getKey: (u) => (u && typeof u === 'object' && 'k' in u ? String((u as { k: unknown }).k) : undefined),
      },
      getUpdates: async ({ signal }) => {
        if (signal.aborted) return [];
        return [
          { k: 'same', message: { text: 'x' } },
          { k: 'same', message: { text: 'x' } },
        ];
      },
    });

    await new Promise((r) => setTimeout(r, 0));
    await controller.stop();

    expect(calls).toEqual(['x']);
  });
});

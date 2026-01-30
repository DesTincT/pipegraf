import { describe, expect, it } from 'vitest';

import { Composer } from '../src/core/composer.js';
import { Maxgraf } from '../src/core/maxgraf.js';

describe('polling transport', () => {
  it('processes updates in order and stop() terminates the loop', async () => {
    const calls: string[] = [];
    const bot = new Maxgraf();

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
    expect(controller.isRunning()).toBe(false);
  });

  it('dedupe stub advances offset based on update_id', async () => {
    const bot = new Maxgraf();
    const offsets: Array<number | undefined> = [];

    const updates = [{ update_id: 10, message: { text: 'x' } }, { update_id: 12, message: { text: 'y' } }];
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
});


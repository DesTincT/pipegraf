import { describe, expect, it } from 'vitest';

import { Maxgraf } from '../src/core/maxgraf.js';
import { session } from '../src/middleware/session.js';
import { createStage } from '../src/scenes/stage.js';
import { createWizard } from '../src/scenes/wizard.js';

function msg(text: string, chatId = 1, userId = 1): unknown {
  return { message: { text }, chat_id: chatId, user_id: userId };
}

describe('wizard (v0.2)', () => {
  it('step starts at 0, next increments, selectStep sets step, and persists across updates', async () => {
    const stage = createStage();
    const calls: string[] = [];

    stage.register(
      createWizard('onboarding', [
        async (ctx) => {
          calls.push(`s${ctx.wizard?.step}`);
          expect(ctx.wizard?.step).toBe(0);
          await ctx.wizard?.next();
        },
        async (ctx) => {
          calls.push(`s${ctx.wizard?.step}`);
          expect(ctx.wizard?.step).toBe(1);
          await ctx.wizard?.selectStep(0);
        },
      ]),
    );

    const bot = new Maxgraf({ sender: async () => undefined });
    bot.use(session());
    bot.use(stage.middleware());

    bot.start(stage.enter('onboarding'));

    await bot.handleUpdate(msg('/start'));
    await bot.handleUpdate(msg('anything'));
    await bot.handleUpdate(msg('again'));
    await bot.handleUpdate(msg('more'));

    // Note: enter happens downstream of stage.middleware(), so the wizard starts on the next update.
    expect(calls).toEqual(['s0', 's1', 's0']);
  });

  it('back decrements and clamps at 0', async () => {
    const stage = createStage();
    const steps: number[] = [];

    stage.register(
      createWizard('wiz', [
        async (ctx) => {
          steps.push(ctx.wizard?.step ?? -1);
          await ctx.wizard?.back();
          steps.push(ctx.wizard?.step ?? -1);
        },
      ]),
    );

    const bot = new Maxgraf({ sender: async () => undefined });
    bot.use(session());
    bot.use(stage.middleware());
    bot.start(stage.enter('wiz'));

    await bot.handleUpdate(msg('/start'));
    await bot.handleUpdate(msg('next'));

    expect(steps).toEqual([0, 0]);
  });
});


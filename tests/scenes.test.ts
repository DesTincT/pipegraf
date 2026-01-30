import { describe, expect, it } from 'vitest';

import { Composer } from '../src/core/composer.js';
import { Maxgraf } from '../src/core/maxgraf.js';
import { session } from '../src/middleware/session.js';
import { createScene } from '../src/scenes/scene.js';
import { createStage } from '../src/scenes/stage.js';

function msg(text: string, chatId = 1, userId = 1): unknown {
  return {
    message: { text },
    chat_id: chatId,
    user_id: userId,
  };
}

describe('scenes/stage (v0.2)', () => {
  it('enter scene sets current and persists across updates', async () => {
    const stage = createStage();
    stage.register(createScene('wizard'));

    const seen: Array<string | null> = [];
    const bot = new Maxgraf({ sender: async () => undefined });
    bot.use(session());
    bot.use(stage.middleware());

    bot.start(stage.enter('wizard'));
    bot.use(async (ctx) => {
      seen.push(ctx.scene?.current ?? null);
    });

    await bot.handleUpdate(msg('/start'));
    await bot.handleUpdate(msg('noop'));

    expect(seen).toEqual(['wizard', 'wizard']);
  });

  it('runs scene middleware before downstream global handlers while in scene', async () => {
    const calls: string[] = [];
    const stage = createStage();
    stage.register(
      createScene('wizard', async (_ctx, next) => {
        calls.push('scene');
        await next();
      }),
    );

    const bot = new Maxgraf({ sender: async () => undefined });
    bot.use(session());
    bot.use(stage.middleware());

    bot.start(stage.enter('wizard'));

    bot.use(
      Composer.hears('ping', async () => {
        calls.push('global');
      }),
    );

    await bot.handleUpdate(msg('/start'));
    await bot.handleUpdate(msg('ping'));

    expect(calls).toEqual(['scene', 'global']);
  });

  it('leave clears current', async () => {
    const stage = createStage();
    stage.register(
      createScene('wizard', async (ctx, next) => {
        if (ctx.messageText === 'done') {
          await ctx.scene?.leave();
        }
        await next();
      }),
    );

    const currents: Array<string | null> = [];

    const bot = new Maxgraf({ sender: async () => undefined });
    bot.use(session());
    bot.use(stage.middleware());

    bot.start(stage.enter('wizard'));
    bot.use(async (ctx) => {
      currents.push(ctx.scene?.current ?? null);
    });

    await bot.handleUpdate(msg('/start'));
    await bot.handleUpdate(msg('done'));
    await bot.handleUpdate(msg('noop'));

    expect(currents).toEqual(['wizard', null, null]);
  });

  it('fails fast when session middleware is missing', async () => {
    const stage = createStage();
    stage.register(createScene('wizard'));

    const bot = new Maxgraf({ sender: async () => undefined });
    bot.use(stage.middleware());

    await expect(bot.handleUpdate(msg('hi'))).rejects.toThrow('Session middleware is required for scenes');
  });
});


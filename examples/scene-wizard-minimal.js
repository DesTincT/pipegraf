import { Composer, Maxgraf, createScene, createStage, session } from '../dist/index.js';

function msg(text, chatId = 1, userId = 1) {
  return { message: { text }, chat_id: chatId, user_id: userId };
}

const stage = createStage();

stage.register(
  createScene('wizard', async (ctx, next) => {
    const s = ctx.session ?? {};
    const step = typeof s['wizard_step'] === 'number' ? s['wizard_step'] : 0;

    if (step === 0) {
      s['wizard_step'] = 1;
      await ctx.reply('Step 1: say "ok"');
      return;
    }

    if (step === 1) {
      if (ctx.messageText === 'ok') {
        s['wizard_step'] = 2;
        await ctx.reply('Step 2: done. Leaving scene.');
        await ctx.scene?.leave();
        return await next();
      }
      await ctx.reply('Expected "ok"');
      return;
    }

    return await next();
  }),
);

const bot = new Maxgraf({
  sender: async (_ctx, text) => console.log(`reply: ${text}`),
});

bot.use(session());
bot.use(stage.middleware());

bot.start(stage.enter('wizard'));
bot.use(Composer.command('leave', stage.leave()));

bot.use(async (ctx) => {
  console.log('[update]', ctx.scene?.current, ctx.messageText);
});

// Local simulation (no network)
await bot.handleUpdate(msg('/start'));
await bot.handleUpdate(msg('nope'));
await bot.handleUpdate(msg('ok'));
await bot.handleUpdate(msg('after'));

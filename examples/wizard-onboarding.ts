import { Maxgraf, createStage, createWizard, session } from '../dist/index.js';

function msg(text: string): unknown {
  return { message: { text }, chat_id: 1, user_id: 1 };
}

const stage = createStage();

stage.register(
  createWizard('onboarding', [
    async (ctx) => {
      await ctx.reply('Welcome. What is your name?');
      await ctx.wizard?.next();
    },
    async (ctx) => {
      const name = ctx.messageText ?? '(unknown)';
      await ctx.reply(`Nice to meet you, ${name}.`);
      await ctx.wizard?.next();
    },
    async (ctx) => {
      await ctx.reply('All set. Leaving wizard.');
      await ctx.scene?.leave();
    },
  ]),
);

const bot = new Maxgraf({
  sender: async (_ctx, text) => console.log(`reply: ${text}`),
});

bot.use(session());
bot.use(stage.middleware());
bot.start(stage.enter('onboarding'));

// Local simulation (no network)
await bot.handleUpdate(msg('/start'));
await bot.handleUpdate(msg('Ada'));
await bot.handleUpdate(msg('anything'));

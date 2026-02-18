import { Bot, session, createStage, createWizard } from '../dist/index.js';
import { createReferenceAdapter } from '../dist/adapters/reference-adapter/index.js';

const adapter = createReferenceAdapter(async ({ update }, text) => {
  console.log('[adapter.reply]', { text, update });
  return undefined;
});

const bot = new Bot({ adapter });
const stage = createStage();

stage.register(
  createWizard('flow', [
    async (ctx) => {
      await ctx.reply('wizard step 1: send a message');
      await ctx.wizard?.next();
    },
    async (ctx) => {
      if (ctx.messageText !== undefined) {
        ctx.session ??= {};
        ctx.session['wizard_input'] = ctx.messageText;
        await ctx.reply('wizard step 2: confirm with callback confirm:yes or confirm:no');
        await ctx.wizard?.next();
        return;
      }
      await ctx.reply('wizard step 2: waiting for a message');
    },
    async (_ctx, next) => await next(),
  ]),
);

bot.use(session());
bot.use(stage.middleware());

bot.start(stage.enter('flow'), async (ctx) => {
  await ctx.reply('start command received');
});

bot.action('confirm:yes', async (ctx) => {
  const input = String(ctx.session?.['wizard_input'] ?? '');
  await ctx.reply(`callback confirmed: yes (${input})`);
  await ctx.scene?.leave();
});

bot.action('confirm:no', async (ctx) => {
  await ctx.reply('callback confirmed: no');
  await ctx.scene?.leave();
});

await bot.handleUpdate({ update_id: 1, chat_id: 1, user_id: 1, message: { text: '/start' } });
await bot.handleUpdate({ update_id: 2, chat_id: 1, user_id: 1, message: { text: 'sample input' } });
await bot.handleUpdate({ update_id: 3, chat_id: 1, user_id: 1, callback_query: { payload: 'confirm:yes' } });

import { Bot } from '../dist/core/bot.js';
import { createReferenceAdapter } from '../dist/adapters/reference-adapter/index.js';
import { session } from '../dist/middleware/session.js';
import { createStage } from '../dist/scenes/stage.js';
import { createWizard } from '../dist/scenes/wizard.js';

function msg(text: string): unknown {
  return { message: { text }, chat_id: 1, user_id: 1 };
}

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

await bot.handleUpdate(msg('/start'));
await bot.handleUpdate(msg('sample input'));
await bot.handleUpdate({ callback_query: { payload: 'confirm:yes' }, chat_id: 1, user_id: 1 });

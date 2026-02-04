import { Maxgraf } from '../dist/index.js';

const token = process.env.MAX_BOT_TOKEN;
if (!token) throw new Error('MAX_BOT_TOKEN is required');

const bot = new Maxgraf(token);

bot.use(async (ctx, next) => {
  const updateType =
    (ctx.update && typeof ctx.update === 'object' && 'update_type' in ctx.update && ctx.update.update_type) ||
    'unknown';
  const text = ctx.messageText;
  const callback = ctx.callbackData;
  console.log(
    '[update]',
    updateType,
    text ? `text=${JSON.stringify(text)}` : '',
    callback ? `callback=${JSON.stringify(callback)}` : '',
  );
  await next();
});

bot.start(async (ctx) => {
  await ctx.reply('Welcome');
});

bot.help(async (ctx) => {
  await ctx.reply('Help: /start /help /hipster');
});

bot.hears('hi', async (ctx) => await ctx.reply('Hey there'));
bot.command('hipster', Maxgraf.reply('λ'));

bot.catch(async (err, ctx) => {
  console.error('[error]', err);
  try {
    await ctx.reply('Error');
  } catch (_e) {
    // ignore
  }
});

await bot.launch({ polling: { intervalMs: 250, dedupeTtlMs: 60_000 } });
console.log('launched (polling)');

const shutdown = async () => {
  console.log('stopping...');
  await bot.stop();
  console.log('stopped');
};

process.once('SIGINT', () => void shutdown());
process.once('SIGTERM', () => void shutdown());

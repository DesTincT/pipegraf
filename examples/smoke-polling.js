import { Bot as MaxBotSdk } from '@maxhub/max-bot-api';

import { Composer, Maxgraf } from '../dist/index.js';

const token = process.env.MAX_BOT_TOKEN;
if (!token) {
  throw new Error('MAX_BOT_TOKEN is required');
}

const sdk = new MaxBotSdk(token);

function toFrameworkUpdate(update) {
  const messageText = update?.message?.body?.text ?? undefined;
  const chatId = update?.chat_id ?? update?.message?.recipient?.chat_id ?? undefined;

  const callbackData = update?.callback?.payload ?? undefined;

  return {
    // Keep a few MAX fields for logging/debugging
    update_type: update?.update_type,
    timestamp: update?.timestamp,

    // Minimal routing surface for Maxgraf v0.1
    chat_id: typeof chatId === 'number' ? chatId : undefined,
    message:
      typeof messageText === 'string'
        ? {
            text: messageText,
            recipient: { chat_id: typeof chatId === 'number' ? chatId : undefined },
          }
        : undefined,
    callback_query: typeof callbackData === 'string' ? { data: callbackData } : undefined,
  };
}

const bot = new Maxgraf({
  // ctx.reply() will use the MAX SDK path via injected api
  maxApi: sdk.api,
});

bot.use(async (ctx, next) => {
  const updateType = (ctx.update && typeof ctx.update === 'object' && 'update_type' in ctx.update && ctx.update.update_type) || 'unknown';
  const text = ctx.messageText;
  const callback = ctx.callbackData;
  console.log('[update]', updateType, text ? `text=${JSON.stringify(text)}` : '', callback ? `callback=${JSON.stringify(callback)}` : '');
  await next();
});

bot.start(async (ctx) => {
  await ctx.reply('Welcome');
});

bot.help(async (ctx) => {
  await ctx.reply('Help: /start /help /hipster');
});

bot.use(Composer.hears('hi', async (ctx) => await ctx.reply('Hey there')));
bot.use(Composer.command('hipster', Maxgraf.reply('λ')));

bot.catch(async (err, ctx) => {
  console.error('[error]', err);
  try {
    await ctx.reply('Error');
  } catch (_e) {
    // ignore
  }
});

let marker;

const controller = bot.startPolling({
  intervalMs: 0,
  getUpdates: async () => {
    const res = await sdk.api.getUpdates(undefined, marker === undefined ? undefined : { marker });
    marker = res.marker;
    return res.updates.map(toFrameworkUpdate);
  },
});

console.log('launched (polling)');

const shutdown = async () => {
  console.log('stopping...');
  await controller.stop();
  console.log('stopped');
};

process.once('SIGINT', () => void shutdown());
process.once('SIGTERM', () => void shutdown());


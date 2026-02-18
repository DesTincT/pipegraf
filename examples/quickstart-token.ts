/**
 * Quickstart (token + mode):
 * 1) Set BOT_TOKEN
 * 2) Set BOT_MODE=polling or BOT_MODE=webhook (default: polling)
 * 3) For webhook, set PORT (default 3000)
 * 4) Run: npx tsx examples/quickstart-token.ts
 *
 * Polling: BOT_TOKEN=... BOT_MODE=polling npx tsx examples/quickstart-token.ts
 * Webhook: BOT_TOKEN=... BOT_MODE=webhook PORT=3000 npx tsx examples/quickstart-token.ts
 */

import { Bot } from 'pipegraf';
import { createTelegramAdapter } from 'pipegraf/adapters/telegram';

const token = process.env.BOT_TOKEN;
if (!token) throw new Error('BOT_TOKEN is required');

const mode = process.env.BOT_MODE ?? 'polling';
const port = Number(process.env.PORT) || 3000;

const adapter = createTelegramAdapter({ token });
const bot = new Bot({ adapter });
bot.command('start', (ctx) => ctx.reply('Hello!'));

if (mode === 'webhook') {
  const { controller } = adapter.createWebhookController(bot);
  controller.start({ port, path: '/webhook' });
  console.log(`Bot webhook listening on port ${port}, path /webhook`);
} else {
  await bot.launch({ polling: {} });
  console.log('Bot polling started.');
}

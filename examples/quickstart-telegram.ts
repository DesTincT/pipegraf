/**
 * Quickstart (Telegram):
 * 1) Set TELEGRAM_BOT_TOKEN (from @BotFather)
 * 2) Run: npx tsx examples/quickstart-telegram.ts
 */

import { Bot } from 'pipegraf';
import { createTelegramAdapter } from 'pipegraf/adapters/telegram';

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) throw new Error('TELEGRAM_BOT_TOKEN is required');

const bot = new Bot({ adapter: createTelegramAdapter({ token }) });
bot.command('start', (ctx) => ctx.reply('Hello!'));
bot.on('message', (ctx) => ctx.reply('Got it.'));
await bot.launch({ polling: {} });
console.log('Bot started (Telegram).');

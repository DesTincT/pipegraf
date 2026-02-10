import { Bot, createMockAdapter } from '../dist/index.js';

const bot = new Bot({
  adapter: createMockAdapter(),
  adapterConfig: {},
});

bot.start((ctx) => ctx.reply('Welcome! Use buttons below.'));
bot.action('menu:help', (ctx) => ctx.reply('This is the help screen.'));
bot.action('like', (ctx) => ctx.reply('Thanks!'));
bot.action('dislike', (ctx) => ctx.reply('Noted'));

await bot.launch({ polling: { intervalMs: 250, dedupeTtlMs: 60_000 } });

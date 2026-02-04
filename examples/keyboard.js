import { Maxgraf, Keyboard } from '../dist/index.js';

const bot = new Maxgraf(process.env.MAX_BOT_TOKEN);

const mainMenu = () =>
  Keyboard.inlineKeyboard([
    [Keyboard.button.callback('ℹ️ Help', 'menu:help')],
    [Keyboard.button.callback('🧙 Wizard', 'menu:wizard')],
    [Keyboard.button.callback('👍 Like', 'like'), Keyboard.button.callback('👎 Dislike', 'dislike')],
    [Keyboard.button.link('🌐 Open max.ru', 'https://max.ru')],
  ]);

bot.start((ctx) =>
  ctx.reply('Welcome! Use buttons below:', {
    attachments: [mainMenu()],
  }),
);

bot.action('menu:help', (ctx) =>
  ctx.reply('This is the help screen.', {
    attachments: [mainMenu()],
  }),
);

bot.action('like', (ctx) => ctx.reply('❤️ Thanks!'));
bot.action('dislike', (ctx) => ctx.reply('😢 Sad but noted'));

await bot.launch({ polling: { intervalMs: 250, dedupeTtlMs: 60_000 } });

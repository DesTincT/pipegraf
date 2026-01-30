import Fastify from 'fastify';

import { Composer, Maxgraf, registerFastifyWebhook } from '../dist/index.js';

const bot = new Maxgraf({
  sender: async (_ctx, text) => {
    console.log(`reply: ${text}`);
  },
});

bot.use(
  Composer.on('text', async (ctx) => {
    const text = ctx.messageText;
    if (text) {
      await ctx.reply(text);
    }
  }),
);

const app = Fastify({ logger: false });

registerFastifyWebhook(app, bot, { path: '/webhook' });

const port = Number(process.env.PORT ?? '3000');
await app.listen({ port, host: '127.0.0.1' });

console.log(`listening on http://127.0.0.1:${port}/webhook`);
console.log(
  `try: curl -X POST http://127.0.0.1:${port}/webhook -H \"content-type: application/json\" -d \"{\\\"message\\\":{\\\"text\\\":\\\"hello\\\"}}\"`,
);


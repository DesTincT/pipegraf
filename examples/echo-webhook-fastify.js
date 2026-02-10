import Fastify from 'fastify';
import { Bot } from '../dist/index.js';

const bot = new Bot({
  sender: async (_ctx, text) => {
    console.log(`reply: ${text}`);
  },
});

bot.use(async (ctx) => {
  await ctx.reply('hello from bot framework');
});

const app = Fastify({ logger: false });

app.post('/webhook', async (request, reply) => {
  try {
    const update = request.body;
    await bot.handleUpdate(update);
    return reply.code(200).send({ ok: true });
  } catch (err) {
    throw err;
  }
});

const port = Number(process.env.PORT ?? '3000');
await app.listen({ port, host: '127.0.0.1' });

console.log(`listening on http://127.0.0.1:${port}/webhook`);
console.log(
  'try: curl -X POST http://127.0.0.1:3000/webhook -H "content-type: application/json" -d \'{"update_type":"bot_started","timestamp":0,"chat_id":123}\'',
);

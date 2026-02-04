import Fastify from 'fastify';

import { Maxgraf, createMaxBotApi } from '../dist/index.js';

const token = process.env.MAX_BOT_TOKEN;
if (!token) {
  throw new Error('MAX_BOT_TOKEN is required');
}

const api = createMaxBotApi({ token });

const bot = new Maxgraf({
  maxApi: api,
});

bot.use(async (ctx) => {
  await ctx.reply('hello from maxgraf');
});

const app = Fastify({ logger: false });

const registerFastifyWebhook = (fastify, handler, options = {}) => {
  const path = options.path ?? '/webhook';
  const getUpdate = options.getUpdate ?? ((request) => request.body);

  fastify.post(path, async (request, reply) => {
    try {
      const update = getUpdate(request);
      await handler.handleUpdate(update);
      return reply.code(200).send({ ok: true });
    } catch (err) {
      if (options.onRequestError) {
        await options.onRequestError(err, request);
      }
      throw err;
    }
  });
};

registerFastifyWebhook(app, bot, { path: '/webhook' });

const port = Number(process.env.PORT ?? '3000');
await app.listen({ port, host: '127.0.0.1' });

console.log(`listening on http://127.0.0.1:${port}/webhook`);
console.log(
  `try: curl -X POST http://127.0.0.1:${port}/webhook -H \"content-type: application/json\" -d \"{\\\"update_type\\\":\\\"bot_started\\\",\\\"timestamp\\\":0,\\\"chat_id\\\":123}\"`,
);

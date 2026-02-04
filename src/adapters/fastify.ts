import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { UpdateHandler } from '../core/types.js';

export interface RegisterFastifyWebhookOptions {
  path?: string;
  getUpdate?: (request: FastifyRequest) => unknown;
  onRequestError?: (err: unknown, request: FastifyRequest) => unknown | Promise<unknown>;
}

export function registerFastifyWebhook(
  fastify: FastifyInstance,
  bot: UpdateHandler,
  options: RegisterFastifyWebhookOptions = {},
): void {
  const path = options.path ?? '/webhook';
  const getUpdate = options.getUpdate ?? ((request) => request.body);

  fastify.post(path, async (request, reply) => {
    try {
      const update = getUpdate(request);
      await bot.handleUpdate(update);
      return reply.code(200).send({ ok: true });
    } catch (err) {
      if (options.onRequestError) {
        await options.onRequestError(err, request);
      }
      throw err;
    }
  });
}


import { compose, type Middleware } from './compose.js';
import { Context, type ReplySender } from './context.js';
import { createPollingController, type PollingController, type PollingOptions } from '../transports/polling.js';
import { createWebhookCallback, type WebhookCallback, type WebhookOptions } from '../transports/webhook.js';
import type { MaxBotApi } from '../max/sdk.js';

export type ErrorHandler = (err: unknown, ctx: Context) => unknown | Promise<unknown>;

export type MaxgrafOptions = {
  sender?: ReplySender;
  maxApi?: MaxBotApi;
};

export class Maxgraf {
  readonly #middlewares: Middleware<Context>[] = [];
  #composed?: (ctx: Context) => Promise<unknown>;
  #sender?: ReplySender;
  #maxApi?: MaxBotApi;
  #errorHandler?: ErrorHandler;

  constructor(options: MaxgrafOptions = {}) {
    this.#sender = options.sender;
    this.#maxApi = options.maxApi;
  }

  use(...mws: readonly Middleware<Context>[]): this {
    this.#middlewares.push(...mws);
    this.#composed = undefined;
    return this;
  }

  catch(handler: ErrorHandler): this {
    this.#errorHandler = handler;
    return this;
  }

  async handleUpdate(update: unknown): Promise<unknown> {
    const ctx = new Context(update, { sender: this.#sender, maxApi: this.#maxApi });
    try {
      const fn = this.#getComposed();
      return await fn(ctx);
    } catch (err) {
      if (this.#errorHandler) {
        return await this.#errorHandler(err, ctx);
      }
      throw err;
    }
  }

  startPolling(options: PollingOptions): PollingController {
    return createPollingController(this, options);
  }

  webhookCallback(options?: WebhookOptions): WebhookCallback {
    return createWebhookCallback(this, options);
  }

  #getComposed(): (ctx: Context) => Promise<unknown> {
    if (!this.#composed) {
      this.#composed = compose<Context>(this.#middlewares);
    }
    return this.#composed;
  }
}

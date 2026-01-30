import { compose, type Middleware } from './compose.js';
import { Context, type ReplySender } from './context.js';
import { createPollingController, type PollingController, type PollingOptions } from '../transports/polling.js';
import { createWebhookCallback, type WebhookCallback, type WebhookOptions } from '../transports/webhook.js';

export type ErrorHandler = (err: unknown, ctx: Context) => unknown | Promise<unknown>;

export type MaxgrafOptions = {
  sender?: ReplySender;
};

export class Maxgraf {
  readonly #middlewares: Middleware<Context>[] = [];
  #composed?: (ctx: Context) => Promise<unknown>;
  #sender?: ReplySender;
  #errorHandler?: ErrorHandler;

  constructor(options: MaxgrafOptions = {}) {
    this.#sender = options.sender;
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
    const ctx = new Context(update, { sender: this.#sender });
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

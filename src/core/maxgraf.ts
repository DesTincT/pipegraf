import { compose, type Middleware } from './compose.js';
import { Composer } from './composer.js';
import type { Filter, Trigger } from './composer.js';
import { Context, type ReplySender } from './context.js';
import { createPollingController, type PollingController, type PollingOptions } from '../transports/polling.js';
import { createMaxPollingController } from '../transports/max-polling.js';
import { createWebhookCallback, type WebhookCallback, type WebhookOptions } from '../transports/webhook.js';
import type { MaxBotApi } from '../max/sdk.js';

export type ErrorHandler = (err: unknown, ctx: Context) => unknown | Promise<unknown>;

export interface MaxgrafOptions {
  sender?: ReplySender;
  maxApi?: MaxBotApi;
  sdk?: unknown; // test/advanced override used by launch({ polling })
}

export interface LaunchOptions {
  polling?: {
    intervalMs?: number;
    dedupeTtlMs?: number;
  };
}

export class Maxgraf {
  readonly #middlewares: Middleware<Context>[] = [];
  #composed?: (ctx: Context) => Promise<unknown>;
  #sender?: ReplySender;
  #maxApi?: MaxBotApi;
  #token?: string;
  #pollingController?: PollingController;
  #sdk?: unknown;
  #errorHandler?: ErrorHandler;

  constructor(token: string, options?: MaxgrafOptions);
  constructor(options?: MaxgrafOptions);
  constructor(tokenOrOptions: string | MaxgrafOptions = {}, maybeOptions?: MaxgrafOptions) {
    if (typeof tokenOrOptions === 'string') {
      this.#token = tokenOrOptions;
      this.#sender = maybeOptions?.sender;
      this.#maxApi = maybeOptions?.maxApi;
      this.#sdk = maybeOptions?.sdk;
      return;
    }

    this.#sender = tokenOrOptions.sender;
    this.#maxApi = tokenOrOptions.maxApi;
    this.#sdk = tokenOrOptions.sdk;
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

  async launch(options: LaunchOptions = {}): Promise<void> {
    if (options.polling) {
      const token = this.#token;
      if (!token) {
        throw new Error('NotImplemented');
      }

      const result = createMaxPollingController(this, {
        token,
        intervalMs: options.polling.intervalMs,
        dedupeTtlMs: options.polling.dedupeTtlMs,
        sdk: this.#sdk,
      });
      this.#pollingController = result.controller;
      this.#sdk = result.sdk;

      if (!this.#maxApi) {
        this.#maxApi = result.api as MaxBotApi;
      }
    }
  }

  async stop(): Promise<void> {
    if (this.#pollingController) {
      const c = this.#pollingController;
      this.#pollingController = undefined;
      await c.stop();
    }
  }

  webhookCallback(options?: WebhookOptions): WebhookCallback {
    return createWebhookCallback(this, options);
  }

  start(...mws: readonly Middleware<Context>[]): this {
    return this.use(Composer.command('start', ...mws));
  }

  help(...mws: readonly Middleware<Context>[]): this {
    return this.use(Composer.command('help', ...mws));
  }

  on(filters: Filter | readonly Filter[], ...mws: readonly Middleware<Context>[]): this {
    return this.use(Composer.on(filters, ...mws));
  }

  hears(triggers: Trigger | readonly Trigger[], ...mws: readonly Middleware<Context>[]): this {
    return this.use(Composer.hears(triggers, ...mws));
  }

  command(commands: string | readonly string[], ...mws: readonly Middleware<Context>[]): this {
    return this.use(Composer.command(commands, ...mws));
  }

  action(triggers: Trigger | readonly Trigger[], ...mws: readonly Middleware<Context>[]): this {
    return this.use(Composer.action(triggers, ...mws));
  }

  static reply(text: string, extra?: unknown): Middleware<Context> {
    return async (ctx) => await ctx.reply(text, extra);
  }

  #getComposed(): (ctx: Context) => Promise<unknown> {
    if (!this.#composed) {
      this.#composed = compose<Context>(this.#middlewares);
    }
    return this.#composed;
  }
}

import { compose, type Middleware } from './compose.js';
import { Composer } from './composer.js';
import type { Filter, Trigger } from './composer.js';
import { Context, type ReplySender } from './context.js';
import { createPollingController, type PollingController, type PollingOptions } from '../transports/polling.js';
import { createWebhookCallback, type WebhookCallback, type WebhookOptions } from '../transports/webhook.js';
import type { BotAdapter, PollingConfig, ReplyApi } from '../adapters/types.js';

export type ErrorHandler = (err: unknown, ctx: Context) => unknown | Promise<unknown>;

export interface BotOptions {
  sender?: ReplySender;
  replyApi?: ReplyApi;
  adapter?: BotAdapter;
  adapterConfig?: Record<string, unknown>;
  sdk?: unknown; // test/advanced override for adapter createPollingController
}

export interface LaunchOptions {
  polling?: {
    intervalMs?: number;
    dedupeTtlMs?: number;
    [key: string]: unknown;
  };
}

export class Bot {
  readonly #middlewares: Middleware<Context>[] = [];
  #composed?: (ctx: Context) => Promise<unknown>;
  #sender?: ReplySender;
  #replyApi?: ReplyApi;
  #adapter?: BotAdapter;
  #adapterConfig?: Record<string, unknown>;
  #pollingController?: PollingController;
  #sdk?: unknown;
  #errorHandler?: ErrorHandler;

  constructor(options: BotOptions = {}) {
    this.#sender = options.sender;
    this.#replyApi = options.replyApi;
    this.#adapter = options.adapter;
    this.#adapterConfig = options.adapterConfig ?? {};
    this.#sdk = options.sdk;
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

  #resolveReplyApi(): ReplyApi | undefined {
    if (this.#replyApi) return this.#replyApi;
    if (this.#adapter && this.#adapterConfig) {
      this.#replyApi = this.#adapter.createReplyApi(this.#adapterConfig);
      return this.#replyApi;
    }
    return undefined;
  }

  async handleUpdate(update: unknown): Promise<unknown> {
    const ctx = new Context(update, { sender: this.#sender, replyApi: this.#resolveReplyApi() });
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
      const adapter = this.#adapter;
      if (!adapter?.createPollingController) {
        throw new Error('Adapter with createPollingController is required for polling launch');
      }

      const pollConfig: PollingConfig = {
        ...this.#adapterConfig,
        ...options.polling,
        sdk: this.#sdk,
      };

      const result = adapter.createPollingController(this, pollConfig);
      this.#pollingController = result.controller;

      if (result.api) {
        this.#replyApi = result.api;
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

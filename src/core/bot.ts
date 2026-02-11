import { compose, type Middleware } from './compose.js';
import { Composer } from './composer.js';
import type { Filter, Trigger } from './composer.js';
import { Context, type ReplySender } from './context.js';
import { createCanonicalAdapter } from './canonical-adapter.js';
import type {
  Adapter,
  CreatePollingTransport,
  PollingTransport,
  PollingTransportOptions,
  ReplyHandler,
  Transport,
  WebhookCallback,
  WebhookOptions,
} from './contracts.js';

export type ErrorHandler = (err: unknown, ctx: Context) => unknown | Promise<unknown>;

export interface BotOptions {
  sender?: ReplySender;
  replyHandler?: ReplyHandler;
  replyApi?: ReplyHandler; // alias for replyHandler, structural compatibility
  adapter?: Adapter | BotAdapterLike;
  adapterConfig?: Record<string, unknown>;
  createPollingTransport?: CreatePollingTransport;
  sdk?: unknown;
}

export interface BotAdapterLike {
  createReplyApi?(config: Record<string, unknown>): ReplyHandler;
  createPollingController?(
    bot: { handleUpdate: (update: unknown) => Promise<unknown> },
    config: Record<string, unknown>,
  ): { controller: Transport & { stop(): Promise<void> }; api?: ReplyHandler };
}

export interface LaunchOptions {
  polling?: {
    intervalMs?: number;
    dedupeTtlMs?: number;
    [key: string]: unknown;
  };
}

export class Bot {
  static createPollingTransport?: CreatePollingTransport;

  readonly #middlewares: Middleware<Context>[] = [];
  #composed?: (ctx: Context) => Promise<unknown>;
  #sender?: ReplySender;
  #replyHandler?: ReplyHandler;
  #adapter?: Adapter;
  #botAdapter?: BotAdapterLike;
  #adapterConfig?: Record<string, unknown>;
  #createPollingTransport?: CreatePollingTransport;
  #transport?: Transport & { stop(): Promise<void> };
  #sdk?: unknown;
  #errorHandler?: ErrorHandler;

  constructor(options: BotOptions = {}) {
    this.#sender = options.sender;
    this.#replyHandler = options.replyHandler ?? options.replyApi;
    this.#adapterConfig = options.adapterConfig ?? {};

    const adapterOpt = options.adapter;
    if (adapterOpt && 'createContext' in adapterOpt && 'reply' in adapterOpt) {
      this.#adapter = adapterOpt as Adapter;
    } else if (adapterOpt && ('createReplyApi' in adapterOpt || 'createPollingController' in adapterOpt)) {
      this.#botAdapter = adapterOpt as BotAdapterLike;
    }
    this.#createPollingTransport = options.createPollingTransport;
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

  #resolveAdapter(): Adapter | undefined {
    if (this.#adapter) return this.#adapter;

    if (this.#sender || this.#replyHandler) {
      const reply =
        this.#sender
          ? async (ctx: { update: unknown }, text: string, extra?: unknown) =>
              Promise.resolve(this.#sender!(ctx as Context, text, extra))
          : async (ctx: { update: unknown }, text: string, extra?: unknown) => {
              const target = this.#replyHandler!.getReplyTargetFromUpdate(ctx.update);
              if (!target) throw new Error('NotImplemented');
              return await this.#replyHandler!.sendReply(target, text, extra);
            };
      return createCanonicalAdapter(reply);
    }

    if (this.#botAdapter?.createReplyApi) {
      const api = this.#botAdapter.createReplyApi(this.#adapterConfig ?? {});
      const reply = async (ctx: { update: unknown }, text: string, extra?: unknown) => {
        const target = api.getReplyTargetFromUpdate(ctx.update);
        if (!target) throw new Error('NotImplemented');
        return await api.sendReply(target, text, extra);
      };
      return createCanonicalAdapter(reply);
    }

    return undefined;
  }

  async handleUpdate(update: unknown): Promise<unknown> {
    const adapter = this.#resolveAdapter();
    if (!adapter) throw new Error('Adapter required; configure adapter, replyHandler, or sender in BotOptions');
    const ctx = new Context(update, { adapter });
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

  startPolling(options: PollingTransportOptions): PollingTransport {
    const fn = this.#createPollingTransport ?? (this.constructor as typeof Bot).createPollingTransport;
    if (!fn) {
      throw new Error('createPollingTransport is required for startPolling; pass it in BotOptions or set Bot.createPollingTransport');
    }
    const adapter = this.#resolveAdapter();
    const mergedOptions: PollingTransportOptions =
      adapter !== undefined
        ? {
            ...options,
            dedupe: {
              ...options.dedupe,
              getUpdateId: (u) => {
                const id = adapter.getUpdateId(u);
                return typeof id === 'number' ? id : undefined;
              },
              getKey: options.dedupe?.getKey ?? ((u) => adapter.getUpdateId(u)),
            },
          }
        : options;
    const transport = fn(mergedOptions);
    transport.start((update) => this.handleUpdate(update));
    return transport;
  }

  async launch(options: LaunchOptions = {}): Promise<void> {
    if (options.polling) {
      const adapter = this.#botAdapter;
      if (!adapter?.createPollingController) {
        throw new Error('Adapter with createPollingController is required for polling launch');
      }

      const pollConfig = {
        ...this.#adapterConfig,
        ...options.polling,
        sdk: this.#sdk,
      };

      const result = adapter.createPollingController(this, pollConfig);
      this.#transport = result.controller;

      if (result.api) {
        this.#replyHandler = result.api;
      }
    }
  }

  async stop(): Promise<void> {
    if (this.#transport) {
      const t = this.#transport;
      this.#transport = undefined;
      await t.stop();
    }
  }

  webhookCallback(options?: WebhookOptions): WebhookCallback {
    return async (update) => {
      try {
        await this.handleUpdate(update);
      } catch (err) {
        if (options?.onError) {
          await options.onError(err, update);
          return;
        }
        throw err;
      }
    };
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

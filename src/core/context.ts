import type { Adapter, AdapterContext } from './contracts.js';
import type { ReplyHandler } from './contracts.js';

export type ReplySender = (ctx: Context, text: string, extra?: unknown) => Promise<unknown> | unknown;

interface ContextOptions {
  sender?: ReplySender;
  replyHandler?: ReplyHandler;
  replyApi?: ReplyHandler; // structural alias
  adapter?: Adapter;
}

export class Context {
  readonly update: unknown;

  match?: RegExpMatchArray;
  command?: string;
  payload?: string;
  session?: Record<string, unknown>;
  scene?: {
    current: string | null;
    enter: (name: string) => Promise<void>;
    leave: () => Promise<void>;
  };
  wizard?: {
    step: number;
    next: () => Promise<void>;
    back: () => Promise<void>;
    selectStep: (n: number) => Promise<void>;
  };

  readonly #sender?: ReplySender;
  readonly #replyHandler?: ReplyHandler;
  readonly #adapter?: Adapter;
  readonly #base?: AdapterContext;

  constructor(update: unknown, options: ContextOptions = {}) {
    this.update = update;
    this.#sender = options.sender;
    this.#replyHandler = options.replyHandler ?? options.replyApi;
    this.#adapter = options.adapter;

    if (this.#adapter) {
      this.#base = this.#adapter.createContext(update);
      this.command = this.#base.command?.name;
      this.payload = this.#base.command?.payload ?? '';
    }
  }

  get message(): Record<string, unknown> | undefined {
    return this.#base?.message;
  }

  get callbackQuery(): Record<string, unknown> | undefined {
    return this.#base?.callbackQuery;
  }

  get inlineQuery(): Record<string, unknown> | undefined {
    return this.#base?.inlineQuery;
  }

  get messageText(): string | undefined {
    return this.#base?.messageText;
  }

  get callbackData(): string | undefined {
    return this.#base?.callbackData;
  }

  get chatId(): number | undefined {
    return this.#base?.chatId;
  }

  get userId(): number | undefined {
    return this.#base?.userId;
  }

  get eventType(): 'text' | 'message' | 'callback_query' | 'inline_query' | 'unknown' {
    if (this.messageText !== undefined) return 'text';
    if (this.message !== undefined) return 'message';
    if (this.callbackQuery !== undefined) return 'callback_query';
    if (this.inlineQuery !== undefined) return 'inline_query';
    return 'unknown';
  }

  async reply(text: string, extra?: unknown): Promise<unknown> {
    if (!this.#adapter) throw new Error('NotImplemented');
    return await this.#adapter.reply(this, text, extra);
  }
}

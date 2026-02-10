import type { Adapter, AdapterContext } from './contracts.js';
import type { ReplyHandler } from './contracts.js';
import { getNestedRecord, isRecord } from '../utils/index.js';

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
    if (this.#base) return this.#base.message;
    return getNestedRecord(this.update, 'message');
  }

  get callbackQuery(): Record<string, unknown> | undefined {
    if (this.#base) return this.#base.callbackQuery;
    return getNestedRecord(this.update, 'callback_query');
  }

  get inlineQuery(): Record<string, unknown> | undefined {
    if (this.#base) return this.#base.inlineQuery;
    return getNestedRecord(this.update, 'inline_query');
  }

  get messageText(): string | undefined {
    if (this.#base) return this.#base.messageText;
    const msg = this.message;
    if (!msg) return undefined;
    const text = msg['text'];
    return typeof text === 'string' ? text : undefined;
  }

  get callbackData(): string | undefined {
    if (this.#base) return this.#base.callbackData;
    const cq = this.callbackQuery;
    if (!cq) return undefined;

    const payload = cq['payload'];
    if (typeof payload === 'string') return payload;
    if (isRecord(payload)) {
      const action = payload['action'];
      if (typeof action === 'string') return action;
    }

    const data = cq['data'];
    return typeof data === 'string' ? data : undefined;
  }

  get chatId(): number | undefined {
    if (this.#base) return this.#base.chatId;
    return undefined;
  }

  get eventType(): 'text' | 'message' | 'callback_query' | 'inline_query' | 'unknown' {
    if (this.messageText !== undefined) return 'text';
    if (this.message !== undefined) return 'message';
    if (this.callbackQuery !== undefined) return 'callback_query';
    if (this.inlineQuery !== undefined) return 'inline_query';
    return 'unknown';
  }

  async reply(text: string, extra?: unknown): Promise<unknown> {
    if (this.#adapter) {
      return await this.#adapter.reply(this, text, extra);
    }

    if (this.#sender) {
      return await Promise.resolve(this.#sender(this, text, extra));
    }

    if (this.#replyHandler) {
      const target = this.#replyHandler.getReplyTargetFromUpdate(this.update);
      if (!target) throw new Error('NotImplemented');
      return await this.#replyHandler.sendReply(target, text, extra);
    }

    throw new Error('NotImplemented');
  }
}

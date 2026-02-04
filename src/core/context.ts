import { getReplyTargetFromUpdate, sendReply, type MaxBotApi } from '../max/sdk.js';
import { getNestedRecord, isRecord } from '../utils/index.js';

export type ReplySender = (ctx: Context, text: string, extra?: unknown) => Promise<unknown> | unknown;

interface SenderOptions {
  sender?: ReplySender;
  maxApi?: MaxBotApi;
}

export class Context {
  readonly update: unknown;
  readonly #sender?: ReplySender;
  readonly #maxApi?: MaxBotApi;

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

  constructor(update: unknown, options: SenderOptions = {}) {
    this.update = update;
    this.#sender = options.sender;
    this.#maxApi = options.maxApi;
  }

  get message(): Record<string, unknown> | undefined {
    return getNestedRecord(this.update, 'message');
  }

  get callbackQuery(): Record<string, unknown> | undefined {
    return getNestedRecord(this.update, 'callback_query');
  }

  get inlineQuery(): Record<string, unknown> | undefined {
    return getNestedRecord(this.update, 'inline_query');
  }

  get messageText(): string | undefined {
    const msg = this.message;
    if (!msg) return undefined;
    const text = msg['text'];
    return typeof text === 'string' ? text : undefined;
  }

  get callbackData(): string | undefined {
    const cq = this.callbackQuery;
    if (!cq) return undefined;

    const payload = cq['payload'];
    if (typeof payload === 'string') return payload;
    if (isRecord(payload)) {
      const action = payload['action'];
      if (typeof action === 'string') return action;
    }

    // Backward compatibility for older internal shapes/tests.
    const data = cq['data'];
    return typeof data === 'string' ? data : undefined;
  }

  get eventType(): 'text' | 'message' | 'callback_query' | 'inline_query' | 'unknown' {
    if (this.messageText !== undefined) return 'text';
    if (this.message !== undefined) return 'message';
    if (this.callbackQuery !== undefined) return 'callback_query';
    if (this.inlineQuery !== undefined) return 'inline_query';
    return 'unknown';
  }

  async reply(text: string, extra?: unknown): Promise<unknown> {
    if (this.#sender) {
      return await Promise.resolve(this.#sender(this, text, extra));
    }

    if (this.#maxApi) {
      const target = getReplyTargetFromUpdate(this.update);
      if (!target) throw new Error('NotImplemented');
      return await sendReply(this.#maxApi, { target, text, extra });
    }

    throw new Error('NotImplemented');
  }
}

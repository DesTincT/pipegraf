export type ReplySender = (ctx: Context, text: string) => Promise<unknown> | unknown;

type SenderOptions = {
  sender?: ReplySender;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getNestedRecord(value: unknown, key: string): Record<string, unknown> | undefined {
  if (!isRecord(value)) return undefined;
  const nested = value[key];
  return isRecord(nested) ? nested : undefined;
}

export class Context {
  readonly update: unknown;
  readonly #sender?: ReplySender;

  match?: RegExpMatchArray;
  command?: string;
  payload?: string;

  constructor(update: unknown, options: SenderOptions = {}) {
    this.update = update;
    this.#sender = options.sender;
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

  async reply(text: string): Promise<unknown> {
    if (!this.#sender) {
      throw new Error('NotImplemented');
    }
    return await Promise.resolve(this.#sender(this, text));
  }
}

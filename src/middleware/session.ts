import type { Middleware } from '../core/compose.js';
import type { Context } from '../core/context.js';

export type SessionData = Record<string, unknown>;

export type SessionStore<T extends SessionData> = Map<string, T>;

export type SessionOptions<T extends SessionData> = {
  getKey?: (ctx: Context) => string | undefined | null;
  store?: SessionStore<T>;
  createSession?: () => T;
  fallbackKey?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getNumber(value: unknown): number | undefined {
  return typeof value === 'number' ? value : undefined;
}

function getChatId(update: unknown): number | undefined {
  if (!isRecord(update)) return undefined;

  const direct = getNumber(update['chat_id']);
  if (direct !== undefined) return direct;

  const message = update['message'];
  if (!isRecord(message)) return undefined;

  const recipient = message['recipient'];
  if (!isRecord(recipient)) return undefined;

  const chatId = recipient['chat_id'];
  return getNumber(chatId);
}

function getUserId(update: unknown): number | undefined {
  if (!isRecord(update)) return undefined;

  const direct = getNumber(update['user_id']);
  if (direct !== undefined) return direct;

  const user = update['user'];
  if (isRecord(user)) {
    const fromUser = getNumber(user['user_id']);
    if (fromUser !== undefined) return fromUser;
  }

  const message = update['message'];
  if (!isRecord(message)) return undefined;

  const sender = message['sender'];
  if (!isRecord(sender)) return undefined;

  const senderId = getNumber(sender['user_id']);
  return senderId;
}

export function getSessionKey(ctx: Context, options: Pick<SessionOptions<SessionData>, 'getKey' | 'fallbackKey'> = {}): string {
  const custom = options.getKey?.(ctx);
  if (custom) return custom;

  const fallbackKey = options.fallbackKey ?? 'global';
  const chatId = getChatId(ctx.update);
  const userId = getUserId(ctx.update);

  if (chatId !== undefined && userId !== undefined) return `${chatId}:${userId}`;
  if (chatId !== undefined) return String(chatId);
  if (userId !== undefined) return String(userId);
  return fallbackKey;
}

export function session<T extends SessionData = SessionData>(options: SessionOptions<T> = {}): Middleware<Context> {
  const store: SessionStore<T> = options.store ?? new Map<string, T>();
  const createSession = options.createSession ?? (() => ({}) as T);

  return async (ctx, next) => {
    const key = getSessionKey(ctx, options);
    let entry = store.get(key);
    if (!entry) {
      entry = createSession();
      store.set(key, entry);
    }
    ctx.session = entry as unknown as SessionData;
    return await next();
  };
}


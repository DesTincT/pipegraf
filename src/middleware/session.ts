import type { Middleware } from '../core/compose.js';
import type { Context } from '../core/context.js';

export type SessionData = Record<string, unknown>;

export type SessionStore<T extends object> = Map<string, T>;

export interface SessionOptions<T extends object> {
  getKey?: (ctx: Context) => string | undefined | null;
  store?: SessionStore<T>;
  createSession?: () => T;
  fallbackKey?: string;
}

export function getSessionKey(
  ctx: Context,
  options: Pick<SessionOptions<SessionData>, 'getKey' | 'fallbackKey'> = {},
): string {
  const custom = options.getKey?.(ctx);
  if (custom) return custom;

  const fallbackKey = options.fallbackKey ?? 'global';
  const chatId = ctx.chatId;
  const userId = ctx.userId;

  if (chatId !== undefined && userId !== undefined) return `${chatId}:${userId}`;
  if (chatId !== undefined) return String(chatId);
  if (userId !== undefined) return String(userId);
  return fallbackKey;
}

export function session<T extends object = SessionData>(options: SessionOptions<T> = {}): Middleware<Context> {
  const store: SessionStore<T> = options.store ?? new Map<string, T>();
  const createSession = options.createSession ?? (() => ({}) as T);

  return async (ctx, next) => {
    const key = getSessionKey(ctx, options);
    let entry = store.get(key);
    if (!entry) {
      entry = createSession();
      store.set(key, entry);
    }
    ctx.session = entry as unknown as Record<string, unknown>;
    return await next();
  };
}

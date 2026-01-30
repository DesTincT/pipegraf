import { compose, type Middleware } from './compose.js';
import type { Context } from './context.js';

export type Filter = 'message' | 'callback_query' | 'inline_query' | 'text' | ((ctx: Context) => boolean);

export type Trigger =
  | string
  | RegExp
  | ((value: string, ctx: Context) => RegExpMatchArray | null | undefined);

function asReadonlyArray<T>(value: T | readonly T[]): readonly T[] {
  return Array.isArray(value) ? (value as readonly T[]) : [value as T];
}

function matchesFilter(ctx: Context, filter: Filter): boolean {
  if (typeof filter === 'function') {
    return filter(ctx);
  }

  if (filter === 'text') {
    return ctx.messageText !== undefined;
  }

  if (filter === 'message') return ctx.message !== undefined;
  if (filter === 'callback_query') return ctx.callbackQuery !== undefined;
  if (filter === 'inline_query') return ctx.inlineQuery !== undefined;

  return false;
}

function matchTrigger(value: string, ctx: Context, trigger: Trigger): RegExpMatchArray | null {
  if (typeof trigger === 'string') {
    if (value !== trigger) return null;
    return [value];
  }

  if (trigger instanceof RegExp) {
    return trigger.exec(value);
  }

  const result = trigger(value, ctx);
  if (!result) return null;
  return result;
}

export function use(...mws: readonly Middleware<Context>[]): Middleware<Context> {
  const handler = compose(mws);
  return async (ctx, next) => await handler(ctx, next);
}

export function on(filters: Filter | readonly Filter[], ...mws: readonly Middleware<Context>[]): Middleware<Context> {
  const handler = compose(mws);
  const filterList = asReadonlyArray(filters);

  return async (ctx, next) => {
    for (const filter of filterList) {
      if (matchesFilter(ctx, filter)) {
        return await handler(ctx, next);
      }
    }
    return await next();
  };
}

export function hears(triggers: Trigger | readonly Trigger[], ...mws: readonly Middleware<Context>[]): Middleware<Context> {
  const triggerList = asReadonlyArray(triggers);
  const handler = compose(mws);

  return on('text', async (ctx, next) => {
    const text = ctx.messageText;
    if (text === undefined) return await next();

    for (const trigger of triggerList) {
      const match = matchTrigger(text, ctx, trigger);
      if (match) {
        ctx.match = match;
        return await handler(ctx, next);
      }
    }

    return await next();
  });
}

export function action(triggers: Trigger | readonly Trigger[], ...mws: readonly Middleware<Context>[]): Middleware<Context> {
  const triggerList = asReadonlyArray(triggers);
  const handler = compose(mws);

  return on('callback_query', async (ctx, next) => {
    const data = ctx.callbackData;
    if (data === undefined) return await next();

    for (const trigger of triggerList) {
      const match = matchTrigger(data, ctx, trigger);
      if (match) {
        ctx.match = match;
        return await handler(ctx, next);
      }
    }

    return await next();
  });
}

type BotCommandEntity = {
  type: 'bot_command';
  offset: number;
  length: number;
};

function isBotCommandEntity(value: unknown): value is BotCommandEntity {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return record['type'] === 'bot_command' && typeof record['offset'] === 'number' && typeof record['length'] === 'number';
}

function getEntitiesFromMessage(message: Record<string, unknown> | undefined): readonly unknown[] | undefined {
  if (!message) return undefined;
  const entities = message['entities'];
  return Array.isArray(entities) ? entities : undefined;
}

export function command(commands: string | readonly string[], ...mws: readonly Middleware<Context>[]): Middleware<Context> {
  const commandList = asReadonlyArray(commands).map((c) => (c.startsWith('/') ? c.slice(1) : c));
  const handler = compose(mws);

  return on('text', async (ctx, next) => {
    const text = ctx.messageText;
    if (text === undefined) return await next();

    const entities = getEntitiesFromMessage(ctx.message);
    if (!entities || entities.length === 0) return await next();

    const first = entities[0];
    if (!isBotCommandEntity(first)) return await next();
    if (first.offset !== 0) return await next();

    const token = text.slice(0, first.length);
    if (!token.startsWith('/')) return await next();

    const rawName = token.slice(1);
    const [name] = rawName.split('@', 1);
    if (!name) return await next();

    if (!commandList.includes(name)) return await next();

    ctx.command = name;
    ctx.payload = text.slice(first.length).trim();
    return await handler(ctx, next);
  });
}

export const Composer = {
  use,
  on,
  hears,
  action,
  command,
} as const;

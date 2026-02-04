import { compose, type Middleware } from '../core/compose.js';
import type { Context } from '../core/context.js';

export interface Scene {
  name: string;
  middleware: Middleware<Context>;
}

export function createScene(name: string, ...mws: readonly Middleware<Context>[]): Scene {
  const handler = compose(mws);
  return {
    name,
    middleware: async (ctx, next) => await handler(ctx, next),
  };
}


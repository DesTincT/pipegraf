export type Next = () => Promise<unknown>;

export type Middleware<TContext> = (context: TContext, next: Next) => unknown | Promise<unknown>;

export function compose<TContext>(
  middlewares: readonly Middleware<TContext>[],
): (context: TContext, next?: Next) => Promise<unknown> {
  for (const middleware of middlewares) {
    if (typeof middleware !== 'function') {
      throw new TypeError('Middleware must be a function');
    }
  }

  return async function composed(context: TContext, next?: Next): Promise<unknown> {
    let lastIndex = -1;

    const dispatch = async (index: number): Promise<unknown> => {
      if (index <= lastIndex) {
        throw new Error('next() called multiple times');
      }
      lastIndex = index;

      const fn = index === middlewares.length ? next : middlewares[index];
      if (!fn) return;

      return await fn(context, () => dispatch(index + 1));
    };

    return await dispatch(0);
  };
}

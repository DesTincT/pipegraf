# Telegraf architecture notes

## Scope (pinned)

- Telegraf version: v4.16.3
- Source commit referenced by docs: `c591338a5b7396c57435d4b29383feea9be71dd5`

Primary sources:

- `src/composer.ts`: `https://github.com/telegraf/telegraf/blob/c591338/src/composer.ts`
- `src/telegraf.ts`: `https://github.com/telegraf/telegraf/blob/c591338/src/telegraf.ts`
- `src/context.ts`: `https://github.com/telegraf/telegraf/blob/c591338/src/context.ts`

## Middleware pipeline / compose behavior

Telegraf composes middleware similar to Koa: each middleware receives `(ctx, next)` and can `await next()` to delegate downstream and then resume after downstream completes.

### Compose implementation highlights

Telegraf implements composition in `Composer.compose`:

- Validates the middleware list is an array.
- Provides a `next` function that advances the middleware index.
- Guards against `next()` being called more than once per middleware instance.
- Allows `next(ctx)` to replace the context passed to downstream middleware, but checks that the provided value is a `Context` instance.

Key excerpt:

```ts
return (ctx, next) => {
  let index = -1;
  return execute(0, ctx);
  async function execute(i: number, context: C): Promise<void> {
    if (!(context instanceof Context)) {
      throw new Error('next(ctx) called with invalid context');
    }
    if (i <= index) {
      throw new Error('next() called multiple times');
    }
    index = i;
    const handler = Composer.unwrap(middlewares[i] ?? next);
    await handler(context, async (ctx = context) => {
      await execute(i + 1, ctx);
    });
  }
};
```

Reference: `https://github.com/telegraf/telegraf/blob/c591338/src/composer.ts#L924`

### Multiple `next()` calls guard

The guard is explicit and throws:

- `next() called multiple times`

This is a strong “fail fast” stance: it treats double-dispatch as a programming error rather than attempting to continue.

## Routing / matching approach

Telegraf routing is middleware-first: “routing” is implemented by selectively running middleware based on update type, guards, and trigger matches.

### Update type narrowing (`Composer.on`)

`Composer.on(filters, ...middleware)` builds a predicate over `ctx.update`:

- If `filter` is a type guard function, it is called.
- If `filter` is a string, it checks `filter in update` (and historically also message subtype fields).
- If the predicate matches, it runs the middleware; otherwise it passes through.

Reference: `https://github.com/telegraf/telegraf/blob/c591338/src/composer.ts#L462`

### Trigger matching (`Composer.match`)

`Composer.match` tries to find a “text-like” value in several places:

- message / channel post text or caption
- callback query data
- inline query query

If a trigger matches, it assigns `ctx.match` and runs the handler; otherwise it calls `next()`.

Key excerpt:

```ts
const text = getText(ctx.message) ?? getText(ctx.channelPost) ?? getText(ctx.callbackQuery) ?? ctx.inlineQuery?.query;
if (text === undefined) return next();
for (const trigger of triggers) {
  const match = trigger(text, ctx);
  if (match) return handler(Object.assign(ctx, { match }), next);
}
return next();
```

Reference: `https://github.com/telegraf/telegraf/blob/c591338/src/composer.ts#L669`

### Higher-level helpers built on `on` + `match`

- `hears(...)`: `on('text', match(triggers, ...fns))`
- `action(...)`: `on('callback_query', match(triggers, ...fns))`
- `inlineQuery(...)`: `on('inline_query', match(triggers, ...fns))`
- `command(...)`: parses `bot_command` entity at offset 0, supports optional `@botUsername` target check, sets `ctx.command`, `ctx.payload`, and lazy `ctx.args`.

Reference (command parsing): `https://github.com/telegraf/telegraf/blob/c591338/src/composer.ts#L708`

## Error handling philosophy

Telegraf’s core stance is “errors bubble unless explicitly handled”.

### Where errors are caught

In `Telegraf.handleUpdate`:

- `ctx` is constructed as `new contextType(update, tg, botInfo)` and merged with `this.context`.
- The composed middleware is executed with a timeout (`pTimeout`).
- Errors are caught and delegated to a single handler (`this.handleError(err, ctx)`).

Reference: `https://github.com/telegraf/telegraf/blob/c591338/src/telegraf.ts`

Default `handleError`:

- logs `Unhandled error while processing` and the update
- sets `process.exitCode = 1`
- rethrows the error

Override point:

- `bot.catch((err, ctx) => ...)` replaces `handleError` for the instance.

### Middleware-level error wrapper (`Composer.catch`)

`Composer.catch(handler, ...fns)` composes `fns` and catches rejected promises, then calls `handler(err, ctx)`.

Key excerpt:

```ts
return (ctx, next) => Promise.resolve(handler(ctx, next)).catch((err) => errorHandler(err, ctx));
```

Reference: `https://github.com/telegraf/telegraf/blob/c591338/src/composer.ts#L309`

Notes:

- It does not “recover” and continue the chain; it turns an error into “handled” by calling the provided error handler.
- If you want to continue, your error handler must do so explicitly (in Telegraf’s world that usually means choosing not to rethrow and/or deciding how to respond).

## Context shape

`Context` is the object that flows through middleware and provides:

- core: `ctx.update`, `ctx.telegram`, `ctx.botInfo`, `ctx.state`
- accessors: `ctx.message`, `ctx.callbackQuery`, `ctx.inlineQuery`, ...
- derived convenience: `ctx.msg`, `ctx.chat`, `ctx.from`, `ctx.text`, `ctx.updateType`
- a large set of Telegram API shorthands (`ctx.reply`, `ctx.sendMessage`, etc)

### `ctx.state`

Telegraf creates `ctx.state` per update as a mutable record (property is readonly, contents are mutable):

```ts
readonly state: Record<string | symbol, any> = {}
```

Reference: `https://github.com/telegraf/telegraf/blob/c591338/src/context.ts#L38`

### Guarded methods

Many Telegram method shorthands call `ctx.assert(...)` to fail with a consistent message when a method is not applicable to a given update type:

- `Telegraf: "<method>" isn't available for "<updateType>"`

Reference: `https://github.com/telegraf/telegraf/blob/c591338/src/context.ts`

## What we replicate vs simplify

### Replicate

- Middleware composition model (async chain with `next()`).
- `next()` multiple-call guard (`next() called multiple times`), fail fast.
- Errors bubble by default (don’t silently swallow).

### Simplify

- No Telegram-specific update types, filters, or parsing helpers unless a feature requires them.
- Narrow trigger surface (start with string/regex/function triggers; avoid Telegraf’s full set of entity helpers).
- No `next(ctx)` context replacement unless we have a concrete use-case.
- Avoid background helpers like `fork`/`tap` until needed.

## Pitfalls / design decisions (watch list)

- Calling `next()` more than once (Telegraf throws; we should, too).
- Forgetting to `return`/`await next()` and accidentally running “after” logic early.
- Assuming `text` exists (Telegraf checks multiple locations; many updates have no text).
- Treating `ctx.state` as cross-update storage (it is per-update; persistence requires an explicit store).
- Handler timeout: Telegraf bounds update processing time (be explicit if we add timeouts).

## Issue response template (“Telegraf does X”)

Copy/paste:

> Telegraf does **X** because its middleware model is **Y**.
>
> Source: `https://github.com/telegraf/telegraf/blob/c591338/src/<file>.ts#L<line>`
>
> Relevant excerpt:
>
> ```ts
> <short excerpt>
> ```
>
> In this framework we **replicate**: <replicate item(s)>.
> We **simplify**: <simplify item(s)>.
> If you need Telegraf parity for <edge case>, please open an issue with a concrete example update + desired behavior.

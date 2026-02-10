## Bot framework

A Node.js/TypeScript adapter-based bot framework with a Telegraf-inspired middleware and routing model.

## What it is

The framework routes incoming updates through a deterministic middleware pipeline, with routing helpers inspired by Telegraf’s DX and programming model.

It is **not a fork** of Telegraf.

## Why it exists

Platform SDKs give you primitives to talk to the messaging platform. In practice, production bots also need a predictable routing model, clear middleware ordering, and explicit error boundaries.

This framework provides a small, deterministic layer focused on DX and production-oriented defaults, with platform-specific behavior delegated to adapters.

## Features

- **Middleware pipeline**: Koa-style `(ctx, next)` middleware composition
- **Routing helpers**: `bot.on`, `bot.hears`, `bot.command`, `bot.action`
- **Sugar API**: `bot.start`, `bot.help`, `Bot.reply(...)`
- **Slash-only command parsing**: commands match `/name` (not `name`)
- **`ctx.reply()`**: handled by adapter or custom sender
- **Polling + webhook**: `bot.launch({ polling })` and `bot.webhookCallback()`
- **TTL-based update deduplication**: in-memory TTL store keyed by stable update identifiers (polling)
- **Deterministic behavior**: stable middleware order, no hidden concurrency
- **Error boundary**: `bot.catch((err, ctx) => ...)`
- **Adapter-based**: platform coupling is isolated in adapter implementations

## Quick start

This project does not assume npm publishing yet. The snippet below shows usage assuming the package is available in your project.

```ts
import { Bot, createMockAdapter } from 'maxgraf';

const bot = new Bot({
  adapter: createMockAdapter(),
  adapterConfig: {},
});

bot.start(async (ctx) => await ctx.reply('Welcome'));
bot.help(async (ctx) => await ctx.reply('Help: /start /help /hipster'));
bot.hears('hi', async (ctx) => await ctx.reply('Hey there'));
bot.command('hipster', Bot.reply('λ'));

bot.catch(async (err, ctx) => {
  console.error(err);
  try {
    await ctx.reply('Error');
  } catch {
    // ignore
  }
});

await bot.launch({ polling: { intervalMs: 250, dedupeTtlMs: 60_000 } });

process.once('SIGINT', () => void bot.stop());
process.once('SIGTERM', () => void bot.stop());
```

Platform-specific adapters (inline keyboards, etc.) are available via subpath exports. See the examples and adapter documentation.

## Feature comparison

| Capability                           | Telegraf.js | This framework |
| ------------------------------------ | ----------- | -------------- |
| Telegraf-like DX                     | ✅          | ✅             |
| Middleware pipeline                  | ✅          | ✅             |
| Sugar API (start/help/hears/command) | ✅          | ✅             |
| Slash command handling               | ✅          | ✅             |
| `ctx.reply`                          | ✅          | ✅             |
| `ctx.command` / `ctx.args`           | ✅          | ⚠️             |
| Session support                      | ✅          | ✅             |
| Scenes / dialogs                     | ✅          | ✅             |
| Wizard flows                         | ✅          | ✅             |
| Testing helpers                      | ✅          | ⚠️             |
| Update deduplication (TTL)           | ⚠️          | ✅             |
| Deterministic behavior               | ⚠️          | ✅             |
| Platform coupling                    | Telegram    | Adapter-based  |

Legend: ✅ supported, ⚠️ partial / minimal, ❌ not supported.

## Runtime guarantees

- **Stable middleware order**: middleware runs in registration order; wrapping behavior is deterministic.
- **TTL-based deduplication (polling)**: repeated updates are ignored within TTL (in-memory).
- **Isolated error handling**: errors bubble by default; `bot.catch` provides a single explicit boundary.
- **No hidden concurrency**: no background task orchestration beyond what you explicitly start.

## Project status

The framework is **v0.x**. The API may change while the focus is stabilizing core DX and runtime behavior.

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md). This project follows an issues-first workflow (discuss in an issue, then open a focused PR).

## License

MIT. See [`LICENSE`](LICENSE).

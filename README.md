## Maxgraf.js

Maxgraf.js is a Node.js/TypeScript framework for building bots on MAX messenger with a Telegraf-inspired middleware and routing model.

## What is Maxgraf.js

Maxgraf.js routes incoming MAX updates through a deterministic middleware pipeline, with routing helpers inspired by Telegraf’s DX and programming model.

It is **not a fork** of Telegraf.

## Why Maxgraf.js exists

The MAX SDK gives you the primitives to talk to the platform. In practice, production bots also need a predictable routing model, clear middleware ordering, and explicit error boundaries.

Maxgraf.js exists to provide a small, deterministic framework layer focused on DX and production-oriented defaults without changing how you talk to the official SDK.

## Features (current, implemented)

- **Middleware pipeline**: Koa-style `(ctx, next)` middleware composition
- **Routing helpers**: `bot.on`, `bot.hears`, `bot.command`, `bot.action`
- **Sugar API**: `bot.start`, `bot.help`, `Maxgraf.reply(...)`
- **Slash-only command parsing**: commands match `/name` (not `name`)
- **`ctx.reply()` via official MAX SDK**: handled internally when launching with a token
- **Polling + webhook**: `bot.launch({ polling })` and `bot.webhookCallback()`
- **TTL-based update deduplication**: in-memory TTL store keyed by stable update identifiers (polling)
- **Deterministic behavior**: stable middleware order, no hidden concurrency
- **Error boundary**: `bot.catch((err, ctx) => ...)`

## Quick start

This project does not assume npm publishing yet. The snippet below shows usage assuming `maxgraf` is available in your project.

```ts
import { Maxgraf } from 'maxgraf';

const token = process.env.MAX_BOT_TOKEN;
if (!token) throw new Error('MAX_BOT_TOKEN is required');

const bot = new Maxgraf(token);

bot.start(async (ctx) => await ctx.reply('Welcome'));
bot.help(async (ctx) => await ctx.reply('Help: /start /help /hipster'));
bot.hears('hi', async (ctx) => await ctx.reply('Hey there'));
bot.command('hipster', Maxgraf.reply('λ'));

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

## Keyboards (inline buttons)

Maxgraf does not introduce a custom keyboard format.

Instead, it re-exports the official MAX Keyboard API, so you can build inline keyboards exactly as described in the MAX Bot API documentation, without importing the SDK directly.

```ts
import { Maxgraf, Keyboard } from 'maxgraf';

const bot = new Maxgraf(process.env.MAX_BOT_TOKEN);

const mainMenu = () =>
  Keyboard.inlineKeyboard([
    [Keyboard.button.callback('ℹ️ Help', 'menu:help')],
    [Keyboard.button.callback('🧙 Wizard', 'menu:wizard')],
    [Keyboard.button.callback('👍 Like', 'like'), Keyboard.button.callback('👎 Dislike', 'dislike')],
    [Keyboard.button.link('🌐 Open max.ru', 'https://max.ru')],
  ]);

bot.start((ctx) =>
  ctx.reply('Welcome! Use buttons below:', {
    attachments: [mainMenu()],
  }),
);

bot.action('menu:help', (ctx) =>
  ctx.reply('This is the help screen.', {
    attachments: [mainMenu()],
  }),
);

bot.action('like', (ctx) => ctx.reply('❤️ Thanks!'));
bot.action('dislike', (ctx) => ctx.reply('😢 Sad but noted'));

await bot.launch({ polling: { intervalMs: 250, dedupeTtlMs: 60_000 } });
```

## Feature comparison

| Capability                           | Telegraf.js | Maxgraf.js (current) | Maxgraf.js (planned) |
| ------------------------------------ | ----------- | -------------------- | -------------------- |
| Telegraf-like DX                     | ✅          | ✅                   | ✅                   |
| Middleware pipeline                  | ✅          | ✅                   | ✅                   |
| Sugar API (start/help/hears/command) | ✅          | ✅                   | ✅                   |
| Slash command handling               | ✅          | ✅                   | ✅                   |
| `ctx.reply`                          | ✅          | ✅                   | ✅                   |
| `ctx.command` / `ctx.args`           | ✅          | ⚠️                   | ✅                   |
| Session support                      | ✅          | ✅                   | ✅                   |
| Scenes / dialogs                     | ✅          | ✅                   | ✅                   |
| Wizard flows                         | ✅          | ✅                   | ✅                   |
| Testing helpers                      | ✅          | ⚠️                   | ✅                   |
| Update deduplication (TTL)           | ⚠️          | ✅                   | ✅                   |
| Deterministic behavior               | ⚠️          | ✅                   | ✅                   |
| Platform coupling                    | Telegram    | MAX                  | MAX                  |

Legend: ✅ supported, ⚠️ partial / minimal, ❌ not supported.

## Runtime guarantees

- **Stable middleware order**: middleware runs in registration order; wrapping behavior is deterministic.
- **TTL-based deduplication (polling)**: repeated updates are ignored within TTL (in-memory).
- **Isolated error handling**: errors bubble by default; `bot.catch` provides a single explicit boundary.
- **No hidden concurrency**: no background task orchestration beyond what you explicitly start.

## Project status

Maxgraf.js is **v0.x**. The API may change while the focus is stabilizing core DX and runtime behavior.

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md). This project follows an issues-first workflow (discuss in an issue, then open a focused PR).

## License

MIT. See [`LICENSE`](LICENSE).

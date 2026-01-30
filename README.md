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
- **Routing helpers**: `Composer.on`, `Composer.hears`, `Composer.command`, `Composer.action`
- **Sugar API**: `bot.start`, `bot.help`, `Maxgraf.reply(...)`
- **Slash-only command parsing**: commands match `/name` (not `name`)
- **`ctx.reply()` via official MAX SDK**: inject `maxApi` and call `ctx.reply(...)`
- **Polling + webhook**: polling controller and webhook callback
- **TTL-based update deduplication**: in-memory `update_id` TTL store for polling
- **Deterministic behavior**: stable middleware order, no hidden concurrency
- **Error boundary**: `bot.catch((err, ctx) => ...)`

## Quick start

This project does not assume npm publishing yet. The snippet below shows usage assuming `maxgraf` is available in your project.

```ts
import { Bot as MaxBotSdk } from '@maxhub/max-bot-api';
import { Composer, Maxgraf } from 'maxgraf';

const token = process.env.MAX_BOT_TOKEN;
if (!token) throw new Error('MAX_BOT_TOKEN is required');

const sdk = new MaxBotSdk(token);

function toFrameworkUpdate(update: any) {
  const messageText = update?.message?.body?.text ?? undefined;
  const chatId = update?.chat_id ?? update?.message?.recipient?.chat_id ?? undefined;
  const callbackData = update?.callback?.payload ?? undefined;

  return {
    update_type: update?.update_type,
    timestamp: update?.timestamp,
    chat_id: typeof chatId === 'number' ? chatId : undefined,
    message:
      typeof messageText === 'string'
        ? { text: messageText, recipient: { chat_id: typeof chatId === 'number' ? chatId : undefined } }
        : undefined,
    callback_query: typeof callbackData === 'string' ? { data: callbackData } : undefined,
  };
}

const bot = new Maxgraf({ maxApi: sdk.api });

bot.start(async (ctx) => await ctx.reply('Welcome'));
bot.help(async (ctx) => await ctx.reply('Help: /start /help /hipster'));
bot.use(Composer.hears('hi', async (ctx) => await ctx.reply('Hey there')));
bot.use(Composer.command('hipster', Maxgraf.reply('λ')));

bot.catch(async (err, ctx) => {
  console.error(err);
  try {
    await ctx.reply('Error');
  } catch {
    // ignore
  }
});

let marker: string | undefined;
const controller = bot.startPolling({
  intervalMs: 250,
  dedupe: { ttlMs: 60_000 },
  getUpdates: async () => {
    const res = await sdk.api.getUpdates(undefined, marker === undefined ? undefined : { marker });
    marker = res.marker;
    return res.updates.map(toFrameworkUpdate);
  },
});

process.once('SIGINT', () => void controller.stop());
process.once('SIGTERM', () => void controller.stop());
```

## Feature comparison

| Capability | Telegraf.js | Maxgraf.js (current) | Maxgraf.js (planned) |
| --- | --- | --- | --- |
| Telegraf-like DX | ✅ | ✅ | ✅ |
| Middleware pipeline | ✅ | ✅ | ✅ |
| Sugar API (start/help/hears/command) | ✅ | ✅ | ✅ |
| Slash command handling | ✅ | ✅ | ✅ |
| `ctx.reply` | ✅ | ✅ | ✅ |
| `ctx.command` / `ctx.args` | ✅ | ⚠️ | ✅ |
| Session support | ✅ | ❌ | ✅ |
| Scenes / dialogs | ✅ | ❌ | ✅ |
| Wizard flows | ✅ | ❌ | ✅ |
| Testing helpers | ✅ | ⚠️ | ✅ |
| Update deduplication (TTL) | ⚠️ | ✅ | ✅ |
| Deterministic behavior | ⚠️ | ✅ | ✅ |
| Platform coupling | Telegram | MAX | MAX |

Legend: ✅ supported, ⚠️ partial / minimal, ❌ not supported.

## Runtime guarantees

- **Stable middleware order**: middleware runs in registration order; wrapping behavior is deterministic.
- **TTL-based deduplication (polling)**: repeated `update_id` values are ignored within TTL (in-memory).
- **Isolated error handling**: errors bubble by default; `bot.catch` provides a single explicit boundary.
- **No hidden concurrency**: no background task orchestration beyond what you explicitly start.

## Project status

Maxgraf.js is **v0.x**. The API may change while the focus is stabilizing core DX and runtime behavior.

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md). This project follows an issues-first workflow (discuss in an issue, then open a focused PR).

## License

MIT. See [`LICENSE`](LICENSE).

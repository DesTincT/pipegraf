# Maxgraf.js
TypeScript framework for building MAX messenger bots.

## What is Maxgraf.js
Maxgraf.js is a small Node.js/TypeScript framework that routes incoming MAX updates through a deterministic middleware pipeline.

## Why it exists
MAX bot development often ends up as ad-hoc handlers. Maxgraf.js provides a consistent middleware and routing model that stays close to a proven shape.

## Features
- Composable middleware pipeline
- Routing helpers (`Composer.on`, `Composer.hears`, `Composer.command`, `Composer.action`)
- Polling and webhook transports
- Fastify webhook adapter
- `ctx.reply()` via the official MAX SDK

## Quick start

```ts
import { Composer, Maxgraf } from 'maxgraf';

const bot = new Maxgraf();
bot.use(Composer.command('start', (ctx) => ctx.reply('hi')));

await bot.handleUpdate({ update_type: 'bot_started', timestamp: 0, chat_id: 123 });
```

## Basic example (command + hears)

```ts
import { Composer, Maxgraf } from 'maxgraf';

const bot = new Maxgraf();

bot.use(Composer.command('start', (ctx) => ctx.reply('welcome')));
bot.use(Composer.hears(/^ping$/i, (ctx) => ctx.reply('pong')));

await bot.handleUpdate({ update_type: 'bot_started', timestamp: 0, chat_id: 123 });
```

## Compatibility note
Inspired by telegraf (DX and programming model), not a fork.

## Project status
v0.x — early stage, API may change

## License
MIT. See `LICENSE`.

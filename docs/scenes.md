# Scenes

Scenes are a small, session-backed routing layer for building multi-step flows (“wizards”).

Scene state is stored in `ctx.session`, so `session()` middleware is required.

## Usage

```ts
import { Composer, Maxgraf, createScene, createStage, session } from 'maxgraf';

const stage = createStage();

stage.register(
  createScene('wizard', async (ctx) => {
    await ctx.reply('wizard step');
  }),
);

const bot = new Maxgraf();
bot.use(session());
bot.use(stage.middleware());

bot.start(stage.enter('wizard'));
bot.use(Composer.command('leave', stage.leave()));
```

## Routing order

When `ctx.scene.current` is set, `stage.middleware()` runs the current scene middleware **before** downstream middleware (global handlers).

This means you should install it early:

- `bot.use(session())`
- `bot.use(stage.middleware())`
- then your other `bot.use(...)` / `Composer.*(...)` handlers


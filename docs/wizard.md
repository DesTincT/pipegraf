# Wizard

`createWizard(name, steps)` is a tiny helper built on top of scenes.

Wizard state is stored in `ctx.session`, so it requires:

- `session()` middleware
- `stage.middleware()` (sets `ctx.scene` / provides scene routing)

## Minimal example

```ts
import { Maxgraf, createStage, createWizard, session } from 'maxgraf';

const stage = createStage();
stage.register(
  createWizard('onboarding', [
    async (ctx) => {
      await ctx.reply('Step 1');
      await ctx.wizard?.next();
    },
    async (ctx) => {
      await ctx.reply('Step 2');
    },
  ]),
);

const bot = new Maxgraf();
bot.use(session());
bot.use(stage.middleware());
bot.start(stage.enter('onboarding'));
```


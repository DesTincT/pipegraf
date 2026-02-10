# Wizard

`createWizard(name, steps)` is a tiny helper built on top of scenes.

Wizard state is stored in `ctx.session`, so it requires:

- `session()` middleware
- `stage.middleware()` (sets `ctx.scene` / provides scene routing)

## Minimal example

```ts
import { Bot, createStage, createWizard, session } from 'maxgraf';

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

const bot = new Bot({ sender: async (_ctx, text) => console.log(text) });
bot.use(session());
bot.use(stage.middleware());
bot.start(stage.enter('onboarding'));
```

Note: `stage.enter(name)` is middleware. If you enter the wizard from `/start`, the wizard scene becomes active for routing on the **next** update.

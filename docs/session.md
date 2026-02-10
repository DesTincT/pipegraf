# Session middleware

`session()` attaches an in-memory per-key object to `ctx.session`.

This is intended for local development and simple deployments. The default store is a process-local `Map`, so sessions do not survive restarts and are not shared across instances.

## Usage

```ts
import { Bot, session } from 'maxgraf';

type Session = { count?: number };

const bot = new Bot({ sender: async (_ctx, text) => console.log(text) });
bot.use(session<Session>());

bot.start((ctx) => {
  const s = ctx.session as unknown as Session;
  s.count = (s.count ?? 0) + 1;
  return ctx.reply(`count=${s.count}`);
});
```

## Default key derivation

By default, the session key is derived from the update when possible:

- `chat_id:user_id` when both are present
- `chat_id` when only chat is present
- `user_id` when only user is present
- fallback to `global` when neither is present

You can override this via `session({ getKey })`.

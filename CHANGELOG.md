## 0.9.0

This release stabilizes the public DX around a token-first constructor and polling launch, and hardens MAX-specific behavior for callbacks and inline keyboards.

### Stable API surface

- `new Maxgraf(token)` (preferred)
- `await bot.launch({ polling })` and `await bot.stop()`
- Deterministic middleware pipeline (`(ctx, next)`)
- Routing helpers: `bot.on`, `bot.hears`, `bot.command`, `bot.action`, plus `bot.start`/`bot.help`
- `ctx.reply(text, extra)` with passthrough `extra` (attachments/keyboard)
- Sessions (`session()`), scenes (`createStage/createScene`), wizard (`createWizard`)
- `Keyboard` is re-exported from the official MAX SDK (`@maxhub/max-bot-api`)

### Known non-goals (v0.9)

- No plugin system or stable extension surface beyond middleware.
- No distributed session store (default is in-memory `Map`).
- No “reply keyboard” abstraction (MAX uses inline keyboards via attachments).

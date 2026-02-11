## Unreleased

### Changed

- Initial release prepared under new package name: `pipegraf`.
- Core and docs remain transport-agnostic with adapter-based integration.
- Added `Pipegraf` alias export (mapped to `Bot`) for naming continuity.

## 0.9.0

### Stable API surface

- Deterministic middleware pipeline (`(ctx, next)`).
- Routing helpers: `bot.on`, `bot.hears`, `bot.command`, `bot.action`, plus `bot.start`/`bot.help`.
- `await bot.launch({ polling })` and `await bot.stop()`.
- Sessions (`session()`), scenes (`createStage/createScene`), wizard (`createWizard`).

### Known non-goals (v0.9)

- No plugin system or stable extension surface beyond middleware.
- No distributed session store (default is in-memory `Map`).

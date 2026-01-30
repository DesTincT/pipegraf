# Contributing

## Issues first
- **Bug reports**: open an issue with steps to reproduce, expected behavior, actual behavior, and environment details.
- **Feature requests**: open an issue describing the problem and a minimal proposed API.

## Proposing changes
1. Open an issue (or comment on an existing one) to agree on scope.
2. Submit a PR that addresses that issue.

## Local development
Requirements: Node.js 18+ and pnpm.

```bash
pnpm install
pnpm test
pnpm typecheck
```

## Code style expectations
- Keep changes small and focused.
- Avoid new dependencies unless clearly justified.
- Prefer explicit code over clever abstractions.
- TypeScript strict mode is required.

## Contribution principles
- One feature per PR.
- Small, focused PRs are easier to review and merge.
- Tests are required for core behavior changes.

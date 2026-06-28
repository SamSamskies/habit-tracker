# Habit Tracker

Express + SQLite API with Drizzle ORM and a minimal UI in `public/`.

## Stack

- TypeScript via Node `--experimental-strip-types` (no separate build step)
- SQLite: `better-sqlite3` + Drizzle (`src/schema.ts`, `src/db.ts`)
- Tests: Node built-in test runner; e2e uses Playwright with an in-process server

## Verify before ship

```bash
npm test
npm run test:e2e
```

Or invoke the `habit-tracker-ship` skill.

## Cursor Cloud specific instructions

Cloud agents run on Ubuntu VMs. No dev server needs to be running beforehand.

- **Install** — handled by `.cursor/environment.json` (`npm ci`). The `postinstall` script runs `playwright install chromium`.
- **Unit tests** — `npm test`. API tests only; no external server.
- **E2e tests** — `npm run test:e2e`. Each suite calls `startServer({ port: 0 })` and uses a temp SQLite file in `os.tmpdir()`. Do not run `npm start` separately.
- **Secrets** — none required. Tests never touch a persistent database.
- **Verify-only runs** — report pass/fail. Do not open a PR unless explicitly asked.
- **Playwright fails** — run `npx playwright install --with-deps chromium`, then retry e2e.
- **better-sqlite3 compile fails** — the VM needs native build tools; use Cloud Agents dashboard → agent-driven environment setup.

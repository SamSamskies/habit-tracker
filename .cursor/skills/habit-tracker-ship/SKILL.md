---
name: habit-tracker-ship
description: Run full habit tracker verification (API + e2e). Invoke explicitly when the user asks to ship or run e2e — not during routine UI/CSS iteration.
disable-model-invocation: true
---

# Habit Tracker Ship

Use only when the user explicitly requests ship checks or e2e verification.

## Verify checklist
- [ ] `npm test` — all API tests green
- [ ] `npm run test:e2e` — browser tests (skip unless user asked or behavior changed)

## Done when
All requested checks pass. If something fails, show the command output and fix before marking done.

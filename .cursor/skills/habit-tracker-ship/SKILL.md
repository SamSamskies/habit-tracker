---
name: habit-tracker-ship
description: Run the habit tracker verify loop after a feature change. Use when shipping, verifying, or finishing work on the habit tracker API or UI.
---

# Habit Tracker Ship

## Verify checklist
- [ ] npm test — all API tests green
- [ ] npm run dev — smoke the UI in browser
- [ ] npm run test:e2e — if e2e tests exist

## Done when
All checks pass. If something fails, show the command output and fix before marking done.
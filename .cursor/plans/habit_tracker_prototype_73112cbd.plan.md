---
name: Habit Tracker Prototype
overview: Build a personal habit tracker as a small Node + TypeScript + SQLite backend serving a zero-build vanilla HTML/CSS/JS frontend, supporting adding habits, daily check-offs, current streaks, and a 7-day history view.
todos:
  - id: scaffold
    content: Create package.json with express and start/test scripts (Node --experimental-strip-types), plus .gitignore (SQLite via built-in node:sqlite)
    status: pending
  - id: backend
    content: "Write server.ts: SQLite setup (habits, completions tables), 4 REST routes, static serving of public/, and server-side streak + last-7-days computation"
    status: pending
  - id: frontend
    content: "Build public/index.html with inline CSS/JS: add-habit form, habit list with today toggle, streak display, and clickable 7-day history grid"
    status: pending
  - id: readme
    content: Write README.md with install/run instructions
    status: pending
  - id: verify
    content: npm install, npm start, manually verify add/toggle/streak/history and persistence across refresh
    status: pending
isProject: false
---

# Habit Tracker Prototype

A minimal full-stack app: a tiny Node/TypeScript/Express server with a SQLite database exposes a small REST API, and a single static `index.html` (with inline CSS/JS) renders the UI. No frontend build step or extra TypeScript tooling.

## Stack
- Backend: Node v26+ + TypeScript (via `--experimental-strip-types`, no `tsc`/tsx dep) + [Express](https://expressjs.com/) + [`node:sqlite`](https://nodejs.org/api/sqlite.html) (`DatabaseSync` — built-in, synchronous, file-based DB; no extra npm dep)
- Frontend: one `public/index.html` with inline CSS and vanilla JS using `fetch`
- DB file: `habits.db` (gitignored)

## Data model
Two tables in SQLite:
- `habits`: `id`, `name`, `created_at`
- `completions`: `id`, `habit_id`, `date` (YYYY-MM-DD), unique on `(habit_id, date)`

Streaks and history are derived from `completions` rows (no extra columns needed).

## API (REST/JSON)
- `GET /api/habits` - list habits, each enriched with `currentStreak` and last-7-days completion map
- `POST /api/habits` - create habit `{ name }`
- `DELETE /api/habits/:id` - remove a habit and its completions
- `POST /api/habits/:id/toggle` - toggle completion for a given `{ date }` (defaults to today)

## Frontend behavior
- Input + button to add a habit
- List of habits; each row shows a checkbox/toggle for today, the current streak (e.g. "5 day streak"), and a 7-column grid (Mon-Sun or last 7 days) showing done/not-done, each cell clickable to toggle that day
- A small header with today's date
- All actions call the API then re-render from the server response (server is source of truth)

## Streak logic
`currentStreak` = count of consecutive days with a completion ending today (or yesterday if today not yet done), computed server-side from `completions` for that habit.

## Files to create
- `package.json` - deps (`express` only; SQLite via `node:sqlite`), `start`/`test` scripts using `node --experimental-strip-types`
- `tsconfig.json` - TypeScript config for editor/type-checking (no compile step; Node runs `.ts` directly)
- `server.ts` - Express app, SQLite setup, the 4 routes, serves `public/`
- `db.ts` - opens DB, creates tables if missing (or inline in `server.ts` to stay thin)
- `public/index.html` - full UI (HTML + inline `<style>` + inline `<script>`)
- `.gitignore` - `node_modules/`, `habits.db`
- `README.md` - run instructions (`npm install`, `npm start`, open `http://localhost:3000`)

## Verify
- Run `npm install` then `npm start`, open the app, add a habit, toggle today + a couple past days, confirm streak count and the 7-day grid update and survive a page refresh (proving DB persistence). Tests: `npm test`.
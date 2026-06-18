import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { Habit, HabitWithStats } from '../src/db.ts';
import { addCompletion, buildHistory, getHabitById } from '../src/db.ts';
import { startServer } from '../src/server.ts';

function formatDateLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function emptyHistory(referenceDate: Date): Record<string, boolean> {
  return buildHistory(new Set(), referenceDate);
}

describe('POST /api/habits', () => {
  let dbPath: string;
  let server: Awaited<ReturnType<typeof startServer>>['server'];
  let client: Awaited<ReturnType<typeof startServer>>['client'];
  let db: Awaited<ReturnType<typeof startServer>>['db'];
  let port: number;
  let baseUrl: string;

  before(async () => {
    dbPath = path.join(os.tmpdir(), `habit-tracker-post-habits-${randomUUID()}.db`);
    ({ server, client, db, port } = await startServer({ dbPath, port: 0 }));
    baseUrl = `http://127.0.0.1:${port}`;
  });

  after(() => {
    server.close();
    client.close();
    fs.unlinkSync(dbPath);
  });

  it('creates a habit and returns it', async () => {
    const response = await fetch(`${baseUrl}/api/habits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Exercise' }),
    });

    assert.equal(response.status, 201);

    const habit = (await response.json()) as Habit;
    assert.equal(habit.name, 'Exercise');
    assert.equal(typeof habit.id, 'number');
    assert.equal(typeof habit.created_at, 'string');

    const row = getHabitById(db, habit.id);
    assert.ok(row);
    assert.equal(row.id, habit.id);
    assert.equal(row.name, habit.name);
    assert.equal(row.created_at, habit.created_at);
  });

  it('returns 400 when name is missing', async () => {
    const response = await fetch(`${baseUrl}/api/habits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    assert.equal(response.status, 400);
  });
});

describe('GET /api/habits', () => {
  let dbPath: string;
  let server: Awaited<ReturnType<typeof startServer>>['server'];
  let client: Awaited<ReturnType<typeof startServer>>['client'];
  let db: Awaited<ReturnType<typeof startServer>>['db'];
  let port: number;
  let baseUrl: string;
  const today = new Date();

  before(async () => {
    dbPath = path.join(os.tmpdir(), `habit-tracker-get-habits-${randomUUID()}.db`);
    ({ server, client, db, port } = await startServer({ dbPath, port: 0 }));
    baseUrl = `http://127.0.0.1:${port}`;
  });

  after(() => {
    server.close();
    client.close();
    fs.unlinkSync(dbPath);
  });

  it('returns an empty array when there are no habits', async () => {
    const response = await fetch(`${baseUrl}/api/habits`);

    assert.equal(response.status, 200);

    const habits = (await response.json()) as HabitWithStats[];
    assert.deepEqual(habits, []);
  });

  it('returns all habits as a JSON array with streak and history', async () => {
    const created = await Promise.all(
      ['Exercise', 'Read'].map(async (name) => {
        const response = await fetch(`${baseUrl}/api/habits`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
        });
        assert.equal(response.status, 201);
        return (await response.json()) as Habit;
      }),
    );

    const response = await fetch(`${baseUrl}/api/habits`);

    assert.equal(response.status, 200);

    const habits = (await response.json()) as HabitWithStats[];
    assert.equal(habits.length, 2);
    assert.deepEqual(
      habits.map(({ id, name }) => ({ id, name })),
      created.map(({ id, name }) => ({ id, name })),
    );

    for (const habit of habits) {
      assert.equal(habit.currentStreak, 0);
      assert.deepEqual(habit.history, emptyHistory(today));
    }
  });

  it('includes currentStreak and last 7 days completion map', async () => {
    const createResponse = await fetch(`${baseUrl}/api/habits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Meditate' }),
    });
    assert.equal(createResponse.status, 201);
    const habit = (await createResponse.json()) as Habit;

    const todayKey = formatDateLocal(today);
    const yesterdayKey = formatDateLocal(addDays(today, -1));
    const twoDaysAgoKey = formatDateLocal(addDays(today, -2));

    addCompletion(db, habit.id, todayKey);
    addCompletion(db, habit.id, yesterdayKey);
    addCompletion(db, habit.id, twoDaysAgoKey);

    const response = await fetch(`${baseUrl}/api/habits`);
    assert.equal(response.status, 200);

    const habits = (await response.json()) as HabitWithStats[];
    const enriched = habits.find((h) => h.name === 'Meditate');
    assert.ok(enriched);

    assert.equal(enriched.currentStreak, 3);
    assert.equal(Object.keys(enriched.history).length, 7);
    assert.equal(enriched.history[todayKey], true);
    assert.equal(enriched.history[yesterdayKey], true);
    assert.equal(enriched.history[twoDaysAgoKey], true);
    assert.equal(enriched.history[formatDateLocal(addDays(today, -3))], false);
  });

  it('counts streak from yesterday when today is not completed', async () => {
    const createResponse = await fetch(`${baseUrl}/api/habits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Journal' }),
    });
    assert.equal(createResponse.status, 201);
    const habit = (await createResponse.json()) as Habit;

    addCompletion(db, habit.id, formatDateLocal(addDays(today, -1)));
    addCompletion(db, habit.id, formatDateLocal(addDays(today, -2)));

    const response = await fetch(`${baseUrl}/api/habits`);
    assert.equal(response.status, 200);

    const habits = (await response.json()) as HabitWithStats[];
    const enriched = habits.find((h) => h.name === 'Journal');
    assert.ok(enriched);
    assert.equal(enriched.currentStreak, 2);
  });
});

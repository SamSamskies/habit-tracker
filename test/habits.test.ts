import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { Habit } from '../src/db.ts';
import { getHabitById } from '../src/db.ts';
import { startServer } from '../src/server.ts';

describe('POST /habits', () => {
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
    const response = await fetch(`${baseUrl}/habits`, {
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
    const response = await fetch(`${baseUrl}/habits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    assert.equal(response.status, 400);
  });
});

describe('GET /habits', () => {
  let dbPath: string;
  let server: Awaited<ReturnType<typeof startServer>>['server'];
  let client: Awaited<ReturnType<typeof startServer>>['client'];
  let port: number;
  let baseUrl: string;

  before(async () => {
    dbPath = path.join(os.tmpdir(), `habit-tracker-get-habits-${randomUUID()}.db`);
    ({ server, client, port } = await startServer({ dbPath, port: 0 }));
    baseUrl = `http://127.0.0.1:${port}`;
  });

  after(() => {
    server.close();
    client.close();
    fs.unlinkSync(dbPath);
  });

  it('returns an empty array when there are no habits', async () => {
    const response = await fetch(`${baseUrl}/habits`);

    assert.equal(response.status, 200);

    const habits = (await response.json()) as Habit[];
    assert.deepEqual(habits, []);
  });

  it('returns all habits as a JSON array', async () => {
    const created = await Promise.all(
      ['Exercise', 'Read'].map(async (name) => {
        const response = await fetch(`${baseUrl}/habits`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
        });
        assert.equal(response.status, 201);
        return (await response.json()) as Habit;
      }),
    );

    const response = await fetch(`${baseUrl}/habits`);

    assert.equal(response.status, 200);

    const habits = (await response.json()) as Habit[];
    assert.equal(habits.length, 2);
    assert.deepEqual(
      habits.map(({ id, name }) => ({ id, name })),
      created.map(({ id, name }) => ({ id, name })),
    );
  });
});

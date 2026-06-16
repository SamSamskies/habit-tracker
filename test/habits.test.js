const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { startServer } = require('../server');

describe('POST /habits', () => {
  let dbPath;
  let server;
  let db;
  let port;
  let baseUrl;

  before(async () => {
    dbPath = path.join(os.tmpdir(), `habit-tracker-post-habits-${randomUUID()}.db`);
    ({ server, db, port } = await startServer({ dbPath, port: 0 }));
    baseUrl = `http://127.0.0.1:${port}`;
  });

  after(() => {
    server.close();
    db.close();
    fs.unlinkSync(dbPath);
  });

  it('creates a habit and returns it', async () => {
    const response = await fetch(`${baseUrl}/habits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Exercise' }),
    });

    assert.equal(response.status, 201);

    const habit = await response.json();
    assert.equal(habit.name, 'Exercise');
    assert.equal(typeof habit.id, 'number');
    assert.equal(typeof habit.created_at, 'string');

    const row = db.prepare('SELECT id, name, created_at FROM habits WHERE id = ?').get(habit.id);
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

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { startServer } from '../src/server.ts';

describe('GET /', () => {
  let dbPath: string;
  let server: Awaited<ReturnType<typeof startServer>>['server'];
  let client: Awaited<ReturnType<typeof startServer>>['client'];
  let port: number;
  let baseUrl: string;

  before(async () => {
    dbPath = path.join(os.tmpdir(), `habit-tracker-static-${randomUUID()}.db`);
    ({ server, client, port } = await startServer({ dbPath, port: 0 }));
    baseUrl = `http://127.0.0.1:${port}`;
  });

  after(() => {
    server.close();
    client.close();
    fs.unlinkSync(dbPath);
  });

  it('serves the habit tracker page', async () => {
    const response = await fetch(`${baseUrl}/`);

    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type') ?? '', /text\/html/);

    const html = await response.text();
    assert.match(html, /Habit Tracker/);
  });
});

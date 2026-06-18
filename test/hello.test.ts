import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { initDb, setWord } from '../src/db.ts';
import { startServer } from '../src/server.ts';

describe('GET /hello', () => {
  let dbPath: string;
  let server: Awaited<ReturnType<typeof startServer>>['server'];
  let client: Awaited<ReturnType<typeof startServer>>['client'];
  let port: number;
  let baseUrl: string;

  before(async () => {
    dbPath = path.join(os.tmpdir(), `habit-tracker-test-${Date.now()}.db`);

    const { client: seedClient, db: seedDb } = initDb(dbPath);
    setWord(seedDb, 'world');
    seedClient.close();

    ({ server, client, port } = await startServer({ dbPath, port: 0 }));
    baseUrl = `http://127.0.0.1:${port}`;
  });

  after(() => {
    server.close();
    client.close();
    fs.unlinkSync(dbPath);
  });

  it('returns hello with the word from the database', async () => {
    const response = await fetch(`${baseUrl}/hello`);
    assert.equal(response.status, 200);

    const body = await response.text();
    assert.equal(body, 'hello world');
  });
});

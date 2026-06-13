const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { initDb, setWord } = require('../db');
const { startServer } = require('../server');

describe('GET /hello', () => {
  let dbPath;
  let server;
  let db;
  let port;
  let baseUrl;

  before(async () => {
    dbPath = path.join(os.tmpdir(), `habit-tracker-test-${Date.now()}.db`);

    const seedDb = initDb(dbPath);
    setWord(seedDb, 'world');
    seedDb.close();

    ({ server, db, port } = await startServer({ dbPath, port: 0 }));
    baseUrl = `http://127.0.0.1:${port}`;
  });

  after(() => {
    server.close();
    db.close();
    fs.unlinkSync(dbPath);
  });

  it('returns hello with the word from the database', async () => {
    const response = await fetch(`${baseUrl}/hello`);
    assert.equal(response.status, 200);

    const body = await response.text();
    assert.equal(body, 'hello world');
  });
});

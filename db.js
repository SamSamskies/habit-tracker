const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const DEFAULT_DB_PATH = path.join(__dirname, 'habits.db');

function initDb(dbPath = DEFAULT_DB_PATH) {
  const db = new DatabaseSync(dbPath);

  db.exec(`
    CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  return db;
}

function getWord(db) {
  const row = db.prepare('SELECT value FROM config WHERE key = ?').get('hello_word');
  return row ? row.value : null;
}

function setWord(db, word) {
  db.prepare(`
    INSERT INTO config (key, value) VALUES ('hello_word', ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(word);
}

module.exports = { initDb, getWord, setWord, DEFAULT_DB_PATH };

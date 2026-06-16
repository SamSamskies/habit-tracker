const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const DEFAULT_DB_PATH = path.join(__dirname, 'habits.db');

function initDb(dbPath = DEFAULT_DB_PATH) {
  const db = new DatabaseSync(dbPath);

  db.exec(`
    CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS habits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  return db;
}

function createHabit(db, name) {
  const result = db.prepare('INSERT INTO habits (name) VALUES (?)').run(name);
  return db.prepare('SELECT id, name, created_at FROM habits WHERE id = ?').get(result.lastInsertRowid);
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

module.exports = { initDb, getWord, setWord, createHabit, DEFAULT_DB_PATH };

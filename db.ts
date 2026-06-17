import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const DEFAULT_DB_PATH = path.join(__dirname, 'habits.db');

export interface Habit {
  id: number;
  name: string;
  created_at: string;
}

export function initDb(dbPath: string = DEFAULT_DB_PATH): DatabaseSync {
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

export function createHabit(db: DatabaseSync, name: string): Habit {
  const result = db.prepare('INSERT INTO habits (name) VALUES (?)').run(name);
  const habit = db
    .prepare('SELECT id, name, created_at FROM habits WHERE id = ?')
    .get(result.lastInsertRowid) as Habit | undefined;
  if (!habit) {
    throw new Error('Failed to create habit');
  }
  return habit;
}

export function getWord(db: DatabaseSync): string | null {
  const row = db.prepare('SELECT value FROM config WHERE key = ?').get('hello_word') as
    | { value: string }
    | undefined;
  return row ? row.value : null;
}

export function setWord(db: DatabaseSync, word: string): void {
  db.prepare(`
    INSERT INTO config (key, value) VALUES ('hello_word', ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(word);
}

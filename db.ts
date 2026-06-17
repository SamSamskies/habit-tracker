import { eq } from 'drizzle-orm';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import Database from 'better-sqlite3';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as schema from './schema.ts';
import { config, habits } from './schema.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_FOLDER = path.join(__dirname, 'drizzle');

export const DEFAULT_DB_PATH = path.join(__dirname, 'habits.db');

export type Habit = typeof habits.$inferSelect;
export type Db = BetterSQLite3Database<typeof schema>;

export interface DbConnection {
  client: Database.Database;
  db: Db;
}

export function initDb(dbPath: string = DEFAULT_DB_PATH): DbConnection {
  const client = new Database(dbPath);
  const db = drizzle(client, { schema });

  migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });

  return { client, db };
}

export function createHabit(db: Db, name: string): Habit {
  const habit = db.insert(habits).values({ name }).returning().get();
  if (!habit) {
    throw new Error('Failed to create habit');
  }
  return habit;
}

export function getHabitById(db: Db, id: number): Habit | undefined {
  return db.select().from(habits).where(eq(habits.id, id)).get();
}

export function getWord(db: Db): string | null {
  const row = db
    .select({ value: config.value })
    .from(config)
    .where(eq(config.key, 'hello_word'))
    .get();
  return row?.value ?? null;
}

export function setWord(db: Db, word: string): void {
  db.insert(config)
    .values({ key: 'hello_word', value: word })
    .onConflictDoUpdate({
      target: config.key,
      set: { value: word },
    })
    .run();
}

import { eq, inArray } from 'drizzle-orm';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import Database from 'better-sqlite3';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as schema from './schema.ts';
import { completions, habits } from './schema.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_FOLDER = path.join(__dirname, '..', 'drizzle');

export const DEFAULT_DB_PATH = path.join(__dirname, '..', 'habits.db');

export type Habit = typeof habits.$inferSelect;
export type Db = BetterSQLite3Database<typeof schema>;

export type HabitWithStats = Habit & {
  currentStreak: number;
  history: Record<string, boolean>;
};

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

export function getCompletionsForHabit(db: Db, habitId: number) {
  return db
    .select()
    .from(completions)
    .where(eq(completions.habit_id, habitId))
    .all();
}

export function deleteHabit(db: Db, id: number): boolean {
  const result = db.delete(habits).where(eq(habits.id, id)).run();
  return result.changes > 0;
}

export function addCompletion(db: Db, habitId: number, date: string): void {
  db.insert(completions).values({ habit_id: habitId, date }).run();
}

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

function getLast7DayKeys(referenceDate: Date): string[] {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    days.push(formatDateLocal(addDays(referenceDate, -i)));
  }
  return days;
}

export function computeCurrentStreak(
  completedDates: Set<string>,
  referenceDate: Date,
): number {
  const today = formatDateLocal(referenceDate);
  const yesterday = formatDateLocal(addDays(referenceDate, -1));

  let cursor: Date | null = null;
  if (completedDates.has(today)) {
    cursor = referenceDate;
  } else if (completedDates.has(yesterday)) {
    cursor = addDays(referenceDate, -1);
  } else {
    return 0;
  }

  let streak = 0;
  while (cursor && completedDates.has(formatDateLocal(cursor))) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function buildHistory(
  completedDates: Set<string>,
  referenceDate: Date,
): Record<string, boolean> {
  const history: Record<string, boolean> = {};
  for (const date of getLast7DayKeys(referenceDate)) {
    history[date] = completedDates.has(date);
  }
  return history;
}

function getCompletionDatesByHabitId(
  db: Db,
  habitIds: number[],
): Map<number, Set<string>> {
  const map = new Map<number, Set<string>>();
  for (const id of habitIds) {
    map.set(id, new Set());
  }

  if (habitIds.length === 0) {
    return map;
  }

  const rows = db
    .select()
    .from(completions)
    .where(inArray(completions.habit_id, habitIds))
    .all();

  for (const row of rows) {
    map.get(row.habit_id)?.add(row.date);
  }

  return map;
}

export function getHabits(
  db: Db,
  referenceDate: Date = new Date(),
): HabitWithStats[] {
  const rows = db.select().from(habits).all();
  const completionDatesByHabitId = getCompletionDatesByHabitId(
    db,
    rows.map((row) => row.id),
  );

  return rows.map((habit) => {
    const completedDates = completionDatesByHabitId.get(habit.id) ?? new Set();
    return {
      ...habit,
      currentStreak: computeCurrentStreak(completedDates, referenceDate),
      history: buildHistory(completedDates, referenceDate),
    };
  });
}

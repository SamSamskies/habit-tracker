import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text, unique } from 'drizzle-orm/sqlite-core';

export const habits = sqliteTable('habits', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  created_at: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const completions = sqliteTable(
  'completions',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    habit_id: integer('habit_id')
      .notNull()
      .references(() => habits.id, { onDelete: 'cascade' }),
    date: text('date').notNull(),
  },
  (table) => [unique().on(table.habit_id, table.date)],
);

import express from 'express';
import type { Request, Response } from 'express';
import { fileURLToPath } from 'node:url';
import {
  initDb,
  createHabit,
  deleteHabit,
  getHabitById,
  getHabits,
  toggleCompletion,
  DEFAULT_DB_PATH,
  type Db,
  type DbConnection,
} from './db.ts';

export function createApp(db: Db) {
  const app = express();
  app.use(express.json());

  app.get('/api/habits', (_req: Request, res: Response) => {
    res.json(getHabits(db));
  });

  app.post('/api/habits', (req: Request, res: Response) => {
    const name = req.body?.name;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'name is required' });
    }

    const habit = createHabit(db, name.trim());
    res.status(201).json(habit);
  });

  app.delete('/api/habits/:id', (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'invalid id' });
    }

    if (!deleteHabit(db, id)) {
      return res.status(404).json({ error: 'habit not found' });
    }

    res.status(204).send();
  });

  app.post('/api/habits/:id/toggle', (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'invalid id' });
    }

    const date = req.body?.date;
    if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'invalid date' });
    }

    if (!getHabitById(db, id)) {
      return res.status(404).json({ error: 'habit not found' });
    }

    const completed = toggleCompletion(db, id, date);
    res.json({ habitId: id, date, completed });
  });

  return app;
}

interface StartServerOptions {
  dbPath?: string;
  port?: number | string;
}

export function startServer({
  dbPath = DEFAULT_DB_PATH,
  port = process.env.PORT || 3000,
}: StartServerOptions = {}) {
  const { client, db }: DbConnection = initDb(dbPath);
  const app = createApp(db);

  return new Promise<{
    server: ReturnType<ReturnType<typeof createApp>['listen']>;
    app: ReturnType<typeof createApp>;
    client: DbConnection['client'];
    db: Db;
    port: number;
  }>((resolve) => {
    const server = app.listen(port, () => {
      const address = server.address();
      const resolvedPort = typeof address === 'object' && address ? address.port : Number(port);
      resolve({ server, app, client, db, port: resolvedPort });
    });
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { db } = initDb();
  const app = createApp(db);
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
  });
}

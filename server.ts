import express from 'express';
import type { Request, Response } from 'express';
import { fileURLToPath } from 'node:url';
import {
  initDb,
  getWord,
  setWord,
  createHabit,
  DEFAULT_DB_PATH,
  type Db,
  type DbConnection,
} from './db.ts';

export function createApp(db: Db) {
  const app = express();
  app.use(express.json());

  app.post('/habits', (req: Request, res: Response) => {
    const name = req.body?.name;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'name is required' });
    }

    const habit = createHabit(db, name.trim());
    res.status(201).json(habit);
  });

  app.get('/hello', (_req: Request, res: Response) => {
    const word = getWord(db);
    res.send(`hello ${word}`);
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
  if (!getWord(db)) {
    setWord(db, 'world');
  }

  const app = createApp(db);
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
  });
}

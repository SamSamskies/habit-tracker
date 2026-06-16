const express = require('express');
const { initDb, getWord, setWord, createHabit, DEFAULT_DB_PATH } = require('./db');

function createApp(db) {
  const app = express();
  app.use(express.json());

  app.post('/habits', (req, res) => {
    const name = req.body?.name;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'name is required' });
    }

    const habit = createHabit(db, name.trim());
    res.status(201).json(habit);
  });

  app.get('/hello', (req, res) => {
    const word = getWord(db);
    res.send(`hello ${word}`);
  });

  return app;
}

function startServer({ dbPath = DEFAULT_DB_PATH, port = process.env.PORT || 3000 } = {}) {
  const db = initDb(dbPath);
  const app = createApp(db);

  return new Promise((resolve) => {
    const server = app.listen(port, () => {
      resolve({ server, app, db, port: server.address().port });
    });
  });
}

if (require.main === module) {
  const db = initDb();
  if (!getWord(db)) {
    setWord(db, 'world');
  }

  const app = createApp(db);
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
  });
}

module.exports = { createApp, startServer };

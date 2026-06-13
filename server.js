const express = require('express');
const { initDb, getWord, setWord, DEFAULT_DB_PATH } = require('./db');

function createApp(db) {
  const app = express();

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

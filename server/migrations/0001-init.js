const sql = require('sql-template-strings')

exports.default = {
  async up(db) {
    await db.exec(`
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        username TEXT NULL DEFAULT NULL,
        password TEXT NULL DEFAULT NULL,
        createdAt INTEGER,
        UNIQUE(username)
      );

      CREATE TABLE patches (
        id TEXT,
        version INTEGER DEFAULT 1,
        authorId TEXT,
        forkId INTEGER NULL DEFAULT NULL,
        name TEXT,
        patch TEXT,
        createdAt INTEGER,
        PRIMARY KEY(id, version),
        FOREIGN KEY(forkId) REFERENCES forks(id),
        FOREIGN KEY(authorId) REFERENCES users(id)
      );

      CREATE TABLE forks (
        id INTEGER PRIMARY KEY,
        patchId TEXT,
        version INTEGER,
        FOREIGN KEY(patchId) REFERENCES patches(id)
      );
    `)
  },

  async down(db) {
    await db.exec(`
    
    SELECT 1;
    
    `)
  },
}

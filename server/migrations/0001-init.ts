import { exec } from '../src/database'

export const up = async () => {
  await exec(`
    CREATE TABLE users (
      id TEXT NOT NULL PRIMARY KEY,
      username TEXT NOT NULL,
      email TEXT NOT NULL,
      password TEXT NOT NULL,
      createdAt INTEGER NOT NULL,
      UNIQUE(username),
      UNIQUE(email)
    );

    CREATE TABLE patches (
      id TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      authorId TEXT NOT NULL,
      forkId INTEGER NULL DEFAULT NULL,
      name TEXT NOT NULL,
      patch TEXT NOT NULL,
      createdAt INTEGER NOT NULL,
      PRIMARY KEY(id, version),
      FOREIGN KEY(forkId) REFERENCES forks(id),
      FOREIGN KEY(authorId) REFERENCES users(id)
    );

    CREATE TABLE forks (
      id INTEGER NOT NULL PRIMARY KEY,
      patchId TEXT NOT NULL,
      version INTEGER NOT NULL,
      FOREIGN KEY(patchId) REFERENCES patches(id)
    );
  `)
}

export const down = async ()=> {
  await exec(`
    SELECT 1;
  `)
}

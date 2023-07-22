import { exec } from '../src/database'

export const up = async () => {
  await exec(`
    CREATE TABLE samples (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      ownerId TEXT NOT NULL,
      createdAt INTEGER NOT NULL,
      FOREIGN KEY(ownerId) REFERENCES users(id)
    );
  `)
}

export const down = async ()=> {
  await exec(`
    SELECT 1;
  `)
}

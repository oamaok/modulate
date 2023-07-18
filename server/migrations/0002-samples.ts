import sql from 'sql-template-strings'
import { query } from '../src/database'

export const up = async () => {
  await query(sql`
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
  await query(sql`
  
  SELECT 1;
  
  `)
}

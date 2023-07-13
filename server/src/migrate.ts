import * as fs from 'fs/promises'
import * as path from 'path'
import * as logger from './logger'
import sql from 'sql-template-strings'

import { query } from './database'

const promisify =
  (fn: (...args: any) => any): ((...args: any) => any) =>
  (...args: any[]) =>
    new Promise((resolve, reject) => {
      try {
        fn(...args, (err: Error, res: any) => {
          if (err) {
            reject(err)
          } else {
            resolve(res)
          }
        })
      } catch (err) {
        reject(err)
      }
    })

const getMigrationVersion = (filename: string) =>
  parseInt(filename.split('-')[0]!)

const migrate = async () => {
  await query(
    sql`CREATE TABLE IF NOT EXISTS version (version INTEGER PRIMARY KEY DEFAULT 0)`
  )
  {
    const [res] = await query<{ count: number }>(
      sql`SELECT COUNT(*) AS count FROM version`
    )
    if (res?.count === 0) {
      await query(sql`INSERT INTO version (version) VALUES (0)`)
    }
  }

  const [res] = await query<{ version: number }>(
    sql`SELECT version FROM version`
  )
  const version = res?.version ?? 0

  const migrationFiles = await fs.readdir(
    path.resolve(__dirname, '../migrations')
  )

  const applicableMigrations = migrationFiles
    .filter((filename) => getMigrationVersion(filename) > version)
    .sort()

  if (applicableMigrations.length === 0) {
    logger.info('No migrations to run.')
    return
  }

  for (const migration of applicableMigrations) {
    logger.info('Running migration ', migration)
    await query(sql`BEGIN`)
    try {
      const { up } = await import(`../migrations/${migration}`)
      await up()
      await query(
        sql`UPDATE version SET version = ${getMigrationVersion(migration)}`
      )
      await query(sql`COMMIT`)
    } catch (err) {
      await query(sql`ROLLBACK`)
      logger.error('Failed to run migration ', migration)
      logger.error(err)
      return
    }
  }
}
export default migrate

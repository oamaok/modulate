import fs from 'fs/promises'
import path from 'path'
import * as logger from './logger'

import { database } from './database'

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

const getDatabase = () => {
  return {
    run: promisify(database.run.bind(database)),
    get: promisify(database.get.bind(database)) as (...args: any) => any,
    all: promisify(database.all.bind(database)),
    exec: promisify(database.exec.bind(database)),
  }
}

const getMigrationVersion = (filename: string) =>
  parseInt(filename.split('-')[0])

const migrate = async () => {
  const db = getDatabase()

  await db.run(
    'CREATE TABLE IF NOT EXISTS version (version INTEGER PRIMARY KEY DEFAULT 0)'
  )
  const { count } = await db.get('SELECT COUNT(*) AS count FROM version')
  if (count === 0) {
    await db.run('INSERT INTO version (version) VALUES (0)')
  }
  const { version } = await db.get('SELECT version FROM version')

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
    await db.run('BEGIN')
    try {
      const {
        default: { up },
      } = require(`../migrations/${migration}`)
      await up({
        query(query: any, parameters: any[]) {
          if (typeof query === 'object') {
            return db.all(query.sql, query.values)
          } else {
            return db.all(query, parameters)
          }
        },
        run(query: any, parameters: any[]) {
          if (typeof query === 'object') {
            return db.run(query.sql, query.values)
          } else {
            return db.run(query, parameters)
          }
        },
        exec(query: any) {
          logger.info(query)
          return db.exec(query)
        },
      })
      await db.run('UPDATE version SET version = ?', [
        getMigrationVersion(migration),
      ])
      await db.run('COMMIT')
    } catch (err) {
      await db.run('ROLLBACK')
      logger.error('Failed to run migration ', migration)
      logger.error(err)
      return
    }
  }
}
export default migrate

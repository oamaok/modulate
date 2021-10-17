const sqlite = require('sqlite3').verbose()
const fs = require('fs/promises')
const path = require('path')

const promisify =
  (fn) =>
  (...args) =>
    new Promise((resolve, reject) => {
      try {
        fn(...args, (err, res) => {
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
  const db = new sqlite.Database(
    path.resolve(__dirname, '../../data/database.sqlite3')
  )

  return {
    run: promisify(db.run.bind(db)),
    get: promisify(db.get.bind(db)),
    all: promisify(db.all.bind(db)),
    exec: promisify(db.exec.bind(db)),
  }
}

const getMigrationVersion = (filename) => parseInt(filename.split('-')[0])

;(async () => {
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
    console.log('No migrations to run.')
    return
  }

  for (const migration of applicableMigrations) {
    console.log('Running migration ', migration)
    await db.run('BEGIN')
    try {
      const {
        default: { up },
      } = require(`../migrations/${migration}`)
      await up({
        query(query, parameters) {
          if (typeof query === 'object') {
            return db.all(query.sql, query.values)
          } else {
            return db.all(query, parameters)
          }
        },
        run(query, parameters) {
          if (typeof query === 'object') {
            return db.run(query.sql, query.values)
          } else {
            return db.run(query, parameters)
          }
        },
        exec(query) {
          console.log(query)
          return db.exec(query)
        },
      })
      await db.run('UPDATE version SET version = ?', [
        getMigrationVersion(migration),
      ])
      await db.run('COMMIT')
    } catch (err) {
      await db.run('ROLLBACK')
      console.error('Failed to run migration ', migration)
      console.error(err)
      return
    }
  }
})()

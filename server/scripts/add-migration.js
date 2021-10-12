const fs = require('fs/promises')
const path = require('path')

const migrationName = process.argv[2]

;(async () => {
  const migrationDirectory = path.resolve(__dirname, '../migrations')
  const migrations = await fs.readdir(migrationDirectory)
  const nextId =
    Math.max(
      0,
      ...migrations.map((migration) => parseInt(migration.split('-')[0]))
    ) + 1

  const fileName = `${nextId.toString().padStart(4, '0')}-${migrationName}.js`

  await fs.writeFile(
    path.join(migrationDirectory, fileName),
    await fs.readFile(path.resolve(__dirname, './migration-template.js'))
  )

  console.log(`Created migration file "${fileName}".`)
})()

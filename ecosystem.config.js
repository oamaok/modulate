const path = require('path')
const os = require('os')

module.exports = {
  apps: [
    {
      name: 'modulate-server',
      script: 'yarn',
      args: 'ts-node ./server/src/index.ts',
      env_production: {
        NODE_ENV: 'production',
        DATABASE_FILE: path.resolve(os.homedir(), 'database.sqlite3'),
        SAMPLE_DIRECTORY: path.resolve(os.homedir(), 'samples'),
        JWT_KEY_FILE: path.resolve(os.homedir(), 'jwt.key'),
      },
    },
  ],
}

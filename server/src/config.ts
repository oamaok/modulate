import * as path from 'path'

const config = {
  port: parseInt(process.env.SERVER_PORT ?? '') || 8888,
  enableTLS: process.env.ENABLE_TLS === 'true',
  databaseFile:
    process.env.DATABASE_FILE ??
    path.resolve(__dirname, '../../data', 'database.sqlite3'),
  jwtKeyFile:
    process.env.JWT_KEY_FILE ??
    path.resolve(__dirname, '../../data', 'jwt.key'),
  sampleDirectory:
    process.env.SAMPLE_DIRECTORY ??
    path.resolve(__dirname, '../../data', 'samples'),
}

export default config

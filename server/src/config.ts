import * as path from 'path'

const config = {
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

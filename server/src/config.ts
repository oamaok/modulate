import * as assert from 'assert'

assert.ok(process.env.JWT_KEY, 'Environment variable JWT_KEY must be set!')
assert.ok(
  process.env.SERVER_PORT,
  'Environment variable SERVER_PORT must be set!'
)
assert.ok(
  process.env.DATABASE_FILE,
  'Environment variable DATABASE_FILE must be set!'
)
assert.ok(
  process.env.SAMPLE_DIRECTORY,
  'Environment variable SAMPLE_DIRECTORY must be set!'
)

const config = {
  port: parseInt(process.env.SERVER_PORT),
  enableTLS: process.env.ENABLE_TLS === 'true',
  databaseFile: process.env.DATABASE_FILE,
  jwtKey: process.env.JWT_KEY,
  sampleDirectory: process.env.SAMPLE_DIRECTORY,
}

assert.ok(
  !isNaN(config.port),
  'Environment variable SERVER_PORT must be a valid number!'
)

export default config

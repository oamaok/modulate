const path = require('path')
const tsPreset = require('ts-jest/jest-preset')
const puppeteerPreset = require('jest-puppeteer/jest-preset')

process.env.DATABASE_FILE = path.resolve(__dirname, '../data/test-db.sqlite3')
process.env.JWT_KEY_FILE = path.resolve(__dirname, '../data/test-key.key')
process.env.SAMPLE_DIRECTORY = path.resolve(__dirname, '../data/test-samples')

module.exports = {
  ...tsPreset,
  ...puppeteerPreset,
  testTimeout: 10000,
}

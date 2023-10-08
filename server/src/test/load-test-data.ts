import { Patch } from '@modulate/common/types'
import * as db from '../database'
//import samplePatch from './fixtures/patch.json'

const TEST_USERS = [
  {
    username: 'alice',
    email: 'alice@example.com',
    password: 'password',
  },
  {
    username: 'bob',
    email: 'bob@example.com',
    password: 'password',
  },
  {
    username: 'carlos',
    email: 'carlos@example.com',
    password: 'password',
  },
]

const loadTestData = async () => {
  console.log('Loading test data...')
  console.time('Test data loaded')

  for (const user of TEST_USERS) {
    await db.createUser(user)
  }

  const alice = await db.findUserByEmail('alice@example.com')

  if (!alice) {
    throw Error('Failed to load user data')
  }
  const samplePatch = await import('./fixtures/patch.json')

  await db.saveNewPatch(
    alice.id,
    {
      id: '9982d3c7-8ffd-43a7-8431-53d6a31de913',
      name: 'Sample patch',
      author: {
        id: alice.id,
        username: alice.username,
      },
    },
    samplePatch as Patch
  )

  console.timeEnd('Test data loaded')
}

export default loadTestData

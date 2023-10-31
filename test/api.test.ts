import server from '@modulate/server/src'
import migrate from '@modulate/server/src/migrate'
import * as db from '@modulate/server/src/database'
import * as util from '@modulate/common/util'
import fetch from 'node-fetch'

import * as fixtures from './fixtures'

const PORT = 8889

beforeAll(() => {
  server.listen(PORT)
})

beforeEach(async () => {
  await db.resetDatabase()
  await migrate()
})

afterAll(async () => {
  await server.close()
})

const post = async (
  path: string,
  body: Record<string, any>,
  authorization?: string
) => {
  const res = await fetch(`http://localhost:${PORT}${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: authorization ? `Bearer ${authorization}` : '',
    },
    body: JSON.stringify(body),
  })

  return [await res.json(), res.status]
}

const get = async (path: string, authorization?: string) => {
  const res = await fetch(`http://localhost:${PORT}${path}`, {
    method: 'GET',
    headers: {
      authorization: authorization ? `Bearer ${authorization}` : '',
    },
  })
  return [await res.json(), res.status]
}

const TEST_USERNAME = 'test'
const TEST_PASSWORD = 'password'
const TEST_EMAIL = 'test@example.com'

const createTestAccount = () => {
  return post('/api/user', {
    username: TEST_USERNAME,
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  })
}

describe('API', () => {
  it('should be able to create a new account', async () => {
    const [res, code] = await createTestAccount()

    expect(code).toEqual(200)
    expect(res).toHaveProperty('token')
    expect(res).toHaveProperty('user')
    expect(res.user.username).toEqual('test')
  })

  it('should be able to login', async () => {
    await createTestAccount()

    const [res, code] = await post('/api/user/login', {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    })

    expect(code).toEqual(200)
    expect(res).toHaveProperty('token')
    expect(res).toHaveProperty('user')
    expect(res.user.username).toEqual('test')
  })

  it('should not be able to login with invalid password', async () => {
    await createTestAccount()

    const [res, code] = await post('/api/user/login', {
      email: TEST_EMAIL,
      password: 'invalid password',
    })

    expect(code).toEqual(401)
    expect(res).not.toHaveProperty('token')
    expect(res).not.toHaveProperty('user')
  })

  it('should be able to save a patch', async () => {
    const [{ token }] = await createTestAccount()
    const [res, code] = await post('/api/patch', fixtures.newPatch, token)

    expect(code).toEqual(200)
    expect(res).toHaveProperty('id')
    expect(res.version).toEqual(0)
  })

  it('should not be able to save a patch while not logged in', async () => {
    const [res, code] = await post('/api/patch', fixtures.newPatch)
    expect(code).toEqual(401)
  })

  it('should reject invalid patch', async () => {
    const [{ token }] = await createTestAccount()

    // Try deleting any of the fields in `patch`
    for (const key in fixtures.newPatch.patch) {
      const patchWithMissingField = util.cloneObject(fixtures.newPatch)
      delete patchWithMissingField.patch[
        key as keyof typeof patchWithMissingField.patch
      ]

      const [res, code] = await post('/api/patch', patchWithMissingField, token)
      expect(code).toEqual(400)
    }

    // Try deleting any of the fields in `metadata`
    for (const key in fixtures.newPatch.metadata) {
      const patchWithMissingField = util.cloneObject(fixtures.newPatch)
      delete patchWithMissingField.metadata[
        key as keyof typeof patchWithMissingField.metadata
      ]

      const [res, code] = await post('/api/patch', patchWithMissingField, token)
      expect(code).toEqual(400)
    }

    const [res, code] = await post(
      '/api/patch',
      { invalidPatch: 'foobar' },
      token
    )
    expect(code).toEqual(400)
  })

  it('should fail to get patch that does not exist', async () => {
    const [res, code] = await get(`/api/patch/does-not-exist/latest`)

    expect(code).toEqual(404)
  })

  it('should be able to get patch after saving', async () => {
    const [{ token, user }] = await createTestAccount()
    const [{ id }] = await post('/api/patch', fixtures.newPatch, token)

    const [res, code] = await get(`/api/patch/${id}/latest`, token)

    const expectedSavedPatch = util.cloneObject(fixtures.newPatch)
    expectedSavedPatch.metadata.id = id
    expectedSavedPatch.metadata.author = user

    expect(code).toEqual(200)
    expect(res).toEqual(expectedSavedPatch)
  })
})

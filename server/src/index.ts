import * as fs from 'fs/promises'
import * as path from 'path'
import * as http from 'http'
import * as t from 'io-ts'
import * as db from './database'
import * as validators from '@modulate/common/validators'
import * as auth from './authorization'
import * as logger from './logger'
import config from './config'
import router, { serverStatic, Response } from './router'
import migrate from './migrate'
import rooms, { createRoomUsingPatch } from './rooms'

const unauthorized = (res: Response) => {
  res.status(401)
  res.json({ error: 'unauthorized' })
  res.end()
}

const badRequest = (res: Response, reason = '') => {
  res.status(400)
  res.json({ error: 'bad request', reason })
  res.end()
}

const serverError = (res: Response) => {
  res.status(500)
  res.json({ error: 'server error' })
  res.end()
}

const ensureDirectoryExists = async (dir: string) => {
  try {
    const stat = await fs.stat(dir)
    if (!stat.isDirectory()) {
      throw new Error(`Path "${dir}" already exists and is not a directory`)
    }
  } catch (err) {
    if (err.code === 'ENOENT') {
      // Path doesn't exist, attempt to create
      await fs.mkdir(dir, { recursive: true })
    } else {
      throw err
    }
  }
}

const server = http.createServer(
  router()
    .get(
      '/*',
      serverStatic(path.join(__dirname, '../../dist/client/index.html'))
    )
    .get(
      '/assets/*',
      serverStatic(path.join(__dirname, '../../dist/client/assets'))
    )
    .get('/samples/*', serverStatic(config.sampleDirectory))
    .get('/api/identity', async (req, res) => {
      const { authorization } = req
      if (!authorization) {
        unauthorized(res)
        return
      }

      res.json({ user: authorization, token: auth.createToken(authorization) })
      res.end()
    })
    .get('/api/user/availability', async (req, res) => {
      const { email, username } = req.query

      if (typeof email === 'undefined' || typeof username === 'undefined') {
        badRequest(res)
        return
      }

      res.json({
        email: email.length !== 0 && (await db.isEmailAvailable(email)),
        username:
          username.length !== 0 && (await db.isUsernameAvailable(username)),
      })
      res.end()
    })
    .post('/api/user', validators.UserRegistration, async (req, res) => {
      const { authorization } = req
      if (authorization) {
        res.status(400)
        res.json({ error: 'cannot create an user while logged in' })
        res.end()
        return
      }

      const user = await db.createUser(req.body)

      res.json({ user, token: auth.createToken(user) })
      res.end()
    })
    .post('/api/user/login', validators.UserLogin, async (req, res) => {
      const { authorization } = req
      if (authorization) {
        res.status(400)
        res.json({ error: 'cannot login again while logged in' })
        res.end()
        return
      }

      const user = await db.loginUser(req.body)

      if (!user) {
        unauthorized(res)
        return
      }

      res.json({ user, token: auth.createToken(user) })
      res.end()
    })
    .get('/api/user/:userId/patches', async (req, res) => {
      const { userId } = req.parameters

      if (!userId) {
        badRequest(res)
        return
      }

      const patches = await db.getUserPatches(userId)

      res.json(patches)
      res.end()
    })
    .get('/api/patch/:patchId/latest', async (req, res) => {
      const { patchId } = req.parameters

      if (!patchId) {
        badRequest(res)
        return
      }

      const patch = await db.getLatestPatchVersion(patchId)

      res.json(patch)
      res.end()
    })
    .get('/api/patch/:id/:version', async (req, res) => {
      const { patchId, version } = req.parameters

      if (!patchId || !version) {
        badRequest(res)
        return
      }

      const patch = await db.getPatchVersion(patchId, parseInt(version))

      res.json(patch)
      res.end()
    })
    .post(
      '/api/patch',
      t.type({ metadata: validators.PatchMetadata, patch: validators.Patch }),
      async (req, res) => {
        const { authorization } = req
        if (!authorization) {
          unauthorized(res)
          return
        }

        const { patch, metadata } = req.body

        if (!metadata.id) {
          res.json(await db.saveNewPatch(authorization.id, metadata, patch))
          res.end()
          return
        }

        const latestVersion = await db.getLatestPatchVersion(metadata.id)

        if (!latestVersion) {
          badRequest(res)
          return
        }

        if (latestVersion.metadata.author?.id !== authorization.id) {
          unauthorized(res)
          return
        }

        res.json(await db.savePatchVersion(authorization.id, metadata, patch))
        res.end()
      }
    )
    .get('/api/room/:patchId', async (req, res) => {
      const { authorization } = req
      if (!authorization) {
        unauthorized(res)
        return
      }

      const { patchId } = req.parameters

      if (!patchId) {
        badRequest(res)
        return
      }

      const roomId = await createRoomUsingPatch(authorization, patchId)

      res.json({ roomId })
      res.end()
    })
    .post(
      '/api/sample',
      t.type({ name: t.string, buffer: t.any }),
      async (req, res) => {
        const { authorization } = req
        if (!authorization) {
          unauthorized(res)
          return
        }

        const MAX_LENGTH = 44100 * 20 * 4 // Max 20 seconds
        if (req.body.buffer.length > MAX_LENGTH) {
          badRequest(res, 'buffer too long, max 20s')
          return
        }

        const metadata = await db.saveSampleMetadata({
          name: req.body.name,
          ownerId: authorization.id,
        })

        try {
          await fs.writeFile(
            path.join(config.sampleDirectory, metadata.id),
            req.body.buffer
          )
          res.json(metadata)
          res.end()
        } catch (err) {
          logger.error(err)
          serverError(res)
        }
      }
    )
    .get('/api/sample/:id', async (req, res) => {
      const { id } = req.parameters
      if (!id) {
        badRequest(res)
        return
      }

      const metadata = await db.getSampleMetadataById(id)
      if (!metadata) {
        res.status(404)
        res.json({ error: 'not found' })
        res.end()
        return
      }

      res.json({
        id: metadata.id,
        name: metadata.name,
      })
    })
    .get('/api/samples', async (req, res) => {
      const { authorization } = req

      // TODO: Add fetching for factory samples
      const factorySamples: db.SampleMetadata[] = []

      if (authorization) {
        const userSamples = await db.getSamplesByUser(authorization.id)

        res.json([...factorySamples, ...userSamples])
        res.end()
        return
      }

      res.json(factorySamples)
      res.end()
      return
    })
)

rooms(server)

if (require.main === module) {
  ;(async () => {
    await migrate()
    await ensureDirectoryExists(config.sampleDirectory)

    server.listen(8888)
    logger.info('Listening to :8888')
  })()
}

export default server

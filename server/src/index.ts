import * as path from 'path'
import * as http from 'http'
import * as t from 'io-ts'
import * as db from './database'
import * as validators from '@modulate/common/validators'
import * as auth from './authorization'
import * as logger from './logger'
import router, { serverStatic, Response } from './router'
import migrate from './migrate'
import rooms, { createRoomUsingPatch } from './rooms'

const unauthorized = (res: Response) => {
  res.status(401)
  res.json({ error: 'unauthorized' })
  res.end()
}

const badRequest = (res: Response) => {
  res.status(400)
  res.json({ error: 'bad request' })
  res.end()
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
    .get(
      '/worklets/*',
      serverStatic(path.join(__dirname, '../../dist/client/worklets'))
    )
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

      if (!email || !username) {
        badRequest(res)
        return
      }

      res.json({
        email: await db.isEmailAvailable(email),
        username: await db.isUsernameAvailable(username),
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
)

rooms(server)

if (require.main === module) {
  ;(async () => {
    await migrate()
    server.listen(8888)
    logger.info('Listening to :8888')
  })()
}

export default server

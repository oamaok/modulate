import * as http from 'http'
import fs from 'fs'
import router, { serverStatic, Response } from './router'
import * as t from 'io-ts'
import * as db from './database'
import * as validators from '../../common/validators'
import * as auth from './authorization'
import migrate from './migrate'

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
    .get('/*', serverStatic('./dist/client/index.html'))
    .get('/assets/*', serverStatic('./dist/client/assets'))
    .get('/worklets/*', serverStatic('./dist/client/worklets'))
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
      res.json({
        email: await db.isEmailAvailable(req.query.email),
        username: await db.isUsernameAvailable(req.query.username),
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
      const patches = await db.getUserPatches(userId)

      res.json(patches)
      res.end()
    })
    .get('/api/patch/:patchId/latest', async (req, res) => {
      const { patchId } = req.parameters
      const patch = await db.getLatestPatchVersion(patchId)

      res.json(patch)
      res.end()
    })
    .get('/api/patch/:id/:version', async (req, res) => {
      const { patchId, version } = req.parameters
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
)

;(async () => {
  await migrate()
  server.listen(8888)
})()

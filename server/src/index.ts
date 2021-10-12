import * as http from 'http'
import router from './router'
import * as db from './database'
import jwt from 'jsonwebtoken'

const JWT_KEY = 'foo'

const server = http.createServer(
  router()
    .get('/*', './dist/client')
    .get('/api/identity', async (req, res) => {
      const { authorization } = req
      if (authorization) {
        res.json({ token: jwt.sign({ id: authorization.id }, 'TEMP_KEY') })
      } else {
        const userId = await db.createAnonymousUser()
        res.json({ token: jwt.sign({ id: userId }, 'TEMP_KEY') })
      }
      res.end()
    })
    .get('/api/user/:userId/patches', async (req, res) => {
      const { userId } = req.parameters
      const patches = await db.getUserPatches(userId)

      res.json(patches)
      res.end()
    })
    .get('/api/patch/:patchId/latest', (req, res) => {
      const { patchId } = req.parameters
      const patch = db.getLatestPatchVersion(patchId)

      res.json(patch)
      res.end()
    })
    .get('/api/patch/:id/:version', (req, res) => {
      const { patchId, version } = req.parameters
      const patch = db.getPatchVersion(patchId, parseInt(version))

      res.json(patch)
      res.end()
    })
    .post('/api/patch/:id', () => {})
)

server.listen(8888)

import * as http from 'http'
import router from './router'
import * as db from './database'
import * as validators from '../../common/validators'
import { Patch } from '../../common/types'
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
    .post('/api/patch/:id', async (req, res) => {
      console.log('bbb')
      const { authorization } = req
      if (!authorization) {
        res.status(403)
        res.end()
        return
      }

      const validationResult = validators.Patch.decode(req.body)

      if (validationResult._tag === 'Left') {
        res.status(400)
        res.end()
      } else {
        res.json(
          await db.savePatchVersion(
            authorization.id,
            req.parameters.id,
            validationResult.right
          )
        )
        res.end()
      }
    })
    .post('/api/patch', async (req, res) => {
      console.log('aaa')

      const { authorization } = req
      if (!authorization) {
        res.status(403)
        res.end()
        return
      }

      const validationResult = validators.Patch.decode(req.body)

      if (validationResult._tag === 'Left') {
        res.status(400)
        res.end()
      } else {
        res.json(
          await db.saveNewPatch(
            authorization.id,
            'untitled',
            validationResult.right
          )
        )
        res.end()
      }
    })
)

server.listen(8888)

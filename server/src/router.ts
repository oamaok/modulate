import { resolve } from 'path'
import { readFile } from 'fs/promises'
import * as http from 'http'
import jwt from 'jsonwebtoken'
import mimeTypes from './mime-types'

type RouterChain = ((
  req: http.IncomingMessage,
  res: http.ServerResponse
) => void) & {
  get(path: string, callback: Callback | string): RouterChain
  post(path: string, callback: Callback): RouterChain
}

type Request = {
  method: Method
  url: URL
  authorization: { id: string } | null
  wildcardMatch: string
  parameters: Record<string, string>
  headers: http.IncomingHttpHeaders
  body: any
}

type Response = {
  status(code: number): void
  send(value: string | number | Buffer): void
  json(value: any): void
  header(name: string, value: string): void
  end(): void
}

type Callback = (request: Request, response: Response) => void

type Segment =
  | { type: 'exact'; name: string }
  | { type: 'parameter'; name: string }
  | { type: 'wildcard' }

type Method = 'GET' | 'POST'

type Route = {
  method: Method
  segments: Segment[]
  callback: Callback
}

const parseRequestBody = (req: http.IncomingMessage) =>
  new Promise((resolve, reject) => {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk
    })

    req.on('end', () => {
      try {
        if (body === '') {
          resolve(null)
        } else {
          resolve(JSON.parse(body))
        }
      } catch (err) {
        reject(err)
      }
    })
  })

const getSegmentType = (segment: string): Segment['type'] => {
  if (segment === '*') return 'wildcard'
  if (segment[0] === ':') return 'parameter'
  return 'exact'
}

const pathToSegments = (path: string): Segment[] =>
  path.split('/').map((segment) => {
    const type = getSegmentType(segment)
    return {
      type,
      name: type === 'parameter' ? segment.substr(1) : segment,
    }
  })

const router = (): RouterChain => {
  const routes: Route[] = []

  const chain: RouterChain = async (
    req: http.IncomingMessage,
    res: http.ServerResponse
  ) => {
    const pBody = parseRequestBody(req)
    const url = new URL(
      req.url ?? '',
      `http://${req.headers.host ?? 'localhost'}`
    )

    const segments = url.pathname.split('/')

    let matchingRoutes: {
      route: Route
      parameters: Record<string, string>
      wildcardMatch: string
    }[] = []

    for (let i = 0; i < routes.length; i++) {
      const route = routes[i]

      let match = true
      let wildcardMatch = ''
      const parameters: Record<string, string> = {}

      for (let j = 0; j < route.segments.length; j++) {
        const routeSegment = route.segments[j]

        if (routeSegment.type === 'wildcard') {
          wildcardMatch = segments
            .slice(j)
            .filter((segment) => segment !== '..')
            .join('/')
          break
        }
        if (routeSegment.type === 'parameter') {
          parameters[routeSegment.name] = segments[j]
          continue
        }
        if (routeSegment.name !== segments[j]) {
          match = false
          break
        }
      }

      if (match) {
        matchingRoutes.push({
          route,
          parameters,
          wildcardMatch,
        })
      }
    }

    if (matchingRoutes.length === 0) {
      res.statusCode = 404
      res.write('404')
      res.end()
      return
    }

    matchingRoutes.sort(
      (a, b) => b.route.segments.length - a.route.segments.length
    )
    const match = matchingRoutes[0]
    const route = match.route

    let authorization: Request['authorization'] = null

    try {
      if (req.headers.authorization) {
        const [type, token] = req.headers.authorization.split(' ')
        if (type === 'Bearer') {
          authorization = jwt.verify(token, 'TEMP_KEY') as { id: string }
        }
      }
    } catch (err) {}

    route.callback(
      {
        method: req.method as Method,
        wildcardMatch: match.wildcardMatch,
        url,
        parameters: match.parameters,
        headers: req.headers,
        body: await pBody,
        authorization,
      },
      {
        status(code) {
          res.statusCode = code
        },
        json(data: any) {
          res.setHeader('Content-Type', 'application/json')
          res.write(JSON.stringify(data))
        },
        send: res.write.bind(res),
        end() {
          res.end()
        },
        header: res.setHeader.bind(res),
      }
    )
  }

  const addStaticRoute = (path: string, directory: string) => {
    routes.push({
      method: 'GET',
      callback: async (req, res) => {
        let data: Buffer
        const file = req.wildcardMatch || 'index.html'
        const path = resolve(directory, file)
        const ext = path.split('.').pop()

        const mimeType = ext
          ? mimeTypes[ext] ?? 'application/octet-stream'
          : 'application/octet-stream'

        try {
          data = await readFile(path)
        } catch (err) {
          res.status(404)
          res.send(404)
          res.end()
          return
        }
        res.header('Content-Type', mimeType)
        res.send(data)
        res.end()
      },
      segments: pathToSegments(path),
    })
  }

  const addRoute = (method: Method, path: string, callback: Callback) => {
    routes.push({
      method,
      callback,
      segments: pathToSegments(path),
    })
  }

  chain.get = (path, callback) => {
    if (typeof callback === 'string') {
      addStaticRoute(path, callback)
    } else {
      addRoute('GET', path, callback)
    }
    return chain
  }

  chain.post = (path, callback) => {
    addRoute('POST', path, callback)
    return chain
  }

  return chain
}

export default router

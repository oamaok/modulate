import { resolve } from 'path'
import { readFile, stat } from 'fs/promises'
import * as http from 'http'
import * as t from 'io-ts'
import * as auth from './authorization'
import * as logger from './logger'
import mimeTypes from './mime-types'
import { User } from '@modulate/common/types'

type RouterChain = ((
  req: http.IncomingMessage,
  res: http.ServerResponse
) => void) & {
  get(path: string, callback: GetCallback): RouterChain
  post<T extends t.Any>(
    path: string,
    validator: T,
    callback: PostCallback<T>
  ): RouterChain
}

type BaseRequest = {
  url: URL
  authorization: User | null
  wildcardMatch: string
  parameters: Record<string, string>
  query: Record<string, string>
  headers: http.IncomingHttpHeaders
}

type GetRequest = BaseRequest

type PostRequest<T extends t.Any> = BaseRequest & {
  body: t.TypeOf<T>
}

type Request = GetRequest | PostRequest<any>

export type Response = {
  status(code: number): void
  send(value: string | number | Buffer): void
  json(value: any): void
  header(name: string, value: string): void
  end(): void
}

type GetCallback = (request: GetRequest, response: Response) => void
type PostCallback<T extends t.Any> = (
  request: PostRequest<T>,
  response: Response
) => void

type Callback = (request: Request, response: Response) => void

type Segment =
  | { type: 'exact'; name: string }
  | { type: 'parameter'; name: string }
  | { type: 'wildcard' }

type PostRoute<T extends t.Any = t.Any> = {
  method: 'POST'
  validator: T
  segments: Segment[]
  callback: PostCallback<T>
}

type GetRoute = {
  method: 'GET'
  segments: Segment[]
  callback: Callback
}

type RouteMatch = {
  route: Route
  parameters: Record<string, string>
  wildcardMatch: string
}

export const serverStatic = (staticPath: string): GetCallback => {
  return async (req, res) => {
    const isDirectory = (await stat(staticPath)).isDirectory()

    let data: Buffer
    const file = req.wildcardMatch || 'index.html'
    const path = isDirectory ? resolve(staticPath, file) : staticPath
    const ext = path.split('.').pop()

    const mimeType = ext
      ? mimeTypes[ext] ?? 'application/octet-stream'
      : 'application/octet-stream'

    res.header('Cross-Origin-Opener-Policy', 'same-origin')
    res.header('Cross-Origin-Embedder-Policy', 'require-corp')

    try {
      data = await readFile(path)
    } catch (err) {
      res.status(404)
      res.send('404')
      res.end()
      return
    }
    res.header('Content-Type', mimeType + '; charset=utf-8')
    res.send(data)
    res.end()
  }
}

type Route = PostRoute | GetRoute

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

const parseQuery = (queryString: string): Record<string, string> => {
  const res: Record<string, string> = {}

  for (const [key, value] of queryString.split('&').map((part) => {
    const [key, value] = part.split('=') as [string, string]
    return [key, decodeURIComponent(value)] as [string, string]
  })) {
    res[key] = value
  }

  return res
}

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
    let url: URL
    try {
      url = new URL(req.url ?? '', `http://${req.headers.host ?? 'localhost'}`)
    } catch (err) {
      res.statusCode = 400
      res.write('400')
      res.end()
      return
    }

    const segments = url.pathname.split('/')

    const response: Response = {
      status(code) {
        res.statusCode = code
      },
      json(data: any) {
        res.setHeader('Content-Type', 'application/json')
        res.write(JSON.stringify(data))
      },
      send: res.write.bind(res),
      end: () => {
        logger.info(
          `${req.headers['X-Real-IP'] ?? req.socket.remoteAddress} ${
            req.method
          } ${url.pathname} [${res.statusCode}]`
        )
        res.end()
      },
      header: res.setHeader.bind(res),
    }

    let matchingRoutes: RouteMatch[] = []

    for (let i = 0; i < routes.length; i++) {
      const route = routes[i] as Route

      if (route.method !== req.method) {
        continue
      }

      let match = true
      let wildcardMatch = ''
      const parameters: Record<string, string> = {}

      for (let j = 0; j < route.segments.length; j++) {
        const routeSegment = route.segments[j] as Segment

        if (routeSegment.type === 'wildcard') {
          wildcardMatch = segments
            .slice(j)
            .filter((segment) => segment !== '..')
            .join('/')
          break
        }

        if (segments.length === j) {
          match = false
          break
        }

        if (routeSegment.type === 'parameter') {
          parameters[routeSegment.name] = segments[j] as string
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
      response.status(404)
      response.send('404')
      response.end()
      return
    }

    matchingRoutes.sort(
      (a, b) => b.route.segments.length - a.route.segments.length
    )
    const match = matchingRoutes[0] as RouteMatch
    const route = match.route

    let authorization: Request['authorization'] = null

    if (req.headers.authorization) {
      const [type, token] = req.headers.authorization.split(' ')
      if (type === 'Bearer' && token) {
        authorization = auth.verifyToken(token)
      }
    }

    const baseRequest: BaseRequest = {
      wildcardMatch: match.wildcardMatch,
      url,
      query: parseQuery(url.search),
      parameters: match.parameters,
      headers: req.headers,
      authorization,
    }

    switch (route.method) {
      case 'GET': {
        route.callback(baseRequest, response)
        break
      }

      case 'POST': {
        let body: any
        try {
          const validationResult = route.validator.decode(
            await parseRequestBody(req)
          )

          if (validationResult._tag === 'Left') {
            throw validationResult.left
          } else {
            body = validationResult.right
          }
        } catch (err) {
          response.status(400)
          response.json({ error: err })
          response.end()
          break
        }

        route.callback({ ...baseRequest, body }, response)
        break
      }
    }
  }

  chain.get = (path, callback) => {
    routes.push({
      method: 'GET',
      callback,
      segments: pathToSegments(path),
    })
    return chain
  }

  chain.post = <T extends t.Any>(
    path: string,
    validator: T,
    callback: PostCallback<T>
  ) => {
    routes.push({
      method: 'POST',
      validator,
      callback: callback as PostCallback<t.Any>,
      segments: pathToSegments(path),
    })
    return chain
  }

  return chain
}

export default router

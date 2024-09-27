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
  get<Route extends string>(
    path: Route,
    callback: GetCallback<Route>
  ): RouterChain
  post<Route extends string, T extends t.Any>(
    path: Route,
    validator: T,
    callback: PostCallback<Route, T>
  ): RouterChain
}

type StripSlash<S> = S extends `/${infer R}` ? R : S
type ParamOf<S> = StripSlash<S> extends `:${infer P}` ? P : never

type RouteParamNames<Route extends string> =
  Route extends `${infer Segment}/${infer Rest}`
    ? ParamOf<Segment> | RouteParamNames<Rest>
    : ParamOf<Route>

type RouteParams<Route extends string> =
  RouteParamNames<Route> extends string
    ? { [x in RouteParamNames<Route>]: string }
    : {}

type BaseRequest<Route extends string> = {
  url: URL
  authorization: User | null
  wildcardMatch: string
  parameters: RouteParams<Route>
  query: Record<string, string>
  headers: http.IncomingHttpHeaders
}

type GetRequest<Route extends string> = BaseRequest<Route>

type PostRequest<Route extends string, T extends t.Any> = BaseRequest<Route> & {
  body: t.TypeOf<T>
}

type Request<Route extends string> = GetRequest<Route> | PostRequest<Route, any>

export type Response = {
  status(code: number): void
  send(value: string | number | Buffer): void
  json(value: any): void
  header(name: string, value: string): void
  end(): void
}

type GetCallback<Route extends string> = (
  request: GetRequest<Route>,
  response: Response
) => void
type PostCallback<Route extends string, T extends t.Any> = (
  request: PostRequest<Route, T>,
  response: Response
) => void | Promise<void>

type Segment =
  | { type: 'exact'; name: string }
  | { type: 'parameter'; name: string }
  | { type: 'wildcard' }

type PostRoute<Route extends string, T extends t.Any = t.Any> = {
  method: 'POST'
  validator: T
  segments: Segment[]
  callback: PostCallback<Route, T>
}

type GetRoute<Route extends string> = {
  method: 'GET'
  segments: Segment[]
  callback: GetCallback<Route>
}

type RouteMatch<R extends string> = {
  route: Route<R>
  parameters: RouteParams<R>
  wildcardMatch: string
}

export const serverStatic = <Route extends string>(
  staticPath: Route
): GetCallback<Route> => {
  return async (req, res) => {
    const isDirectory = (await stat(staticPath)).isDirectory()

    let data: Buffer
    const file = req.wildcardMatch || 'index.html'
    const path = isDirectory ? resolve(staticPath, file) : staticPath
    const ext = path.split('.').pop()

    const mimeType = ext
      ? (mimeTypes[ext] ?? 'application/octet-stream')
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

type Route<R extends string> = PostRoute<R> | GetRoute<R>

enum MultipartParserState {
  INIT,
  READ_HEADERS,
  READ_DATA,
  READ_BOUNDARY,
  DONE,
}

const getPartType = (headers: Record<string, string>) => {
  const contentType = headers['content-type']

  if (!contentType || contentType === 'text/plain') {
    return 'text'
  }

  return 'binary'
}

const getPartName = (headers: Record<string, string>) => {
  const contentDisposition = headers['content-disposition']
  if (!contentDisposition) {
    throw new Error('invalid multipart headers, missing content-disposition')
  }

  const entries = contentDisposition
    .split(';')
    .map((kvp) => kvp.trim().split('='))

  for (const [key, value] of entries) {
    if (key === 'name') {
      if (!value) {
        throw new Error('invalid multipart headers, name field has no value')
      }

      return decodeURIComponent(value.replace(/^"(.*)"$/, '$1'))
    }
  }

  throw new Error(
    'invalid multipart headers, no name field provided in content-disposition header'
  )
}

const parseMultipartBody = async (req: http.IncomingMessage) => {
  const contentType = req.headers['content-type'] ?? ''
  const [, boundary] = contentType.split('boundary=')

  if (!boundary) {
    throw new Error('invalid multipart request')
  }

  const buffer = await new Promise<Buffer>((resolve) => {
    const parts: Buffer[] = []

    req.on('data', (chunk: Buffer) => {
      parts.push(chunk)
    })

    req.on('end', () => {
      resolve(Buffer.concat(parts))
    })
  })

  let readPos = 0

  const readUntil = (marker: Buffer) => {
    const subBuffer = buffer.subarray(readPos)
    const index = subBuffer.indexOf(marker)
    if (index === -1) {
      throw new Error('parse error: marker not found')
    }
    readPos += index + marker.length

    return subBuffer.subarray(0, index)
  }

  const INIT_BOUNDARY = Buffer.from('--' + boundary + '\r\n')
  const BOUNDARY = Buffer.from('\r\n--' + boundary)
  const NEWLINE = Buffer.from('\r\n')

  let parserState: MultipartParserState = MultipartParserState.INIT
  let partHeaders: Record<string, string> = {}

  const parts: Record<string, string | Buffer> = {}

  while (parserState !== MultipartParserState.DONE) {
    switch (parserState) {
      case MultipartParserState.INIT: {
        const buf = readUntil(INIT_BOUNDARY)
        if (buf.length === 0) {
          parserState = MultipartParserState.READ_HEADERS
        } else {
          throw new Error('malformed initial boundary')
        }
        break
      }

      case MultipartParserState.READ_HEADERS: {
        const line = readUntil(NEWLINE).toString()
        if (line.length === 0) {
          parserState = MultipartParserState.READ_DATA
        } else {
          const [key, value] = line.split(':')
          if (!key || !value) {
            throw new Error('invalid multipart headers')
          }

          partHeaders[key.toLowerCase()] = value
        }
        break
      }

      case MultipartParserState.READ_DATA: {
        const data = readUntil(BOUNDARY)

        const partName = getPartName(partHeaders)
        const partType = getPartType(partHeaders)

        if (partType === 'text') {
          parts[partName] = data.toString()
        } else {
          parts[partName] = data
        }

        partHeaders = {}
        parserState = MultipartParserState.READ_BOUNDARY
        break
      }

      case MultipartParserState.READ_BOUNDARY: {
        const boundaryEnd = readUntil(NEWLINE).toString()
        if (boundaryEnd === '') {
          parserState = MultipartParserState.READ_HEADERS
        } else if (boundaryEnd === '--') {
          parserState = MultipartParserState.DONE
        } else {
          throw new Error('malformed boundary end')
        }
        break
      }
    }
  }

  return parts
}

const parseRequestBody = async (req: http.IncomingMessage) => {
  const contentType = req.headers['content-type'] ?? ''
  if (contentType === 'application/json') {
    return new Promise<string>((resolve, reject) => {
      let body = ''
      req.on('data', (chunk) => {
        body += chunk
      })

      req.on('end', () => {
        try {
          resolve(JSON.parse(body))
        } catch (err) {
          reject(err)
        }
      })
    })
  }

  const isFormData = contentType
    .toLocaleLowerCase()
    .startsWith('multipart/form-data')

  if (isFormData) {
    return parseMultipartBody(req)
  }

  return await new Promise<string>((resolve) => {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk
    })

    req.on('end', () => resolve(body))
  })
}

const parseQuery = (queryString: string): Record<string, string> => {
  const res: Record<string, string> = {}

  const offset = queryString.startsWith('?') ? 1 : 0

  for (const [key, value] of queryString
    .substring(offset)
    .split('&')
    .map((part) => {
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
      name: type === 'parameter' ? segment.substring(1) : segment,
    }
  })

const router = (): RouterChain => {
  const routes: { GET: GetRoute<any>[]; POST: PostRoute<any, any>[] } = {
    GET: [],
    POST: [],
  }

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
          `${req.headers['x-forwarded-for'] ?? req.socket.remoteAddress} ${
            req.method
          } ${url.pathname} [${res.statusCode}]`
        )
        res.end()
      },
      header: res.setHeader.bind(res),
    }

    const matchingRoutes: RouteMatch<any>[] = []

    if (req.method !== 'GET' && req.method !== 'POST') {
      response.status(400)
      response.send('unsupported method')
      response.end()
      return
    }

    const routesForMethod = routes[req.method]

    for (let i = 0; i < routesForMethod.length; i++) {
      const route = routesForMethod[i]!

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
    const match = matchingRoutes[0] as RouteMatch<any>
    const route = match.route

    let authorization: Request<any>['authorization'] = null

    if (req.headers.authorization) {
      const [type, token] = req.headers.authorization.split(' ')
      if (type === 'Bearer' && token) {
        authorization = auth.verifyToken(token)
      }
    }

    const baseRequest: BaseRequest<any> = {
      wildcardMatch: match.wildcardMatch,
      url,
      query: parseQuery(url.search),
      parameters: match.parameters,
      headers: req.headers,
      authorization,
    }

    switch (route.method) {
      case 'GET': {
        try {
          await route.callback(baseRequest, response)
        } catch (err) {
          logger.error(err)
          console.error(err)
          response.status(500)
          response.json({ error: 'internal server errror' })
          response.end()
        }
        break
      }

      case 'POST': {
        let body: any
        try {
          const parsedBody = await parseRequestBody(req)
          const validationResult = route.validator.decode(parsedBody)

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
        try {
          await route.callback({ ...baseRequest, body }, response)
        } catch (err) {
          logger.error(err)
          console.error(err)
          response.status(500)
          response.json({ error: 'internal server errror' })
          response.end()
        }
        break
      }
    }
  }

  chain.get = <Route extends string>(
    path: Route,
    callback: GetCallback<Route>
  ) => {
    routes.GET.push({
      method: 'GET',
      callback: callback,
      segments: pathToSegments(path),
    })
    return chain
  }

  chain.post = <Route extends string, T extends t.Any>(
    path: Route,
    validator: T,
    callback: PostCallback<Route, T>
  ) => {
    routes.POST.push({
      method: 'POST',
      validator,
      callback,
      segments: pathToSegments(path),
    })
    return chain
  }

  return chain
}

export default router

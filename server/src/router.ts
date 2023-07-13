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

enum MultipartParserState {
  INIT,
  READ_HEADERS,
  READ_DATA,
  READ_BOUNDARY,
  DONE,
}

type MultipartBodyPart =
  | {
      type: 'string'
      name: string
      value: string
    }
  | {
      type: 'buffer'
      name: string
      value: Buffer
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

  let buffer = await new Promise<Buffer>((resolve) => {
    let buf = Buffer.from([])

    req.on('data', (chunk: Buffer) => {
      if (buf === null) {
        buf = chunk
      } else {
        buf = Buffer.concat([buf, chunk])
      }
    })

    req.on('end', () => {
      resolve(buf)
    })
  })

  const readUntil = (marker: Buffer) => {
    const index = buffer.indexOf(marker)
    if (index === -1) {
      throw new Error('parse error: marker not found')
    }

    let res = buffer.subarray(0, index)
    buffer = buffer.subarray(index + marker.length)

    return res
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

  return await new Promise<string>((resolve, reject) => {
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
          `${req.headers['x-real-ip'] ?? req.socket.remoteAddress} ${
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
          const parsedBody = await parseRequestBody(req)
          const validationResult = route.validator.decode(parsedBody)

          if (validationResult._tag === 'Left') {
            throw validationResult.left
          } else {
            body = validationResult.right
          }
        } catch (err) {
          console.error(err)
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

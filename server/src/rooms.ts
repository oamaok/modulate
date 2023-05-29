import crypto from 'crypto'
import * as http from 'http'
import * as validators from '@modulate/common/validators'
import * as logger from './logger'
import * as db from './database'
import { WebSocketServer, WebSocket } from 'ws'
import {
  ClientMessage,
  Patch,
  ServerMessage,
  User,
  Vec2,
} from '@modulate/common/types'

// TODO: Remove this, it is duplicated from router.ts
const parseQuery = (queryString: string): Record<string, string> => {
  const res: Record<string, string> = {}

  for (const [key, value] of queryString
    .substring(1)
    .split('&')
    .map((part) => {
      const [key, value] = part.split('=') as [string, string]
      return [key, decodeURIComponent(value)] as [string, string]
    })) {
    res[key] = value
  }

  return res
}

const rooms: Record<
  string,
  {
    id: string
    creator: User
    users: Record<
      string,
      {
        id: string
        username: string
        cursor: Vec2
      }
    >
    patch: Patch
  }
> = {}

const connectionsByRoom: Record<string, Record<string, WebSocket>> = {}

export const createRoomUsingPatch = async (user: User, patchId: string) => {
  const roomId = crypto.randomUUID()

  const latestVer = await db.getLatestPatchVersion(patchId)

  if (!latestVer) {
    throw new Error('invalid patchId')
  }

  const { patch } = latestVer

  rooms[roomId] = {
    id: roomId,
    creator: user,
    users: {},
    patch,
  }

  connectionsByRoom[roomId] = {}

  return roomId
}

export default (server: http.Server) => {
  const wss = new WebSocketServer({ server })

  wss.on('connection', (ws, req) => {
    // TODO: Handle handshake properly before allowing a connection
    // TODO: Check origin of connection before accepting

    logger.info('attempting to establish websocket connection')

    const url = new URL(
      req.url ?? '',
      `http://${req.headers.host ?? 'localhost'}`
    )
    const queryParams = parseQuery(url.search)
    const { roomId } = queryParams

    // TODO: More graceful errors
    if (!roomId) {
      logger.warn('tried to join without room id')
      ws.close()
      return
    }

    const room = rooms[roomId]
    const roomConnections = connectionsByRoom[roomId]!

    if (!room) {
      logger.warn('tried to join room which doesnt exist')
      ws.close()
      return
    }

    // Add user to connected users
    // TODO: Add authentication to here as well

    const user = {
      id: crypto.randomUUID(),
      username: 'anonymous',
      cursor: { x: 0, y: 0 },
    }

    room.users[user.id] = user
    roomConnections[user.id] = ws

    const send = (ws: WebSocket, message: ServerMessage) => {
      ws.send(JSON.stringify(message))
    }

    const broadcastToOthers = (message: ServerMessage) => {
      for (const [userId, socket] of Object.entries(roomConnections)) {
        if (userId === user.id) continue
        send(socket, message)
      }
    }

    ws.on('message', (rawMessage) => {
      let message: ClientMessage
      try {
        const validation = validators.ClientMessage.decode(
          JSON.parse(rawMessage.toString('utf-8'))
        )

        if (validation._tag === 'Left') {
          throw validation.left
        }
        message = validation.right
      } catch (err) {
        logger.error("couldn't validate message")
        return
      }

      switch (message.type) {
        case 'join-room': {
          send(ws, {
            type: 'init-room',
            room: {
              ...room,
              users: Object.fromEntries(
                Object.entries(room.users).filter(([id]) => id !== user.id)
              ),
            },
          })

          broadcastToOthers({
            type: 'user-join',
            user: {
              id: user.id,
              username: user.username,
              cursor: user.cursor,
            },
          })

          break
        }
        case 'cursor-move': {
          room.users[user.id]!.cursor = message.position

          broadcastToOthers({ ...message, userId: user.id })
          break
        }
        case 'patch-update': {
          for (const event of message.events) {
            switch (event.type) {
              case 'create-module': {
                room.patch.modules[event.moduleId] = {
                  name: event.name,
                  position: event.position,
                  state: null,
                }
                room.patch.knobs[event.moduleId] = {}
                break
              }
              case 'delete-module': {
                delete room.patch.modules[event.moduleId]
                break
              }
              case 'change-module-position': {
                room.patch.modules[event.moduleId]!.position = event.position
                break
              }
              case 'change-module-state': {
                room.patch.modules[event.moduleId]!.state = event.state
                break
              }

              case 'tweak-knob': {
                room.patch.knobs[event.moduleId]![event.knob] = event.value
                break
              }

              case 'connect-cable': {
                room.patch.cables.push(event.cable)
                break
              }
              case 'disconnect-cable': {
                room.patch.cables = room.patch.cables.filter(
                  (cable) => cable.id !== event.cableId
                )
                break
              }
            }
          }

          broadcastToOthers(message)

          break
        }
      }
    })

    ws.on('close', () => {
      broadcastToOthers({ type: 'user-leave', userId: user.id })

      delete roomConnections[user.id]
      delete room.users[user.id]
    })
  })
}
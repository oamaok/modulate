import {
  Id,
  Vec2,
  Patch,
  PatchMetadata,
  User,
  EngineMessageType,
  EngineRequest,
  EngineResponse,
  Socket,
} from '@modulate/common/types'

export type Route =
  | {
      name: 'patch'
      patchId: string
    }
  | {
      name: 'index'
    }
  | { name: 'room'; roomId: string }

type Room = {
  users: Record<
    string,
    {
      id: string
      username: string
      cursor: Vec2
    }
  >
}

export type SocketWithPosition = Socket & { pos: Vec2 }

export type State = {
  initialized: boolean
  room: Room | null
  viewport: {
    width: number
    height: number
  }
  hint: string | null
  activeModule: Id | null
  user: User | null
  cursor: Vec2
  sockets: Record<string, { socket: Socket; pos: Vec2 }[]>
  viewOffset: Vec2
  patchMetadata: PatchMetadata
  patch: Patch
  route: Route
  activeCable: {
    draggingFrom: Socket
  } | null
}

export type Engine = {
  [K in EngineMessageType]: (
    req: Omit<EngineRequest<K>, 'type' | 'id'>
  ) => Promise<EngineResponse<K>>
}

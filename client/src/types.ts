import {
  Id,
  Vec2,
  Patch,
  PatchMetadata,
  ConnectedSocket,
  User,
} from '@modulate/common/types'

export interface IModule {}

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
  socketPositions: Record<Id, Record<string, Vec2>>
  viewOffset: Vec2
  patchMetadata: PatchMetadata
  patch: Patch
  route: Route
  activeCable: {
    from: ConnectedSocket
  } | null
}

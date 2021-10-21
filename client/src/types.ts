import {
  Id,
  Vec2,
  Patch,
  PatchMetadata,
  ConnectedSocket,
  User,
} from '../../common/types'

export interface IModule {}

export type Route =
  | {
      name: 'patch'
      patchId: string
    }
  | {
      name: 'index'
    }

export type State = {
  initialized: boolean
  loadedWorklets: number
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

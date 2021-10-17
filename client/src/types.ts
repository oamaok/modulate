import { Id, Vec2, Patch, ConnectedSocket, User } from '../../common/types'

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
  patchDetails: {
    id: null | string
    name: string
    author: null | User
    version: number
  }
  patch: Patch
  route: Route
  activeCable: {
    from: ConnectedSocket
  } | null
}

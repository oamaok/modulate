import {
  Id,
  SocketType,
  Vec2,
  Patch,
  ConnectedSocket,
} from '../../common/types'

export interface IModule {}

export type State = {
  initialized: boolean
  viewport: {
    width: number
    height: number
  }
  cursor: Vec2
  socketPositions: Record<Id, Record<string, Vec2>>
  patch: Patch
  activeCable: {
    from: ConnectedSocket
  } | null
}

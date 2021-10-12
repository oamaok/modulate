export type Id = string & { __tag: 'Id' }

export interface IModule {}

export type Vec2 = {
  x: number
  y: number
}

export type SocketType = 'output' | 'input'

export type ConnectedSocket = {
  moduleId: Id
  name: string
  type: SocketType
}

export type Cable = {
  id: Id
  from: { socket: ConnectedSocket }
  to: { socket: ConnectedSocket }
}

export type State = {
  currentId: number
  initialized: boolean
  viewport: {
    width: number
    height: number
  }
  cursor: Vec2
  modules: Record<
    Id,
    {
      name: string
      position: Vec2
      // TODO: Type this better
      state?: any
    }
  >
  knobs: Record<Id, Record<string, number>>
  sockets: Record<Id, Record<string, Vec2>>
  cables: Cable[]
  activeCable: {
    from: { socket: { moduleId: Id; name: string; type: SocketType } }
  } | null
}

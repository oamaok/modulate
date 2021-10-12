import { Id } from './types'

export type RegisteredSocket =
  | {
      type: 'input'
      moduleId: Id
      name: string
      node: AudioNode | AudioParam
    }
  | {
      type: 'output'
      moduleId: Id
      name: string
      node: AudioNode
    }

let sockets: RegisteredSocket[] = []

export const registerSocket = (socket: RegisteredSocket) => {
  sockets.push(socket)
}

export const getRegisteredSocket = (
  moduleId: Id,
  socketName: string
): RegisteredSocket => {
  return sockets.find(
    (socket) => socket.name === socketName && socket.moduleId === moduleId
  )!
}

export const unregisterSocket = (moduleId: Id, socketName: string) => {
  sockets = sockets.filter(
    (socket) => socket.name !== socketName && socket.moduleId !== moduleId
  )
}

export const getSockets = () => sockets

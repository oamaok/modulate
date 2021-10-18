export type RegisteredSocket =
  | {
      type: 'input'
      moduleId: string
      name: string
      node: AudioNode | AudioParam
    }
  | {
      type: 'output'
      moduleId: string
      name: string
      node: AudioNode
      output?: number
    }

let sockets: RegisteredSocket[] = []

export const registerSocket = (socket: RegisteredSocket) => {
  sockets.push(socket)
}

export const getRegisteredSocket = (
  moduleId: string,
  socketName: string
): RegisteredSocket => {
  return sockets.find(
    (socket) => socket.name === socketName && socket.moduleId === moduleId
  )!
}

export const unregisterSocket = (moduleId: string, socketName: string) => {
  sockets = sockets.filter(
    (socket) => socket.name !== socketName && socket.moduleId !== moduleId
  )
}

export const getSockets = () => sockets

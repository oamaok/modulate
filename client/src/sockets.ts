import { ConnectedSocket } from '@modulate/common/types'

export type RegisteredSocket =
  | {
      type: 'input'
      moduleId: string
      name: string
      node: AudioNode | AudioParam
      input?: number
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
  const socket = sockets.find(
    (socket) => socket.name === socketName && socket.moduleId === moduleId
  )

  if (!socket) {
    throw new Error(`could not find socket for module ${moduleId}:${socketName}`)
  }

  return socket
}

export const unregisterSocket = (moduleId: string, socketName: string) => {
  sockets = sockets.filter(
    (socket) => socket.name !== socketName || socket.moduleId !== moduleId
  )
}

export const connectSockets = (from: ConnectedSocket, to: ConnectedSocket) => {
  const outputSocket = getRegisteredSocket(from.moduleId, from.name)
  const inputSocket = getRegisteredSocket(to.moduleId, to.name)

  if (outputSocket.type === 'input') {
    throw new Error('invalid outputSocket type')
  }

  if (inputSocket.type === 'output') {
    throw new Error('invalid inputSocket type')
  }

  if (inputSocket.node instanceof AudioNode) {
    outputSocket.node.connect(
      inputSocket.node,
      outputSocket.output,
      inputSocket.input
    )
  } else {
    outputSocket.node.connect(inputSocket.node, outputSocket.output)
  }
}

export const disconnectSockets = (
  from: ConnectedSocket,
  to: ConnectedSocket
) => {
  const outputSocket = getRegisteredSocket(from.moduleId, from.name)
  const inputSocket = getRegisteredSocket(to.moduleId, to.name)

  if (outputSocket.type === 'input') {
    throw new Error('invalid outputSocket type')
  }

  if (inputSocket.type === 'output') {
    throw new Error('invalid inputSocket type')
  }

  if (inputSocket.node instanceof AudioNode) {
    outputSocket.node.disconnect(
      inputSocket.node,
      outputSocket.output as number,
      inputSocket.input as number
    )
  } else {
    outputSocket.node.disconnect(
      inputSocket.node,
      outputSocket.output as number
    )
  }
}

export const getSockets = () => sockets

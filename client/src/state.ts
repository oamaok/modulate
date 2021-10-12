import { createState } from 'kaiku'
import { getSockets } from './sockets'
import { Cable, ConnectedSocket, Id, State, Vec2 } from './types'

const state = createState<State>({
  currentId: 0,
  initialized: false,
  cursor: { x: 0, y: 0 },
  viewport: { width: window.innerWidth, height: window.innerHeight },
  modules: {},
  knobs: {},
  sockets: {},
  cables: [],
  activeCable: null,
})
export default state
export const { cursor, viewport, modules, knobs, sockets } = state

export const nextId = () => `${state.currentId++}` as Id

document.documentElement.addEventListener('mousemove', (evt) => {
  evt.preventDefault()
  cursor.x = evt.clientX
  cursor.y = evt.clientY
})

document.addEventListener('resize', () => {
  viewport.width = window.innerWidth
  viewport.height = window.innerHeight
})

export const addModule = (name: string) => {
  state.modules[nextId()] = {
    name,
    position: { x: 200, y: 200 },
  }
}

export const setModuleState = (id: Id, moduleState: any) => {
  state.modules[id].state = moduleState
}

export const getModuleState = <T>(id: Id): T => {
  return state.modules[id].state as T
}

export const getModulePosition = (id: Id) => {
  return state.modules[id].position
}

export const setModulePosition = (id: Id, position: Vec2) => {
  state.modules[id].position = position
}

export const setSocketPosition = (moduleId: Id, name: string, pos: Vec2) => {
  if (!state.sockets[moduleId]) {
    state.sockets[moduleId] = {}
  }
  state.sockets[moduleId][name] = pos
}

export const getSocketPosition = ({
  moduleId,
  name,
}: {
  moduleId: Id
  name: string
}): Vec2 => {
  const socketOffset = state.sockets[moduleId][name]
  const modulePosition = state.modules[moduleId].position
  return {
    x: modulePosition.x + socketOffset.x,
    y: modulePosition.y + socketOffset.y,
  }
}

export const getModuleKnobs = (
  moduleId: Id
): undefined | Record<string, number> => {
  return state.knobs[moduleId]
}

export const getKnobValue = (
  moduleId: Id,
  name: string
): undefined | number => {
  return state.knobs[moduleId]?.[name]
}

export const setKnobValue = (moduleId: Id, name: string, value: number) => {
  if (!state.knobs[moduleId]) {
    state.knobs[moduleId] = {}
  }
  state.knobs[moduleId][name] = value
}

const cableConnectsToSocket = (
  cable: Cable,
  socket: ConnectedSocket
): boolean => {
  const cableSocket =
    socket.type === 'input' ? cable.to.socket : cable.from.socket

  return (
    cableSocket.moduleId === socket.moduleId && cableSocket.name === socket.name
  )
}

export const plugActiveCable = (socket: ConnectedSocket) => {
  const previousCable = state.cables.find((cable) =>
    cableConnectsToSocket(cable, socket)
  )

  if (previousCable) {
    state.cables = state.cables.filter((cable) => cable.id !== previousCable.id)
    state.activeCable = {
      from: socket.type === 'input' ? previousCable.from : previousCable.to,
    }
  } else {
    state.activeCable = {
      from: { socket },
    }
  }
}

export const getCableConnectionCandidate = () => {
  const { activeCable } = state
  if (!activeCable) return null

  const targetSockets = getSockets().filter(
    (socket) => socket.type !== activeCable.from.socket.type
  )

  const candidateSocket = targetSockets.find((socket) => {
    const { x, y } = getSocketPosition(socket)
    return (x - state.cursor.x) ** 2 + (y - state.cursor.y) ** 2 < 200
  })

  if (!candidateSocket) return null

  const inputSocketIsOccupied =
    candidateSocket.type === 'input' &&
    state.cables.some(
      (cable) =>
        cable.to.socket.moduleId === candidateSocket.moduleId &&
        cable.to.socket.name === candidateSocket.name
    )

  if (inputSocketIsOccupied) return null

  return candidateSocket
}

export const addCable = (from: ConnectedSocket, to: ConnectedSocket) => {
  state.cables.push({
    id: nextId(),
    from: {
      socket: {
        moduleId: from.moduleId,
        type: from.type,
        name: from.name,
      },
    },
    to: {
      socket: {
        moduleId: to.moduleId,
        type: to.type,
        name: to.name,
      },
    },
  })
}

export const releaseActiveCable = () => {
  const { activeCable } = state

  if (!activeCable) return

  const candidateSocket = getCableConnectionCandidate()

  if (!candidateSocket) {
    state.activeCable = null
    return
  }

  if (activeCable.from.socket.type === 'output') {
    const from = activeCable.from.socket
    const to = candidateSocket

    addCable(from, to)
  } else {
    const from = candidateSocket
    const to = activeCable.from.socket

    addCable(from, to)
  }

  state.activeCable = null
}

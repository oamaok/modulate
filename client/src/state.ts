import { createState } from 'kaiku'
import { getSockets } from './sockets'
import { State } from './types'
import { Cable, ConnectedSocket, Id, Vec2 } from '../../common/types'
import { parseRoute } from './routes'

const state = createState<State>({
  initialized: false,
  loadedWorklets: 0,
  cursor: { x: 0, y: 0 },
  viewport: { width: window.innerWidth, height: window.innerHeight },
  user: null,
  hint: null,
  activeModule: null,

  patchMetadata: {
    id: null,
    author: null,
    name: 'untitled',
  },
  patch: {
    currentId: 0,
    modules: {},
    knobs: {},
    cables: [],
  },
  route: parseRoute(window.location),
  viewOffset: { x: 0, y: 0 },
  socketPositions: {},
  activeCable: null,
})

export default state
export const { cursor, viewport, patch, socketPositions } = state
export const nextId = () => `${patch.currentId++}` as Id

window.addEventListener('popstate', () => {
  state.route = parseRoute(location)
})

document.documentElement.addEventListener('mousemove', (evt) => {
  // TODO: Make this not permanent, maybe flag in state
  evt.preventDefault()
  cursor.x = evt.clientX
  cursor.y = evt.clientY
})

window.addEventListener('resize', () => {
  viewport.width = window.innerWidth
  viewport.height = window.innerHeight
})

export const addModule = (name: string) => {
  patch.modules[nextId()] = {
    name,
    position: { x: 200, y: 200 },
    state: undefined,
  }
}

export const setModuleState = (id: Id, moduleState: any) => {
  patch.modules[id].state = moduleState
}

export const getModuleState = <T>(id: Id): T => {
  return patch.modules[id].state as T
}

export const getModulePosition = (id: Id) => {
  return patch.modules[id].position
}

export const setModulePosition = (id: Id, position: Vec2) => {
  patch.modules[id].position = position
}

export const setSocketPosition = (moduleId: Id, name: string, pos: Vec2) => {
  if (!socketPositions[moduleId]) {
    socketPositions[moduleId] = {}
  }
  socketPositions[moduleId][name] = pos
}

export const getSocketPosition = ({
  moduleId,
  name,
}: {
  moduleId: Id
  name: string
}): Vec2 | null => {
  const moduleSockets = socketPositions[moduleId]
  if (!moduleSockets) {
    return null
  }

  const modulePosition = getModulePosition(moduleId)
  const socketOffset = moduleSockets[name]

  return {
    x: modulePosition.x + socketOffset.x,
    y: modulePosition.y + socketOffset.y,
  }
}

export const getModuleKnobs = (
  moduleId: Id
): undefined | Record<string, number> => {
  return patch.knobs[moduleId]
}

export const getKnobValue = (
  moduleId: Id,
  name: string
): undefined | number => {
  return patch.knobs[moduleId]?.[name]
}

export const setKnobValue = (moduleId: Id, name: string, value: number) => {
  if (!patch.knobs[moduleId]) {
    patch.knobs[moduleId] = {}
  }
  patch.knobs[moduleId][name] = value
}

const cableConnectsToSocket = (
  cable: Cable,
  socket: ConnectedSocket
): boolean => {
  const cableSocket = socket.type === 'input' ? cable.to : cable.from

  return (
    cableSocket.moduleId === socket.moduleId && cableSocket.name === socket.name
  )
}

export const plugActiveCable = (socket: ConnectedSocket) => {
  const previousCable = patch.cables.find((cable) =>
    cableConnectsToSocket(cable, socket)
  )

  if (previousCable) {
    patch.cables = patch.cables.filter((cable) => cable.id !== previousCable.id)
    state.activeCable = {
      from: socket.type === 'input' ? previousCable.from : previousCable.to,
    }
  } else {
    state.activeCable = {
      from: socket,
    }
  }
}

export const getCableConnectionCandidate = () => {
  const { activeCable } = state
  if (!activeCable) return null

  const targetSockets = getSockets().filter(
    (socket) => socket.type !== activeCable.from.type
  )

  const candidateSocket = targetSockets.find((socket) => {
    const { x, y } = getSocketPosition(socket)!
    return (
      (x - state.cursor.x + state.viewOffset.x) ** 2 +
        (y - state.cursor.y + state.viewOffset.y) ** 2 <
      200
    )
  })

  if (!candidateSocket) return null

  const inputSocketIsOccupied =
    candidateSocket.type === 'input' &&
    patch.cables.some(
      (cable) =>
        cable.to.moduleId === candidateSocket.moduleId &&
        cable.to.name === candidateSocket.name
    )

  if (inputSocketIsOccupied) return null

  return candidateSocket
}

export const addCable = (from: ConnectedSocket, to: ConnectedSocket) => {
  patch.cables.push({
    id: nextId(),
    from: {
      moduleId: from.moduleId,
      type: from.type,
      name: from.name,
    },
    to: {
      moduleId: to.moduleId,
      type: to.type,
      name: to.name,
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

  if (activeCable.from.type === 'output') {
    const from = activeCable.from
    const to = candidateSocket

    addCable(from, to)
  } else {
    const from = candidateSocket
    const to = activeCable.from

    addCable(from, to)
  }

  state.activeCable = null
}

export const deleteModule = (id: string) => {
  state.patch.cables = state.patch.cables.filter((cable) => {
    return cable.from.moduleId !== id && cable.to.moduleId !== id
  })
  delete state.patch.knobs[id]
  delete state.socketPositions[id]
  delete state.patch.modules[id]
}

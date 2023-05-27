import { createState } from 'kaiku'
import { getSockets, disconnectSockets, connectSockets } from './sockets'
import { State } from './types'
import {
  Cable,
  ConnectedSocket,
  Id,
  Patch,
  PatchMetadata,
  Vec2,
} from '@modulate/common/types'
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

export const loadPatch = async (metadata: PatchMetadata, savedPatch: Patch) => {
  const { currentId, modules, knobs, cables } = savedPatch
  state.patchMetadata = metadata
  patch.knobs = knobs
  patch.currentId = currentId
  patch.modules = modules
  state.initialized = true
  await new Promise((resolve) => requestAnimationFrame(resolve))

  for (const cable of cables) {
    connectSockets(cable.from, cable.to)
  }

  patch.cables = cables
}

export const addModule = (name: string) => {
  patch.modules[nextId()] = {
    name,
    position: {
      x: -state.viewOffset.x + window.innerWidth / 2,
      y: -state.viewOffset.y + window.innerHeight / 2,
    },
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
    disconnectSockets(previousCable.from, previousCable.to)
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

export const addConnectionBetweenSockets = (
  from: ConnectedSocket,
  to: ConnectedSocket
) => {
  connectSockets(from, to)

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

    addConnectionBetweenSockets(from, to)
  } else {
    const from = candidateSocket
    const to = activeCable.from

    addConnectionBetweenSockets(from, to)
  }

  state.activeCable = null
}

export const deleteModule = async (id: string) => {
  const cablesToDisconnect = state.patch.cables.filter(
    (cable) => cable.from.moduleId === id || cable.to.moduleId === id
  )

  for (const cable of cablesToDisconnect) {
    disconnectSockets(cable.from, cable.to)
  }

  state.patch.cables = state.patch.cables.filter(
    (cable) => cable.from.moduleId !== id && cable.to.moduleId !== id
  )

  delete state.patch.knobs[id]
  delete state.socketPositions[id]
  delete state.patch.modules[id]
}

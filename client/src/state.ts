import { createState } from 'kaiku'
import { State } from './types'
import {
  Cable,
  Socket,
  Id,
  Patch,
  PatchMetadata,
  Vec2,
  OutputSocket,
  InputSocket,
} from '@modulate/common/types'
import * as engine from './engine'
import { parseRoute } from './routes'
import assert from './assert'

const state = createState<State>({
  initialized: false,
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
  sockets: {},
  activeCable: null,

  room: null,
})

export default state
export const { cursor, viewport, patch } = state
export const nextId = () => crypto.randomUUID() as Id

window.addEventListener('popstate', () => {
  state.route = parseRoute(location)
})

document.documentElement.addEventListener('mousemove', (evt) => {
  // TODO: Make this not permanent, maybe flag in state
  evt.preventDefault()
  cursor.x = evt.pageX
  cursor.y = evt.pageY
})

document.addEventListener('wheel', evt => {
  state.viewOffset.x -= evt.deltaX
  state.viewOffset.y -= evt.deltaY
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

  await new Promise(requestAnimationFrame)

  for (const cable of cables) {
    await engine.connectCable(cable)
  }

  patch.cables = cables
  state.initialized = true
}

export const addModule = async (name: string) => {
  patch.modules[nextId()] = {
    name,
    position: {
      x: -state.viewOffset.x + window.innerWidth / 2,
      y: -state.viewOffset.y + window.innerHeight / 2,
    },
    state: null,
  }
}

export const setModuleState = (
  id: Id,
  moduleState: Record<string, unknown>
) => {
  const module = patch.modules[id]
  assert(module, `setModuleState: invalid module id (${id})`)
  module.state = moduleState
}

export const getModuleState = <T>(id: Id): T => {
  const module = patch.modules[id]
  assert(module, `getModuleState: invalid module id (${id})`)
  return module.state as T
}

export const getModulePosition = (id: Id) => {
  const module = patch.modules[id]
  assert(module, `getModulePosition: invalid module (${id})`)
  return module.position
}

export const setModulePosition = (id: Id, position: Vec2) => {
  const module = patch.modules[id]
  assert(module, `setModulePosition: invalid module id (${id})`)
  module.position = position
}

export const registerSocket = (socket: Socket) => {
  if (!state.sockets[socket.moduleId]) {
    state.sockets[socket.moduleId] = []
  }

  state.sockets[socket.moduleId]!.push({
    socket,
    pos: { x: 0, y: 0 },
  })
}

const isSameSocket = (a: Socket, b: Socket): boolean =>
  a.type === b.type && a.index === b.index && a.moduleId === b.moduleId

export const getSocket = (
  socket: Socket
): { socket: Socket; pos: Vec2 } | null => {
  const sockets = state.sockets[socket.moduleId]
  if (!sockets) return null

  return sockets.find((s) => isSameSocket(s.socket, socket)) ?? null
}

export const setSocketPosition = (socket: Socket, pos: Vec2) => {
  const sockets = state.sockets[socket.moduleId]
  assert(sockets)

  const foundSocket = getSocket(socket)
  assert(
    foundSocket,
    'setSocketPosition: socket was not registered before setting position'
  )

  foundSocket.pos = pos
}

export const getSocketPosition = (socket: Socket): Vec2 | null => {
  const modulePosition = getModulePosition(socket.moduleId)
  const moduleSocket = getSocket(socket)

  assert(
    moduleSocket,
    `getSocketPosition: invalid socket name (${socket.moduleId},${socket.type},${socket.index})`
  )

  return {
    x: modulePosition.x + moduleSocket.pos.x,
    y: modulePosition.y + moduleSocket.pos.y,
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
  patch.knobs[moduleId]![name] = value
}
const cableConnectsToSocket = (cable: Cable, socket: Socket): boolean =>
  isSameSocket(cable.from, socket) || isSameSocket(cable.to, socket)

export const plugActiveCable = (socket: Socket) => {
  const previousCable = patch.cables.find((cable) =>
    cableConnectsToSocket(cable, socket)
  )

  if (previousCable) {
    engine.disconnectCable(previousCable)
    patch.cables = patch.cables.filter((cable) => cable.id !== previousCable.id)
    state.activeCable = {
      draggingFrom:
        socket.type === 'output' ? previousCable.to : previousCable.from,
    }
  } else {
    state.activeCable = {
      draggingFrom: socket,
    }
  }
}

const getSockets = () => Object.values(state.sockets).flat()

const canSocketsConnect = (a: Socket, b: Socket) => {
  if (a.type === 'output') return b.type !== 'output'
  return b.type === 'output'
}

export const getCableConnectionCandidate = (): Socket | null => {
  const { activeCable } = state
  if (!activeCable) return null

  const targetSockets = getSockets().filter(({ socket }) =>
    canSocketsConnect(activeCable.draggingFrom, socket)
  )

  const candidateSocket = targetSockets.find(({ socket }) => {
    const pos = getSocketPosition(socket)
    assert(pos)
    const { x, y } = pos
    return (
      (x - state.cursor.x + state.viewOffset.x) ** 2 +
        (y - state.cursor.y + state.viewOffset.y) ** 2 <
      200
    )
  })

  if (!candidateSocket) return null

  const inputSocketIsOccupied =
    candidateSocket.socket.type === 'input' &&
    patch.cables.some((cable) => isSameSocket(cable.to, candidateSocket.socket))

  if (inputSocketIsOccupied) return null

  return candidateSocket.socket
}

export const addConnectionBetweenSockets = (
  from: OutputSocket,
  to: InputSocket
) => {
  const cable = {
    id: nextId(),
    from: { ...from },
    to: { ...to },
  }

  engine.connectCable(cable)

  patch.cables.push(cable)
}

export const releaseActiveCable = () => {
  const { activeCable } = state

  if (!activeCable) return

  const candidateSocket = getCableConnectionCandidate()

  if (!candidateSocket) {
    state.activeCable = null
    return
  }

  if (activeCable.draggingFrom.type === 'output') {
    const from = activeCable.draggingFrom
    const to = candidateSocket

    assert(to.type !== 'output')

    addConnectionBetweenSockets(from, to)
  } else {
    const from = candidateSocket
    const to = activeCable.draggingFrom

    assert(from.type === 'output')

    addConnectionBetweenSockets(from, to)
  }

  state.activeCable = null
}

export const deleteModule = async (moduleId: string) => {
  const cablesToDisconnect = state.patch.cables.filter(
    (cable) =>
      cable.from.moduleId === moduleId || cable.to.moduleId === moduleId
  )

  for (const cable of cablesToDisconnect) {
    await engine.disconnectCable(cable)
  }

  await engine.deleteModule(moduleId)

  state.patch.cables = state.patch.cables.filter(
    (cable) =>
      cable.from.moduleId !== moduleId && cable.to.moduleId !== moduleId
  )

  delete state.patch.knobs[moduleId]
  delete state.sockets[moduleId]
  delete state.patch.modules[moduleId]
}

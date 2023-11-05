import { createState } from 'kaiku'
import { Overlay, State } from './types'
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
import { origin } from '@modulate/common/util'
import { ModuleName } from '@modulate/worklets/src/modules'

const state = createState<State>({
  initialized: false,
  cursor: origin(),
  keyboard: {
    modifiers: {
      ctrl: false,
      alt: false,
      shift: false,
    },
  },

  viewport: { width: window.innerWidth, height: window.innerHeight },
  user: null,
  hint: {
    visible: false,
    position: origin(),
    content: '',
  },
  activeModule: null,

  overlay: 'init',

  patchMetadata: {
    id: null,
    author: null,
    name: 'untitled',
  },
  patch: {
    modules: {},
    knobs: {},
    cables: [],
  },
  route: parseRoute(window.location),
  viewOffset: origin(),
  sockets: {},
  activeCable: null,

  room: null,

  contextMenu: {
    open: false,
    position: origin(),
  },

  activePianoRollModuleId: null,
})

export default state
export const { cursor, viewport, patch } = state
export const nextId = () => crypto.randomUUID() as Id

window.addEventListener('popstate', () => {
  state.route = parseRoute(location)
})

const latestCursorPos = origin()
const updateCursor = () => {
  state.cursor.x = latestCursorPos.x
  state.cursor.y = latestCursorPos.y
}
let cursorAnimationFrame = -1
document.documentElement.addEventListener('mousemove', (evt) => {
  // TODO: Make this not permanent, maybe flag in state
  evt.preventDefault()
  latestCursorPos.x = evt.pageX
  latestCursorPos.y = evt.pageY
  cancelAnimationFrame(cursorAnimationFrame)
  cursorAnimationFrame = requestAnimationFrame(updateCursor)
})

document.documentElement.addEventListener('touchmove', (evt) => {
  evt.preventDefault()
  latestCursorPos.x = evt.touches[0]!.pageX
  latestCursorPos.y = evt.touches[0]!.pageY
  cancelAnimationFrame(cursorAnimationFrame)
  cursorAnimationFrame = requestAnimationFrame(updateCursor)
})

document.addEventListener('keydown', (evt) => {
  switch (evt.key) {
    case 'Control': {
      state.keyboard.modifiers.ctrl = true
      break
    }
    case 'Shift': {
      state.keyboard.modifiers.shift = true
      break
    }
    case 'Alt': {
      state.keyboard.modifiers.alt = true
      break
    }
  }
})

document.addEventListener('keyup', (evt) => {
  switch (evt.key) {
    case 'Control': {
      state.keyboard.modifiers.ctrl = false
      break
    }
    case 'Shift': {
      state.keyboard.modifiers.shift = false
      break
    }
    case 'Alt': {
      state.keyboard.modifiers.alt = false
      break
    }
  }
})

const hasScrollbar = (elem: HTMLElement) => {
  const style = window.getComputedStyle(elem)
  return style.overflowY === 'scroll'
}

const elementIsWithinScrollableElement = (elem: HTMLElement): boolean => {
  if (hasScrollbar(elem)) return true
  if (elem.parentElement)
    return elementIsWithinScrollableElement(elem.parentElement)
  return false
}

document.addEventListener('wheel', (evt) => {
  if (elementIsWithinScrollableElement(evt.target as HTMLElement)) {
    return
  }

  state.viewOffset.x -= evt.deltaX
  state.viewOffset.y -= evt.deltaY
})

window.addEventListener('resize', () => {
  viewport.width = window.innerWidth
  viewport.height = window.innerHeight
})

export const closeOverlay = () => {
  state.overlay = 'none'
}

export const openOverlay = (overlay: Overlay) => {
  state.overlay = overlay
}

export const loadPatch = async (metadata: PatchMetadata, savedPatch: Patch) => {
  const { modules, knobs, cables } = savedPatch
  state.patchMetadata = metadata
  patch.knobs = knobs
  patch.modules = modules
  patch.cables = cables

  await new Promise(requestAnimationFrame)

  for (const cable of cables) {
    await engine.connectCable(cable)
  }

  state.initialized = true
}

export const resetPatch = async () => {
  state.activeModule = null

  for (const module in state.patch.modules) {
    await deleteModule(module)
  }

  state.patchMetadata = {
    id: null,
    author: null,
    name: 'untitled',
  }

  history.pushState({}, '', `/`)
}

export const addModule = async (
  name: ModuleName,
  pos: Vec2 = {
    x: -state.viewOffset.x + window.innerWidth / 2,
    y: -state.viewOffset.y + window.innerHeight / 2,
  }
) => {
  patch.modules[nextId()] = {
    name,
    position: pos,
    state: null,
  }
}

export const isOwnPatch = () => {
  if (!state.user) return false
  if (!state.patchMetadata.author) return true
  return state.patchMetadata.author.id === state.user.id
}

export const canUserSavePatch = isOwnPatch

export const displayHint = (content: string, position: Vec2) => {
  state.hint.visible = true
  state.hint.content = content
  state.hint.position.x = position.x
  state.hint.position.y = position.y
}

export const setHintContent = (content: string) => {
  state.hint.content = content
}

export const hideHint = () => {
  state.hint.visible = false
}

export const setModuleState = <T extends Record<string, unknown>>(
  id: Id,
  moduleState: T
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

export const disconnectCable = (cable: Cable) => {
  engine.disconnectCable(cable)
  patch.cables = patch.cables.filter(({ id }) => id !== cable.id)
}

export const plugActiveCable = (socket: Socket) => {
  // For inputs and parameters, grab the existing cable if it exists.
  // For outputs, split the cable.
  if (socket.type !== 'output') {
    const previousCable: Cable | undefined = patch.cables.find((cable) =>
      cableConnectsToSocket(cable, socket)
    )

    if (previousCable) {
      disconnectCable(previousCable)
      state.activeCable = {
        draggingFrom: previousCable.from,
      }
      return
    }
  }

  state.activeCable = {
    draggingFrom: socket,
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

  // TODO: Manually iterate over sockets instead of calling the costly `getSockets`
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
    candidateSocket.socket.type !== 'output' &&
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

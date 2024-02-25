import {
  Id,
  Vec2,
  Patch,
  PatchMetadata,
  User,
  EngineMessageType,
  EngineRequest,
  EngineResponse,
  Socket,
  ContextPointers,
} from '@modulate/common/types'

export type Route =
  | {
      name: 'patch'
      patchId: string
    }
  | {
      name: 'index'
    }
  | { name: 'room'; roomId: string }

type Room = {
  users: Record<
    string,
    {
      id: string
      username: string
      cursor: Vec2
    }
  >
}

export type SocketWithPosition = Socket & { pos: Vec2 }

export type Overlay =
  | 'none'
  | 'init'
  | 'login'
  | 'patch-browser'
  | 'patch-settings'

type ContextMenuItem = {
  type: 'item'
  name: string
  action: (position: Vec2) => void
}

type ContextMenuGroup = {
  type: 'group'
  name: string
  items: ContextMenuItem[]
}

type ContextMenuButtonGroup = {
  type: 'button-group'
  name: string
  items: ContextMenuItem[]
}

export type ContextMenuOptions = {
  width: number
  title: string
  items: (ContextMenuItem | ContextMenuGroup | ContextMenuButtonGroup)[]
}

export type State = {
  initialized: boolean
  room: Room | null
  viewport: {
    width: number
    height: number
  }
  hint: {
    visible: boolean
    position: Vec2
    content: string
  }
  activeModule: Id | null
  user: User | null

  cursor: Vec2
  keyboard: {
    modifiers: {
      ctrl: boolean
      alt: boolean
      shift: boolean
    }
  }

  overlay: Overlay

  sockets: Record<string, { socket: Socket; pos: Vec2 }[]>
  viewOffset: Vec2
  patchMetadata: PatchMetadata
  patch: Patch
  route: Route
  activeCable: {
    draggingFrom: Socket
  } | null
  contextMenu: {
    open: boolean
    position: Vec2
    options: ContextMenuOptions | null
  }
}

export type FilterType =
  | 'lowpass'
  | 'highpass'
  | 'bandpass'
  | 'highshelf'
  | 'lowshelf'
  | 'peaking'

export type Engine = {
  [K in EngineMessageType]: (
    req: Omit<EngineRequest<K>, 'type' | 'id'>
  ) => Promise<EngineResponse<K>>
} & {
  memory: WebAssembly.Memory
  pointers: ContextPointers
  audioContext: AudioContext
  globalGain: GainNode
  analyser: AnalyserNode

  util: {
    getFilterCoefficients: (
      type: FilterType,
      freq: number,
      q: number,
      gain: number
    ) => Float32Array
  }
}

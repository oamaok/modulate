import * as t from 'io-ts'
import {
  UserRegistration,
  Vec2,
  Socket,
  UserLogin,
  Cable,
  Patch,
  PatchMetadata,
  CursorMoveMessage,
  ClientMessage,
  PatchUpdateMessage,
  PatchEvent,
  OutputSocket,
  InputSocket,
} from './type-validators'
import { Module } from '@modulate/worklets/src/modules'

export type IndexOf<
  Arr extends readonly any[] | any[],
  Elem extends Arr[number],
  Acc extends number[] = [],
> = Arr[0] extends Elem
  ? Acc['length']
  : Arr extends [any, ...infer Rest] | readonly [any, ...infer Rest]
    ? IndexOf<Rest, Elem, [...Acc, 0]>
    : never

export type Id = string
export type UserRegistration = t.TypeOf<typeof UserRegistration>
export type UserLogin = t.TypeOf<typeof UserLogin>
export type User = { id: string; username: string }
export type Vec2 = t.TypeOf<typeof Vec2>
export type Socket = t.TypeOf<typeof Socket>
export type SocketType = Socket['type']
export type Cable = t.TypeOf<typeof Cable>
export type Patch = t.TypeOf<typeof Patch>
export type OutputSocket = t.TypeOf<typeof OutputSocket>
export type InputSocket = t.TypeOf<typeof InputSocket>
export type PatchMetadata = t.TypeOf<typeof PatchMetadata>
export type ClientMessage = t.TypeOf<typeof ClientMessage>
export type PatchEvent = t.TypeOf<typeof PatchEvent>

export type Room = {
  id: string
  creator: User
  users: Record<
    string,
    {
      id: string
      username: string
      cursor: Vec2
    }
  >
  patch: Patch
}

export type InitRoomMessage = {
  type: 'init-room'
  room: Room
}

export type UserJoinMessage = {
  type: 'user-join'
  user: {
    id: string
    username: string
    cursor: Vec2
  }
}

export type UserLeaveMessage = {
  type: 'user-leave'
  userId: string
}

export type ServerMessage =
  | InitRoomMessage
  | UserJoinMessage
  | UserLeaveMessage
  | (t.TypeOf<typeof CursorMoveMessage> & { userId: string })
  | t.TypeOf<typeof PatchUpdateMessage>

export type NoteName =
  | 'C'
  | 'C#'
  | 'D'
  | 'D#'
  | 'E'
  | 'F'
  | 'F#'
  | 'G'
  | 'G#'
  | 'A'
  | 'A#'
  | 'B'

export type Note = {
  index: number
  name: NoteName
  octave: number
  gate: boolean
  glide: boolean
}

export type SequencerMessage = {
  type: 'SET_NOTES'
  notes: Note[]
}

export type ClockMessage =
  | {
      type: 'RESET'
    }
  | {
      type: 'SET_RUNNING'
      isRunning: boolean
    }

export type ContextPointers = {
  outputLeft: number
  outputRight: number
  workers: Uint32Array
  audioWorkletPosition: number
  workerPerformance: number
  workerPosition: number
}

export type EngineMessage =
  | {
      type: 'init'
      req: {
        memory: WebAssembly.Memory
        wasm: ArrayBuffer
        threads: number
      }
      res: {
        pointers: ContextPointers
      }
    }
  | {
      type: 'createModule'
      req: { name: Module['name'] }
      res: { moduleHandle: number }
    }
  | {
      type: 'deleteModule'
      req: { moduleHandle: number }
      res: {}
    }
  | {
      type: 'setParameterValue'
      req: { moduleHandle: number; parameterId: number; value: number }
      res: {}
    }
  | {
      type: 'connectToInput'
      req: {
        from: [moduleHandle: number, outputId: number]
        to: [moduleHandle: number, inputId: number]
      }
      res: { connectionId: number }
    }
  | {
      type: 'connectToParameter'
      req: {
        from: [moduleHandle: number, outputId: number]
        to: [moduleHandle: number, parameterId: number]
      }
      res: { connectionId: number }
    }
  | {
      type: 'removeConnection'
      req: { connectionId: number }
      res: {}
    }
  | {
      type: 'sendMessageToModule'
      req: { moduleHandle: number; message: ModuleMessage<Module> }
      res: {}
    }

export type ModuleMessage<M extends Module> = M extends { messages: any }
  ? M['messages']
  : never
export type ModuleEvent<M extends Module> = M extends { events: any }
  ? M['events']
  : never

export type EngineEvent = {
  type: 'moduleEvent'
  moduleHandle: number
  message: ModuleEvent<Module>
}

export type EngineMessageType = EngineMessage['type']
export type EngineRequest<T extends EngineMessageType> = {
  type: T
  id: number
} & Extract<EngineMessage, { type: T }>['req']
export type EngineResponse<T extends EngineMessageType> = {
  type: T
  id: number
} & Extract<EngineMessage, { type: T }>['res']

export type Rect = {
  x: number
  y: number
  width: number
  height: number
}

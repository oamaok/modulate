import * as t from 'io-ts'
import {
  UserRegistration,
  Vec2,
  SocketType,
  ConnectedSocket,
  UserLogin,
  Cable,
  Patch,
  PatchMetadata,
} from './validators'

export type Id = string
export type UserRegistration = t.TypeOf<typeof UserRegistration>
export type UserLogin = t.TypeOf<typeof UserLogin>
export type User = { id: string; username: string }
export type Vec2 = t.TypeOf<typeof Vec2>
export type SocketType = t.TypeOf<typeof SocketType>
export type ConnectedSocket = t.TypeOf<typeof ConnectedSocket>
export type Cable = t.TypeOf<typeof Cable>
export type Patch = t.TypeOf<typeof Patch>
export type PatchMetadata = t.TypeOf<typeof PatchMetadata>

export type Note = {
  gate: boolean
  voltage: number
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

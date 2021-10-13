import * as t from 'io-ts'
import { Vec2, SocketType, ConnectedSocket, Cable, Patch } from './validators'

export type Id = string

export type Vec2 = t.TypeOf<typeof Vec2>
export type SocketType = t.TypeOf<typeof SocketType>
export type ConnectedSocket = t.TypeOf<typeof ConnectedSocket>
export type Cable = t.TypeOf<typeof Cable>
export type Patch = t.TypeOf<typeof Patch>

import * as t from 'io-ts'

const nullable = <T extends t.Any>(x: T) => t.union([x, t.null])

export const Vec2 = t.type({
  x: t.number,
  y: t.number,
})

export const InputSocket = t.type({
  type: t.union([t.literal('input'), t.literal('parameter')]),
  index: t.number,
  moduleId: t.string,
})

export const OutputSocket = t.type({
  type: t.literal('output'),
  index: t.number,
  moduleId: t.string,
})

export const Socket = t.union([InputSocket, OutputSocket])

export const Cable = t.type({
  id: t.string,
  from: OutputSocket,
  to: InputSocket,
})

export const Module = t.type({
  name: t.string,
  position: Vec2,
  knobs: t.array(t.number),
  state: nullable(t.UnknownRecord),
})

export const User = t.type({
  id: t.string,
  username: t.string,
})

export const PatchMetadata = t.type({
  id: nullable(t.string),
  name: t.string,
  author: nullable(User),
})

export const Patch = t.type({
  modules: t.record(t.string, Module),
  cables: t.array(Cable),
})

export const UserRegistration = t.type({
  username: t.string,
  password: t.string,
  email: t.string,
})

export const UserLogin = t.type({
  email: t.string,
  password: t.string,
})

export const JoinRoomMessage = t.type({
  type: t.literal('join-room'),
})

export const CursorMoveMessage = t.type({
  type: t.literal('cursor-move'),
  position: Vec2,
})

export const CreateModuleEvent = t.type({
  type: t.literal('create-module'),
  moduleId: t.string,
  name: t.string,
  position: Vec2,
})

export const DeleteModuleEvent = t.type({
  type: t.literal('delete-module'),
  moduleId: t.string,
})

export const ChangeModuleStateEvent = t.type({
  type: t.literal('change-module-state'),
  moduleId: t.string,
  state: t.UnknownRecord,
})

export const ChangeModulePositionEvent = t.type({
  type: t.literal('change-module-position'),
  moduleId: t.string,
  position: Vec2,
})

export const TweakKnobEvent = t.type({
  type: t.literal('tweak-knob'),
  moduleId: t.string,
  knob: t.number,
  value: t.number,
})

export const ConnectCableEvent = t.type({
  type: t.literal('connect-cable'),
  cable: Cable,
})

export const DisconnectCableEvent = t.type({
  type: t.literal('disconnect-cable'),
  cableId: t.string,
})

export const PatchEvent = t.union([
  CreateModuleEvent,
  DeleteModuleEvent,
  ChangeModuleStateEvent,
  ChangeModulePositionEvent,
  TweakKnobEvent,
  ConnectCableEvent,
  DisconnectCableEvent,
])

export const PatchUpdateMessage = t.type({
  type: t.literal('patch-update'),
  events: t.array(PatchEvent),
})

export const ClientMessage = t.union([
  JoinRoomMessage,
  CursorMoveMessage,
  PatchUpdateMessage,
])

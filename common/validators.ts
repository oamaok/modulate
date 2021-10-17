import * as t from 'io-ts'

const nullable = <T extends t.Any>(x: T) => t.union([x, t.null])

export const Vec2 = t.type({
  x: t.number,
  y: t.number,
})

export const SocketType = t.union([t.literal('output'), t.literal('input')])

export const ConnectedSocket = t.type({
  moduleId: t.string,
  name: t.string,
  type: SocketType,
})

export const Cable = t.type({
  id: t.string,
  from: ConnectedSocket,
  to: ConnectedSocket,
})

export const ModuleState = t.type({
  name: t.string,
  position: Vec2,
  state: t.union([t.undefined, t.unknown]),
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
  metadata: PatchMetadata,
  currentId: t.number,
  modules: t.record(t.string, ModuleState),
  knobs: t.record(t.string, t.record(t.string, t.number)),
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

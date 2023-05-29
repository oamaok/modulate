import { useEffect } from 'kaiku'
import { ClientMessage, Patch, ServerMessage } from '@modulate/common/types'
import * as util from '@modulate/common/util'
import * as api from './api'
import state, { loadPatch } from './state'
import assert from './assert'
import { PatchEvent } from '@modulate/common/types'
import { connectSockets, disconnectSockets } from './sockets'

let previousPatch: Patch = {
  currentId: 0,
  modules: {},
  knobs: {},
  cables: [],
}

let connection: WebSocket | null = null
let messageQueue: ClientMessage[] = []

const send = (message: ClientMessage) => {
  messageQueue.push(message)
  flushMessageQueue()
}

const flushMessageQueue = () => {
  if (connection && connection.readyState === connection.OPEN) {
    for (const message of messageQueue) {
      connection.send(JSON.stringify(message))
    }

    messageQueue = []
  }
}

export const createRoom = async (patchId: string) => {
  const { roomId } = await api.getRoomUsingPatch(patchId)
  history.pushState({}, '', `/room/${roomId}`)
  joinRoom(roomId)
}

export const joinRoom = (roomId: string) => {
  connection = new WebSocket(
    location.origin.replace(/^http/, 'ws') + '?roomId=' + roomId
  )

  connection.addEventListener('open', () => {
    send({ type: 'join-room' })
  })

  connection.addEventListener('message', (evt) => {
    const message = JSON.parse(evt.data) as ServerMessage

    switch (message.type) {
      case 'init-room': {
        previousPatch = util.cloneObject(message.room.patch) as Patch
        loadPatch({ id: null, name: 'Room', author: null }, message.room.patch)

        state.room = {
          users: message.room.users,
        }
        break
      }

      case 'user-join': {
        state.room!.users[message.user.id] = message.user
        break
      }

      case 'user-leave': {
        delete state.room!.users[message.userId]
        break
      }

      case 'cursor-move': {
        const room = state.room
        assert(room)

        room.users[message.userId]!.cursor = message.position
        break
      }

      case 'patch-update': {
        for (const event of message.events) {
          // Additional event handlers

          switch (event.type) {
            case 'delete-module': {
              const cablesToDisconnect = state.patch.cables.filter(
                (cable) =>
                  cable.from.moduleId === event.moduleId ||
                  cable.to.moduleId === event.moduleId
              )

              for (const cable of cablesToDisconnect) {
                disconnectSockets(cable.from, cable.to)
              }

              delete state.socketPositions[event.moduleId]
              break
            }
            case 'connect-cable': {
              connectSockets(event.cable.from, event.cable.to)
              break
            }
            case 'disconnect-cable': {
              const cable = state.patch.cables.find(
                (cable) => cable.id === event.cableId
              )
              assert(cable)
              disconnectSockets(cable.from, cable.to)
              break
            }
          }

          // State updates
          for (const patch of [previousPatch, state.patch]) {
            switch (event.type) {
              case 'create-module': {
                patch.modules[event.moduleId] = {
                  name: event.name,
                  position: event.position,
                  state: null,
                }
                break
              }
              case 'delete-module': {
                // TODO: This is copypasted from ./state.ts, maybe figure out a comomon function for them
                state.patch.cables = patch.cables.filter(
                  (cable) =>
                    cable.from.moduleId !== event.moduleId &&
                    cable.to.moduleId !== event.moduleId
                )

                delete patch.knobs[event.moduleId]
                delete patch.modules[event.moduleId]
                break
              }
              case 'change-module-position': {
                patch.modules[event.moduleId]!.position = { ...event.position }
                break
              }
              case 'change-module-state': {
                patch.modules[event.moduleId]!.state = util.cloneObject(
                  event.state
                ) as Record<string, unknown>
                break
              }

              case 'tweak-knob': {
                patch.knobs[event.moduleId]![event.knob] = event.value
                break
              }
              case 'connect-cable': {
                patch.cables.push(event.cable)
                break
              }
              case 'disconnect-cable': {
                patch.cables = patch.cables.filter(
                  (cable) => cable.id !== event.cableId
                )
                break
              }
            }
          }
        }
      }
    }
  })
}

let previousPos = { x: 0, y: 0 }
setInterval(() => {
  if (connection) {
    if (previousPos.x !== state.cursor.x || previousPos.y !== state.cursor.y) {
      send({
        type: 'cursor-move',
        position: {
          x: state.cursor.x - state.viewOffset.x,
          y: state.cursor.y - state.viewOffset.y,
        },
      })
      previousPos = {
        x: state.cursor.x,
        y: state.cursor.y,
      }
    }
  }
}, 50)

export const leaveRoom = () => {
  assert(connection)
  connection.close()
}

const dispatchPatchEvent = (event: PatchEvent) => {
  assert(connection)

  // TODO: Queue events
  send({ type: 'patch-update', events: [event] })
}

// NOTE: Currently there is no need to account for module name changes
// Module creations and deletions
useEffect(() => {
  if (!state.room) {
    return
  }

  for (const moduleId in state.patch.modules) {
    const module = state.patch.modules[moduleId]
    assert(module)

    if (!previousPatch.modules[moduleId]) {
      dispatchPatchEvent({
        type: 'create-module',
        moduleId,
        name: module.name,
        position: module.position,
      })

      previousPatch.modules[moduleId] = {
        name: module.name,
        position: {
          ...module.position,
        },
        state: null,
      }
    }
  }

  for (const moduleId in previousPatch.modules) {
    if (!(moduleId in state.patch.modules)) {
      dispatchPatchEvent({
        type: 'delete-module',
        moduleId,
      })

      delete previousPatch.modules[moduleId]
    }
  }
})

// Module state changes
useEffect(() => {
  if (!state.room) {
    return
  }

  for (const moduleId in state.patch.modules) {
    const module = state.patch.modules[moduleId]
    assert(module)

    const previousPatchModule = previousPatch.modules[moduleId]
    assert(previousPatchModule)

    if (!util.deepEqual(previousPatchModule.state, module.state)) {
      const newState = util.cloneObject(module.state!) as Record<
        string,
        unknown
      >
      dispatchPatchEvent({
        type: 'change-module-state',
        moduleId,
        state: newState,
      })
      previousPatchModule.state = newState
    }
  }
})

// Module position changes
useEffect(() => {
  if (!state.room) {
    return
  }

  for (const moduleId in state.patch.modules) {
    const module = state.patch.modules[moduleId]
    assert(module)

    const previousPatchModule = previousPatch.modules[moduleId]
    if (!previousPatchModule) {
      continue
    }

    if (
      previousPatchModule.position.x !== module.position.x ||
      previousPatchModule.position.y !== module.position.y
    ) {
      dispatchPatchEvent({
        type: 'change-module-position',
        moduleId,
        position: module.position,
      })
      previousPatchModule.position.x = module.position.x
      previousPatchModule.position.y = module.position.y
    }
  }
})

// Knob tweaks
useEffect(() => {
  if (!state.room) {
    return
  }
  for (const moduleId in state.patch.knobs) {
    const knobs = state.patch.knobs[moduleId]

    for (const knobName in knobs) {
      const knobValue = knobs[knobName]
      assert(typeof knobValue !== 'undefined')

      if (!previousPatch.knobs[moduleId]) {
        previousPatch.knobs[moduleId] = {}
      }

      if (previousPatch.knobs[moduleId]![knobName] !== knobValue) {
        dispatchPatchEvent({
          type: 'tweak-knob',
          moduleId,
          knob: knobName,
          value: knobValue,
        })
        previousPatch.knobs[moduleId]![knobName] = knobValue
      }
    }
  }
})

// Cable connects and disconnects
useEffect(() => {
  if (!state.room) {
    return
  }

  const previousCableIds = new Set(
    previousPatch.cables.map((cable) => cable.id)
  )
  const cableIds = new Set(state.patch.cables.map((cable) => cable.id))

  for (const prevCableId of previousCableIds) {
    if (!cableIds.has(prevCableId)) {
      dispatchPatchEvent({
        type: 'disconnect-cable',
        cableId: prevCableId,
      })
      previousPatch.cables = previousPatch.cables.filter(
        (cable) => cable.id !== prevCableId
      )
    }
  }

  for (const cableId of cableIds) {
    if (!previousCableIds.has(cableId)) {
      const cable = state.patch.cables.find((cable) => cable.id === cableId)
      assert(cable)

      dispatchPatchEvent({
        type: 'connect-cable',
        cable,
      })

      previousPatch.cables.push({
        id: cableId,
        from: { ...cable.from },
        to: { ...cable.to },
      })
    }
  }
})
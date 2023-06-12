import {
  Cable,
  EngineEvent,
  EngineMessageType,
  EngineRequest,
  EngineResponse,
  ModuleEvent,
  ModuleMessage,
} from '@modulate/common/types'
import * as util from '@modulate/common/util'
import assert from './assert'
import { Engine } from './types'
import { Module, ModuleName } from '@modulate/worklets/src/modules'

let audioContext: AudioContext | null = null
let engine: Engine | null = null

const eventSubscriptions: Record<number, (event: ModuleEvent<Module>) => void> =
  {}

export const initializeAudio = async () => {
  audioContext = new AudioContext()

  assert(audioContext)
  const [wasm] = await Promise.all([
    fetch('/assets/worklets.wasm').then((res) => res.arrayBuffer()),
    audioContext.audioWorklet.addModule('/assets/worklets.js'),
  ])

  const engineNode = new AudioWorkletNode(audioContext, 'ModulateEngine', {
    numberOfOutputs: 1,
  })
  engineNode.connect(audioContext.destination)
  const messageResolvers: Record<
    number,
    (res: EngineResponse<EngineMessageType>) => void
  > = {}

  engineNode.port.onmessage = ({
    data: msg,
  }: MessageEvent<EngineResponse<EngineMessageType> | EngineEvent>) => {
    if (msg.type === 'moduleEvent') {
      const callback = eventSubscriptions[msg.moduleHandle]
      if (!callback) {
        console.warn('unhandled module message, ', msg)
        return
      }
      callback(msg.message)
      return
    }

    const resolver = messageResolvers[msg.id]

    assert(resolver)
    resolver(msg)
    delete messageResolvers[msg.id]
  }

  let messageId = 0
  const sendMessage = <T extends EngineMessageType>(
    msg: Omit<EngineRequest<T>, 'id'>
  ): Promise<EngineResponse<T>> => {
    const id = messageId++

    engineNode.port.postMessage({
      ...msg,
      id,
    })

    return new Promise((resolve) => {
      messageResolvers[id] = resolve as (
        value: EngineResponse<EngineMessageType>
      ) => void
    })
  }

  const engineMessageTypes = [
    'init',
    'createModule',
    'deleteModule',
    'setParameterValue',
    'connectToInput',
    'connectToParameter',
    'removeConnection',
    'sendMessageToModule',
  ] as const

  engine = Object.fromEntries(
    engineMessageTypes.map((type) => [
      type,
      (req: Omit<EngineRequest<typeof type>, 'id' | 'type'>) =>
        sendMessage<typeof type>({ type, ...req }),
    ])
  ) as unknown as {
    [K in (typeof engineMessageTypes)[number]]: (
      req: Omit<EngineRequest<K>, 'id' | 'type'>
    ) => Promise<EngineResponse<K>>
  }

  await engine.init({ wasm })
}

// TODO: This need not be exposed any longer
export const getAudioContext = () => {
  assert(audioContext)
  return audioContext
}

const moduleHandles: Record<string, Promise<number>> = {}
const cableHandles: Record<string, number> = {}

export const getModuleHandle = async (
  moduleId: string
): Promise<number | null> => {
  const handle = moduleHandles[moduleId]
  if (typeof handle === 'undefined') return null
  return handle
}

export const createModule = async (moduleId: string, name: ModuleName) => {
  assert(engine)
  moduleHandles[moduleId] = engine
    .createModule({ name })
    .then(({ moduleHandle }) => moduleHandle)
}

export const deleteModule = async (moduleId: string) => {
  const moduleHandle = await moduleHandles[moduleId]
  assert(typeof moduleHandle !== 'undefined')
  assert(engine)
  await engine.deleteModule({ moduleHandle })
  delete eventSubscriptions[moduleHandle]
}

export const connectCable = async (cable: Cable) => {
  assert(engine)
  let connectionHandle: number

  const toModuleHandle = await getModuleHandle(cable.to.moduleId)
  const fromModuleHandle = await getModuleHandle(cable.from.moduleId)

  assert(toModuleHandle !== null)
  assert(fromModuleHandle !== null)

  switch (cable.to.type) {
    case 'input': {
      const res = await engine.connectToInput({
        from: [fromModuleHandle, cable.from.index],
        to: [toModuleHandle, cable.to.index],
      })
      connectionHandle = res.connectionId
      break
    }

    case 'parameter': {
      const res = await engine.connectToParameter({
        from: [fromModuleHandle, cable.from.index],
        to: [toModuleHandle, cable.to.index],
      })
      connectionHandle = res.connectionId
      break
    }
  }

  cableHandles[cable.id] = connectionHandle
}

export const disconnectCable = async (cable: Cable) => {
  assert(engine)
  const connectionHandle = cableHandles[cable.id]
  assert(typeof connectionHandle !== 'undefined')
  await engine.removeConnection({ connectionId: connectionHandle })

  delete cableHandles[cable.id]
}

export const setParameterValue = async (
  moduleId: string,
  parameterIndex: number,
  value: number
) => {
  assert(engine)
  const moduleHandle = await getModuleHandle(moduleId)
  assert(moduleHandle !== null)
  engine.setParameterValue({ moduleHandle, parameterId: parameterIndex, value })
}

export const sendMessageToModule = async <M extends Module>(
  moduleId: string,
  message: ModuleMessage<M>
) => {
  const messageCopy = util.cloneObject(message)
  assert(engine)
  const moduleHandle = await getModuleHandle(moduleId)
  assert(moduleHandle !== null)
  engine.sendMessageToModule({ moduleHandle, message: messageCopy })
}

export const onModuleEvent = async <M extends Module>(
  moduleId: string,
  callback: (event: ModuleEvent<M>) => void
) => {
  assert(engine)
  const moduleHandle = await getModuleHandle(moduleId)
  assert(moduleHandle !== null)
  eventSubscriptions[moduleHandle] = callback as (
    event: ModuleEvent<Module>
  ) => void
}

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

type InitOptions = {
  spawnAudioWorklet: boolean
  numWorklets: number
}

let engine: Engine | null = null

const eventSubscriptions: Record<number, (event: ModuleEvent<Module>) => void> =
  {}

const DEFAULT_OPTIONS: InitOptions = {
  spawnAudioWorklet: true,
  numWorklets: Math.max(4, navigator.hardwareConcurrency) - 1,
}

const toDataUrl = (script: string) =>
  `data:application/javascript;base64,${btoa(script)}`

const prefetchedContent = Promise.all([
  fetch('/assets/worklets.wasm').then((res) => res.arrayBuffer()),
  fetch('/assets/thread-worker.js').then((res) => res.text()),
  fetch('/assets/audio-worklet.js').then((res) => res.text()),
])

export const initializeEngine = async (opts: Partial<InitOptions> = {}) => {
  const options: InitOptions = Object.assign({}, DEFAULT_OPTIONS, opts)
  assert(
    options.numWorklets > 0,
    'initializeEngine: numWorklets must be greater than zero'
  )

  const audioContext = new AudioContext()
  assert(audioContext)

  const [wasm, threadWorkerScript, audioWorkletScript] = await prefetchedContent
  const engineWorker = new Worker('/assets/main-worker.js')

  const messageResolvers: Record<
    number,
    (res: EngineResponse<EngineMessageType>) => void
  > = {}

  engineWorker.onmessage = ({
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

    engineWorker.postMessage({
      ...msg,
      id,
    })

    return new Promise((resolve) => {
      messageResolvers[id] = resolve as (
        value: EngineResponse<EngineMessageType>
      ) => void
    })
  }

  const createEngineMethod =
    <T extends EngineMessageType>(type: T) =>
    (req: Omit<EngineRequest<T>, 'id' | 'type'>) =>
      sendMessage<T>({ type, ...req } as Omit<EngineRequest<T>, 'id'>)

  const memory = new WebAssembly.Memory({
    initial: 18,
    maximum: 16384,
    shared: true,
  })

  const { pointers } = await createEngineMethod('init')({
    memory,
    threads: options.numWorklets,
    wasm,
  })

  engine = {
    init: createEngineMethod('init'),
    createModule: createEngineMethod('createModule'),
    deleteModule: createEngineMethod('deleteModule'),
    setParameterValue: createEngineMethod('setParameterValue'),
    connectToInput: createEngineMethod('connectToInput'),
    connectToParameter: createEngineMethod('connectToParameter'),
    removeConnection: createEngineMethod('removeConnection'),
    sendMessageToModule: createEngineMethod('sendMessageToModule'),
    memory,
    pointers,
    audioContext,
    globalGain: audioContext.createGain(),
    analyser: audioContext.createAnalyser(),
  }

  engine.analyser.fftSize = 1 << 15
  engine.globalGain.connect(audioContext.destination)
  engine.globalGain.connect(engine.analyser)

  assert(pointers.workers.length === options.numWorklets)

  const workers = await Promise.all(
    [...pointers.workers].map((pointer) => {
      const worker = new Worker(toDataUrl(threadWorkerScript))
      worker.postMessage([wasm, memory, pointer])
      return new Promise<Worker>((resolve) => {
        worker.onmessage = () => resolve(worker)
      })
    })
  )

  if (options.spawnAudioWorklet) {
    await audioContext.audioWorklet.addModule(toDataUrl(audioWorkletScript))
    const engineOutputNode = new AudioWorkletNode(
      audioContext,
      'EngineOutput',
      {
        numberOfOutputs: 1,
      }
    )
    engineOutputNode.connect(engine.globalGain)

    engineOutputNode.port.postMessage({
      memory,
      outputBufferPtr: pointers.outputBuffers,
      audioThreadPositionPtr: pointers.audioWorkletPosition,
    })
  }
}

export const getContextPointers = () => {
  assert(engine)
  return engine.pointers
}

export const getAudioContext = () => {
  assert(engine)
  return engine.audioContext
}

export const getAnalyser = () => {
  assert(engine)
  return engine.analyser
}

let workerPositionBuf: BigUint64Array | null = null
export const getWorkerPosition = () => {
  assert(engine)

  if (!workerPositionBuf) {
    workerPositionBuf = new BigUint64Array(
      engine.memory.buffer,
      engine.pointers.workerPosition,
      1
    )
  }

  return workerPositionBuf[0]!
}

export const getMemory = () => {
  assert(engine)
  return engine.memory
}

export const getWorkerTimers = () => {
  assert(engine)
  const { memory } = engine

  return new Float32Array(
    memory.buffer,
    engine.pointers.workerPerformance,
    engine.pointers.workers.length
  )
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
  assert(
    !(moduleId in moduleHandles),
    `createModule: module with the id "${moduleId}" already exists`
  )

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
  assert(
    !(cable.id in cableHandles),
    `connectCable: cable with the id "${cable.id}" already exists`
  )
  let connectionHandle: number

  const toModuleHandle = await getModuleHandle(cable.to.moduleId)
  const fromModuleHandle = await getModuleHandle(cable.from.moduleId)

  assert(
    toModuleHandle !== null,
    `connectCable: trying to connect to a non-existent module "${cable.to.moduleId}"`
  )
  assert(
    fromModuleHandle !== null,
    `connectCable: trying to connect from a non-existent module "${cable.from.moduleId}"`
  )

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

export const disconnectCable = async (cable: Pick<Cable, 'id'>) => {
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

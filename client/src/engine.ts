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

const eventSubscriptions: Map<number, (event: ModuleEvent<Module>) => void> =
  new Map()

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
      const callback = eventSubscriptions.get(msg.moduleHandle)
      assert(callback, `unhandled module message: ${JSON.stringify(msg)}`)

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

  let memory: WebAssembly.Memory | null = null

  for (let maximum = 0x4000; maximum > 128; maximum >>= 1) {
    try {
      memory = new WebAssembly.Memory({
        initial: 32,
        maximum,
        shared: true,
      })
      break
    } catch (err) {}
  }

  assert(memory)

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
      return new Promise<Worker>((resolve, reject) => {
        worker.onmessage = ({ data: error }) => {
          if (error) {
            reject(error)
          } else {
            resolve(worker)
          }
        }
      })
    })
  )

  window.addEventListener('beforeunload', () => {
    for (const worker of workers) {
      worker.terminate()
    }
  })

  if (options.spawnAudioWorklet) {
    await audioContext.audioWorklet.addModule(toDataUrl(audioWorkletScript))
    const engineOutputNode = new AudioWorkletNode(
      audioContext,
      'EngineOutput',
      {
        numberOfOutputs: 1,
        outputChannelCount: [2],
      }
    )
    engineOutputNode.connect(engine.globalGain)

    engineOutputNode.port.postMessage({
      memory,
      outputLeftPtr: pointers.outputLeft,
      outputRightPtr: pointers.outputRight,
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

export const getGain = () => {
  assert(engine)
  return engine.globalGain
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

const moduleHandles: Map<string, Promise<number>> = new Map()
const cableHandles: Map<string, number> = new Map()

export const getModuleHandle = async (
  moduleId: string
): Promise<number | null> => {
  const handle = moduleHandles.get(moduleId)
  if (typeof handle === 'undefined') return null
  return handle
}

export const createModule = (moduleId: string, name: ModuleName) => {
  assert(engine)
  assert(
    !moduleHandles.has(moduleId),
    `createModule: module with the id "${moduleId}" already exists`
  )

  moduleHandles.set(
    moduleId,
    engine.createModule({ name }).then(({ moduleHandle }) => moduleHandle)
  )
}

export const deleteModule = async (moduleId: string) => {
  const moduleHandle = await moduleHandles.get(moduleId)
  assert(typeof moduleHandle !== 'undefined')
  assert(engine)
  await engine.deleteModule({ moduleHandle })
  eventSubscriptions.delete(moduleHandle)
  moduleHandles.delete(moduleId)
}

export const connectCable = async (cable: Cable) => {
  assert(engine)
  assert(
    !cableHandles.has(cable.id),
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

  cableHandles.set(cable.id, connectionHandle)
}

export const disconnectCable = async (cable: Pick<Cable, 'id'>) => {
  assert(engine)
  const connectionHandle = cableHandles.get(cable.id)
  assert(typeof connectionHandle !== 'undefined')
  await engine.removeConnection({ connectionId: connectionHandle })

  cableHandles.delete(cable.id)
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
  eventSubscriptions.set(
    moduleHandle,
    callback as (event: ModuleEvent<Module>) => void
  )
}

export const setGlobalVolume = (value: number) => {
  const audioContext = getAudioContext()
  const gain = getGain().gain
  gain.setTargetAtTime(value, audioContext.currentTime, 0.01)
}

export const getMemorySlice = (address: number, length: number) => {
  assert(engine)
  return new Float32Array(engine.memory.buffer, address, length)
}

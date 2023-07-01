import {
  EngineRequest,
  EngineResponse,
  EngineMessageType,
  EngineEvent,
} from '@modulate/common/types'
import init, { ModulateEngineWrapper } from '../pkg/worklets'

let engine: ModulateEngineWrapper | null = null
const requestHandlers: {
  [K in EngineMessageType]: (
    req: EngineRequest<K>
  ) =>
    | Omit<EngineResponse<K>, 'type' | 'id'>
    | Promise<Omit<EngineResponse<K>, 'type' | 'id'>>
} = {
  init: async ({ wasm }) => {
    const { memory } = await init(wasm)
    engine = new ModulateEngineWrapper(onMessage)
    // TODO: Report error if WASM init failed
    await engine.initWorkers()
    const workerPointers = await engine.getWorkerPointers()
    const outputBufferPtr = await engine.getOutputBufferPtr()
    const audioThreadPositionPtr = await engine.getAudioThreadPositionPtr()
    const workerTimerPointers = await engine.getWorkerTimerPointers()
    return {
      outputBufferPtr,
      memory,
      workerPointers,
      audioThreadPositionPtr,
      workerTimerPointers,
    }
  },
  createModule: ({ name }) => {
    const moduleHandle = engine!.createModule(name)
    return { moduleHandle }
  },
  deleteModule: ({ moduleHandle }) => {
    engine!.deleteModule(moduleHandle)
    return {}
  },
  setParameterValue: ({ moduleHandle, parameterId, value }) => {
    engine!.setParameterValue(moduleHandle, parameterId, value)
    return {}
  },
  connectToInput: ({ from, to }) => {
    const connectionId = engine!.connectToInput(from, to)
    return { connectionId }
  },
  connectToParameter: ({ from, to }) => {
    const connectionId = engine!.connectToParameter(from, to)
    return { connectionId }
  },
  removeConnection: ({ connectionId }) => {
    engine!.removeConnection(connectionId)
    return {}
  },
  sendMessageToModule: ({ moduleHandle, message }) => {
    engine!.sendMessageToModule(moduleHandle, message)
    return {}
  },
}

const onMessage = (moduleHandle: number, message: any) => {
  const engineEvent: EngineEvent = {
    type: 'moduleEvent',
    moduleHandle,
    message,
  }

  self.postMessage(engineEvent)
}

self.onmessage = async (
  msg: MessageEvent<EngineRequest<EngineMessageType>>
) => {
  const req = msg.data
  self.postMessage({
    id: msg.data.id,
    type: req.type,
    // @ts-ignore
    ...(await requestHandlers[req.type](req)),
  })
}
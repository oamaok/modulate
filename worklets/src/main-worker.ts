import {
  EngineRequest,
  EngineResponse,
  EngineMessageType,
  EngineEvent,
  ModuleEvent,
} from '@modulate/common/types'
import { initSync, ModulateEngineWrapper } from '../pkg/modulate'
import { Module } from './modules'

let engine: ModulateEngineWrapper | null = null
const requestHandlers: {
  [K in EngineMessageType]: (
    req: EngineRequest<K>
  ) =>
    | Omit<EngineResponse<K>, 'type' | 'id'>
    | Promise<Omit<EngineResponse<K>, 'type' | 'id'>>
} = {
  init: async ({ threads, wasm, memory }) => {
    initSync(wasm, memory)
    engine = new ModulateEngineWrapper(threads)
    // TODO: Report error if WASM init failed
    const workerPointers = await engine.initWorkers()
    const {
      output_left,
      output_right,
      worker_performance,
      worker_position,
      audio_worklet_position,
    } = await engine.getContextPointers()
    return {
      pointers: {
        outputLeft: output_left,
        outputRight: output_right,
        workers: workerPointers,
        audioWorkletPosition: audio_worklet_position,
        workerPerformance: worker_performance,
        workerPosition: worker_position,
      },
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

setInterval(() => {
  if (!engine) return

  const events: { id: number; event: ModuleEvent<Module> }[] =
    engine.collectModuleEvents()

  for (const { id, event } of events) {
    const engineEvent: EngineEvent = {
      type: 'moduleEvent',
      moduleHandle: id,
      message: event,
    }

    self.postMessage(engineEvent)
  }
}, 16)

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

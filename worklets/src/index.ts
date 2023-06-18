import {
  EngineRequest,
  EngineResponse,
  EngineMessageType,
  EngineEvent,
} from '@modulate/common/types'
import init, { InitOutput, ModulateEngineWrapper } from '../pkg/worklets'

const ZERO_BUF = new Float32Array(128)

class ModulateEngine extends AudioWorkletProcessor {
  engine: ModulateEngineWrapper | null = null
  wasm: InitOutput | null = null

  requestHandlers: {
    [K in EngineMessageType]: (
      req: EngineRequest<K>
    ) =>
      | Omit<EngineResponse<K>, 'type' | 'id'>
      | Promise<Omit<EngineResponse<K>, 'type' | 'id'>>
  } = {
    init: async ({ wasm }) => {
      this.wasm = await init(wasm)
      this.engine = new ModulateEngineWrapper(this.onMessage)
      // TODO: Report error if WASM init failed
      return { success: true }
    },
    createModule: ({ name }) => {
      const moduleHandle = this.engine!.createModule(name)
      return { moduleHandle }
    },
    deleteModule: ({ moduleHandle }) => {
      this.engine!.deleteModule(moduleHandle)
      return {}
    },
    setParameterValue: ({ moduleHandle, parameterId, value }) => {
      this.engine!.setParameterValue(moduleHandle, parameterId, value)
      return {}
    },
    connectToInput: ({ from, to }) => {
      const connectionId = this.engine!.connectToInput(from, to)
      return { connectionId }
    },
    connectToParameter: ({ from, to }) => {
      const connectionId = this.engine!.connectToParameter(from, to)
      return { connectionId }
    },
    removeConnection: ({ connectionId }) => {
      this.engine!.removeConnection(connectionId)
      return {}
    },
    sendMessageToModule: ({ moduleHandle, message }) => {
      this.engine!.sendMessageToModule(moduleHandle, message)
      return {}
    },
  }

  onMessage = (moduleHandle: number, message: any) => {
    const engineEvent: EngineEvent = {
      type: 'moduleEvent',
      moduleHandle,
      message,
    }

    this.port.postMessage(engineEvent)
  }

  constructor() {
    super()
    this.port.onmessage = async (
      msg: MessageEvent<EngineRequest<EngineMessageType>>
    ) => {
      const req = msg.data
      this.port.postMessage({
        id: msg.data.id,
        type: req.type,
        // @ts-ignore
        ...(await this.requestHandlers[req.type](req)),
      })
    }
  }

  process(
    inputs: Float32Array[][],
    outputs: Float32Array[][],
    parameters: Record<string, Float32Array>
  ) {
    if (this.engine && this.wasm) {
      let memory = new Float32Array(this.wasm.memory.buffer)
      memory.set(ZERO_BUF, this.engine.getOutputBufferPtr() / 4)
      this.engine.process()

      for (let i = 0; i < outputs.length; i++) {
        outputs[i]![0]!.set(
          new Float32Array(
            this.wasm.memory.buffer,
            this.engine.getOutputBufferPtr(),
            128
          )
        )
      }
    }

    return true
  }
}

registerProcessor('ModulateEngine', ModulateEngine)

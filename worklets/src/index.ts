import init, { InitOutput } from '../pkg/worklets'
import { Module, modules } from './modules'

type ModuleNames = typeof modules extends readonly { name: infer T }[]
  ? T
  : never

const AUDIO_PARAM_SCALAR_SIGNAL = new Float32Array(
  new Uint32Array([0b01111111100011001100110011001100]).buffer
)

class WASMInitializer extends AudioWorkletProcessor {
  constructor() {
    super()
    this.port.onmessage = async (msg) => {
      const wasm = await init(msg.data)

      for (const module of modules) {
        createProcessor(wasm, module as any)
      }

      this.port.postMessage(true)
    }
  }

  process() {
    return true
  }
}

registerProcessor('WASMInitializer', WASMInitializer)

class Oscilloscope extends AudioWorkletProcessor {
  buffer: Float32Array | null = null

  offset = 0

  constructor() {
    super()

    this.port.onmessage = (msg: MessageEvent<SharedArrayBuffer>) => {
      this.buffer = new Float32Array(msg.data)
    }
  }

  process(inputs: Float32Array[][]) {
    if (this.buffer) {
      const offset = this.offset * 128
      this.buffer[this.buffer.length - 1] = offset

      this.buffer.set(inputs[0]![0] ?? ZERO_BUF, offset)
      this.offset++
      if (this.offset > 127) {
        this.offset = 0
      }
    }

    return true
  }
}

registerProcessor('Oscilloscope', Oscilloscope)

const createProcessor = <
  T extends {
    inputs: () => Int32Array
    outputs: () => Int32Array
    parameters: () => Int32Array
    process: () => void
  }
>(
  wasm: InitOutput,
  { name, parameterDescriptors, onMessage, init, constructor }: Module<any>
) => {
  class Module extends AudioWorkletProcessor {
    static parameterDescriptors = parameterDescriptors
    instance: T
    __process: ReturnType<typeof createProcess>

    constructor() {
      super()
      this.instance = new constructor()
      this.__process = createProcess(wasm, this.instance, parameterDescriptors)

      if (init) {
        init(this.instance, this.port)
      }
      if (onMessage) {
        this.port.onmessage = (msg) =>
          onMessage(this.instance, msg.data, this.port)
      }
    }

    process(
      inputs: Float32Array[][],
      outputs: Float32Array[][],
      parameters: Record<string, Float32Array>
    ) {
      return this.__process(inputs, outputs, parameters)
    }
  }

  registerProcessor(name, Module)
}

const ZERO_BUF = new Float32Array(128)

const createProcess = (
  wasm: InitOutput,
  instance: {
    inputs: () => Int32Array
    outputs: () => Int32Array
    parameters: () => Int32Array
    process: () => void
  },
  parameterDescriptors: AudioParamDescriptor[] = []
) => {
  let memory = new Float32Array(wasm.memory.buffer)

  let inputBindings = Array.from(instance.inputs()).map((ptr) => ptr / 4)
  let outputBindings = Array.from(instance.outputs()).map(
    (ptr) => new Float32Array(wasm.memory.buffer, ptr, 128)
  )
  let parameterBindings = Array.from(instance.parameters()).map(
    (ptr) => ptr / 4
  )

  const refreshBufferReferences = () => {
    memory = new Float32Array(wasm.memory.buffer)

    inputBindings = Array.from(instance.inputs()).map((ptr) => ptr / 4)
    outputBindings = Array.from(instance.outputs()).map(
      (ptr) => new Float32Array(wasm.memory.buffer, ptr, 128)
    )
    parameterBindings = Array.from(instance.parameters()).map((ptr) => ptr / 4)
  }

  if (parameterBindings.length !== parameterDescriptors.length) {
    console.warn('Parameter length mismatch', instance)
  }

  return (
    inputs: Float32Array[][],
    outputs: Float32Array[][],
    parameters: Record<string, Float32Array>
  ) => {
    if (!memory.length) {
      refreshBufferReferences()
    }

    for (let i = 0; i < inputBindings.length; i++) {
      if (inputs[i] && inputs[i]![0]) {
        memory.set(inputs[i]![0]!, inputBindings[i])
      } else {
        memory.set(ZERO_BUF, inputBindings[i])
      }
    }

    for (let i = 0; i < parameterBindings.length; i++) {
      const descriptor = parameterDescriptors[i]
      if (!descriptor) break

      const parameter = parameters[descriptor.name]!

      memory.set(parameter, parameterBindings[i])

      if (parameter.length === 1) {
        memory.set(AUDIO_PARAM_SCALAR_SIGNAL, parameterBindings[i]! + 1)
      }
    }

    instance.process()

    for (let i = 0; i < outputBindings.length; i++) {
      outputs[i]![0]!.set(outputBindings[i]!)
    }

    return true
  }
}

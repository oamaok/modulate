type AudioParamDescriptor = {
  name: string
  automationRate?: 'a-rate' | 'k-rate'
  minValue?: number
  maxValue?: number
  defaultValue?: number
}

declare abstract class AudioWorkletProcessor {
  readonly port: MessagePort
  readonly parameterDescriptors?: AudioParamDescriptor[]
  abstract process(
    inputs: Float32Array[][],
    outputs: Float32Array[][],
    parameters: Record<string, Float32Array>
  ): boolean
}

declare function registerProcessor(
  name: string,
  processorCtor: new (
    options?: AudioWorkletNodeOptions
  ) => AudioWorkletProcessor
): void

declare const sampleRate: number

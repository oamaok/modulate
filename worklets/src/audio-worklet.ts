// This must be power of 2.
// TODO: Derive this from rust side maybe?
const AUDIO_BUFFERS = 32n

let counter = 0

class EngineOutput extends AudioWorkletProcessor {
  memory: WebAssembly.Memory | null = null
  outputBufferPtr: number | null = null
  audioThreadPositionPtr: number | null

  constructor() {
    super()
    this.port.onmessage = (
      message: MessageEvent<{
        memory: WebAssembly.Memory
        outputBufferPtr: number
        audioThreadPositionPtr: number
      }>
    ) => {
      const { memory, outputBufferPtr, audioThreadPositionPtr } = message.data
      console.log(outputBufferPtr)
      this.memory = memory
      this.outputBufferPtr = outputBufferPtr
      this.audioThreadPositionPtr = audioThreadPositionPtr
    }
  }

  process(
    inputs: Float32Array[][],
    outputs: Float32Array[][],
    parameters: Record<string, Float32Array>
  ) {
    if (!this.memory) return true
    if (!this.outputBufferPtr) return true
    if (!this.audioThreadPositionPtr) return true

    const audioThreadPosition = new BigInt64Array(
      this.memory.buffer,
      this.audioThreadPositionPtr,
      1
    )
    for (let i = 0; i < outputs.length; i++) {
      outputs[i]![0]!.set(
        new Float32Array(
          this.memory.buffer,
          this.outputBufferPtr +
            4 * 128 * Number(audioThreadPosition[0]! % AUDIO_BUFFERS),
          128
        )
      )
    }
    //if ((counter++) % 500 === 0) {
    Atomics.add(audioThreadPosition, 0, 1n)
    Atomics.notify(audioThreadPosition, 0)
    //}
    return true
  }
}

registerProcessor('EngineOutput', EngineOutput)
// This must be power of 2.
// TODO: Derive this from rust side maybe?
const AUDIO_BUFFERS = 16n

class EngineOutput extends AudioWorkletProcessor {
  memory: WebAssembly.Memory | null = null
  outputLeft: Float32Array[] = []
  outputRight: Float32Array[] = []
  outputRightPtr: number | null = null
  outputLeftPtr: number | null = null
  audioThreadPositionPtr: number | null

  constructor() {
    super()
    this.port.onmessage = (
      message: MessageEvent<{
        memory: WebAssembly.Memory
        outputLeftPtr: number
        outputRightPtr: number
        audioThreadPositionPtr: number
      }>
    ) => {
      const { memory, outputLeftPtr, outputRightPtr, audioThreadPositionPtr } =
        message.data
      this.memory = memory
      this.outputLeftPtr = outputLeftPtr
      this.outputRightPtr = outputRightPtr
      this.audioThreadPositionPtr = audioThreadPositionPtr

      for (let i = 0; i < AUDIO_BUFFERS; i++) {
        this.outputLeft.push(
          new Float32Array(
            this.memory.buffer,
            this.outputLeftPtr + 4 * 128 * Number(i % Number(AUDIO_BUFFERS)),
            128
          )
        )
      }

      for (let i = 0; i < AUDIO_BUFFERS; i++) {
        this.outputRight.push(
          new Float32Array(
            this.memory.buffer,
            this.outputRightPtr + 4 * 128 * Number(i % Number(AUDIO_BUFFERS)),
            128
          )
        )
      }
    }
  }

  process(
    inputs: Float32Array[][],
    outputs: Float32Array[][],
    parameters: Record<string, Float32Array>
  ) {
    if (!this.memory) return true
    if (!this.outputLeftPtr) return true
    if (!this.outputRightPtr) return true
    if (!this.audioThreadPositionPtr) return true

    const audioThreadPosition = new BigInt64Array(
      this.memory.buffer,
      this.audioThreadPositionPtr,
      1
    )

    outputs[0]![0]!.set(
      this.outputLeft[Number(audioThreadPosition[0]! % AUDIO_BUFFERS)]!
    )
    outputs[0]![1]!.set(
      this.outputRight[Number(audioThreadPosition[0]! % AUDIO_BUFFERS)]!
    )

    Atomics.add(audioThreadPosition, 0, 1n)
    Atomics.notify(audioThreadPosition, 0)
    return true
  }
}

registerProcessor('EngineOutput', EngineOutput)

import * as engine from './engine'

// @ts-ignore
window.advanceToPosition = async (pos: bigint) => {
  const pointers = engine.getContextPointers()
  const audioThreadPosition = new BigInt64Array(
    engine.getMemory().buffer,
    pointers.audioWorkletPosition,
    1
  )

  Atomics.add(audioThreadPosition, 0, pos)
  Atomics.notify(audioThreadPosition, 0)

  for (;;) {
    if (engine.getWorkerPosition() >= pos + 15n) {
      break
    }
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
}

// @ts-ignore
window.getBuffer = async (pos: number) => {
  const pointers = engine.getContextPointers()
  const buffer = new Float32Array(
    engine.getMemory().buffer,
    pointers.outputBuffers + pos * 128 * 4,
    128
  )
  return [...buffer]
}

// @ts-ignore
window.engine = engine

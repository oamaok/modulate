let audioContext: AudioContext | null = null

export const initializeAudio = async () => {
  audioContext = new AudioContext()

  const [wasm] = await Promise.all([
    fetch('/assets/worklets.wasm').then((res) => res.arrayBuffer()),
    audioContext!.audioWorklet.addModule('/assets/worklets.js'),
  ])

  await new Promise((resolve) => {
    const wasmInitializer = new AudioWorkletNode(
      audioContext!,
      'WASMInitializer'
    )
    wasmInitializer.port.onmessage = resolve
    wasmInitializer.port.postMessage(wasm)
  })
}

export const getAudioContext = () => {
  if (!audioContext) {
    throw new Error('AudioContext not initialized')
  }

  return audioContext
}

export const controlVoltageToFrequency = (voltage: number) => {
  return 13.75 * 2 ** voltage
}

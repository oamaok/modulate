import { workletNames, WorkletNode } from './worklets'
import state from './state'

let audioContext: AudioContext | null = null

export const initializeAudio = async () => {
  audioContext = new AudioContext()

  for (const worklet of workletNames) {
    const path = `/worklets/${worklet}.js`
    try {
      await audioContext!.audioWorklet.addModule(path)
      state.loadedWorklets++
    } catch (err) {
      throw new Error(`Failed to load audio worklet: ${path}`)
    }
  }
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

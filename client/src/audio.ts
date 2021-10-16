import { workletNames, WorkletNode } from './worklets'

let audioContext: AudioContext | null = null

export const initializeAudio = async () => {
  audioContext = new AudioContext()
  for (const worklet of workletNames) {
    const path = `/worklets/${worklet}.js`
    try {
      console.log(audioContext.audioWorklet)
      await audioContext.audioWorklet.addModule(path)
    } catch (err) {
      console.error(err)
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

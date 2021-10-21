import { useEffect } from 'kaiku'
import { getModuleKnobs } from './state'
import { getAudioContext } from './audio'

export const connectKnobToParam = (
  moduleId: string,
  knob: string,
  param: AudioParam
) => {
  useEffect(() => {
    const knobs = getModuleKnobs(moduleId)

    if (knobs) {
      param.setTargetAtTime(knobs[knob], getAudioContext().currentTime, 0.001)
    }
  })
}

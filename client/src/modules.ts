import { useEffect } from 'kaiku'
import { Id } from './types'
import { getModuleKnobs } from './state'
import { getAudioContext } from './audio'

export const connectKnobToParam = (
  moduleId: Id,
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

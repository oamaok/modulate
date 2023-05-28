import { useEffect } from 'kaiku'
import { getModuleKnobs } from './state'
import { getAudioContext } from './audio'
import assert from './assert'

export const connectKnobToParam = (
  moduleId: string,
  knob: string,
  param: AudioParam
) => {
  useEffect(() => {
    const knobs = getModuleKnobs(moduleId)

    if (knobs) {
      const knobValue = knobs[knob]
      assert(
        typeof knobValue !== 'undefined',
        'Tried to set value of an undefined knob'
      )
      param.setTargetAtTime(knobValue, getAudioContext().currentTime, 0.001)
    }
  })
}

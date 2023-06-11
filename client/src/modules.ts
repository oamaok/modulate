import { useEffect } from 'kaiku'
import { getModuleKnobs } from './state'
import * as engine from './engine'
import { Module } from '@modulate/worklets/src/modules'
import { IndexOf } from '@modulate/common/types'

export const connectKnobToParam = <
  M extends Module,
  N extends M['parameters'][number]
>(
  moduleId: string,
  knob: string,
  index: IndexOf<M['parameters'], N>
) => {
  useEffect(() => {
    const knobs = getModuleKnobs(moduleId)

    if (knobs) {
      const knobValue = knobs[knob]
      if (typeof knobValue !== 'undefined') {
        engine.setParameterValue(moduleId, index, knobValue)
      }
    }
  })
}

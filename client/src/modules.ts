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
  let lastUpdate = 0
  let timeout = -1 

  useEffect(() => {
    const knobs = getModuleKnobs(moduleId)

    if (knobs) {
      const knobValue = knobs[knob]
      if (typeof knobValue !== 'undefined') {
        // Debounce all parameter updates to only occurr at most every 30ms
        const now = Date.now()
        if (lastUpdate + 30 < now) {
          lastUpdate = now
          clearTimeout(timeout)
          engine.setParameterValue(moduleId, index, knobValue)
        } else {
          clearTimeout(timeout)
          timeout = setTimeout(() => {
            lastUpdate = Date.now()
            engine.setParameterValue(moduleId, index, knobValue)
          }, 100) as unknown as number
        }
      }
    }
  })
}

import { useEffect } from 'kaiku'
import { getKnobValue, setKnobValue } from '../../state'
import ControlledKnob, { KnobsProps } from './ControlledKnob'
import { Module } from '@modulate/worklets/src/modules'
import { IndexOf } from '@modulate/common/types'
import * as engine from '../../engine'

type Props<M extends Module, P extends M['parameters'][number]> = KnobsProps & {
  size?: 's' | 'm' | 'l'
  label?: string
  hideLabel?: boolean
  initial: number
  moduleId: string
  param: IndexOf<M['parameters'], P>
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

const getValue = <M extends Module, P extends M['parameters'][number]>(
  props: Props<M, P>
): number => {
  const knobValue = getKnobValue<M, P>(props.moduleId, props.param)

  switch (props.type) {
    case 'percentage': {
      return clamp(knobValue ?? props.initial, 0, 1)
    }

    case 'stepped':
    case 'exponential':
    case 'linear': {
      return clamp(knobValue ?? props.initial, props.min, props.max)
    }

    case 'option': {
      if (typeof props.options[0] === 'string') {
        return clamp(knobValue ?? props.initial ?? 0, 0, props.options.length)
      } else {
        return knobValue ?? props.initial ?? props.options[0]!.value
      }
    }
  }
}

const Knob = <M extends Module, P extends M['parameters'][number]>(
  props: Props<M, P>
) => {
  useEffect(() => {
    // `getValue` is called inside the effect to trigger it whenever the value changes
    engine.setParameterValue(props.moduleId, props.param, getValue(props))
  })

  const value = getValue(props)
  useEffect(() => {
    // `getValue` is used outside the effect to only trigger it once
    setKnobValue<M, P>(props.moduleId, props.param, value)
  })

  return (
    <ControlledKnob
      size={props.size ?? 's'}
      {...props}
      value={value}
      onChange={(value) =>
        setKnobValue<M, P>(props.moduleId, props.param, value)
      }
    />
  )
}

export default Knob

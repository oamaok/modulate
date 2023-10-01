import { useEffect } from 'kaiku'
import { getKnobValue, setKnobValue } from '../../state'
import ControlledKnob, { KnobsProps } from './ControlledKnob'

type Props = KnobsProps & {
  label?: string
  hideLabel?: boolean
  initial: number
  moduleId: string
  id: string
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

const getValue = (props: Props): number => {
  const knobValue = getKnobValue(props.moduleId, props.id)

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

const Knob = (props: Props) => {
  const value = getValue(props)

  useEffect(() => {
    setKnobValue(props.moduleId, props.id, value)
  })

  return (
    <ControlledKnob
      {...props}
      value={value}
      onChange={(value) => setKnobValue(props.moduleId, props.id, value)}
    />
  )
}

export default Knob

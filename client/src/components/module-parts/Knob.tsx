import { h, useState, useEffect } from 'kaiku'
import state, { getKnobValue, setKnobValue } from '../../state'
import { Vec2 } from '@modulate/common/types'
import css from './Knob.css'
import assert from '../../assert'

type PercentageKnob = {
  type: 'percentage'
  initial: number
}

type OptionKnob = {
  type: 'option'
  options: { label: string; value: number }[]
  initial?: number
}

type SteppedKnob = {
  type: 'stepped'
  initial: number
  min: number
  max: number
  step: number
  unit?: string
}

type ExponentialKnob = {
  type: 'exponential'
  exponent: number
  min: number
  max: number
  initial: number
  unit?: string
}

type LinearKnob = {
  type: 'linear'
  min: number
  max: number
  initial: number
  unit?: string
}

type CommonProps = {
  moduleId: string
  id: string
  label?: string
}

type Props = CommonProps &
  (PercentageKnob | OptionKnob | SteppedKnob | ExponentialKnob | LinearKnob)

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

const setNormalizedKnobValue = (value: number, props: Props) => {
  switch (props.type) {
    case 'percentage': {
      setKnobValue(props.moduleId, props.id, value)
      break
    }

    case 'stepped': {
      const steps = (props.max - props.min) / props.step
      setKnobValue(
        props.moduleId,
        props.id,
        Math.floor(value * steps) / props.step + props.min
      )
      break
    }

    case 'exponential': {
      setKnobValue(
        props.moduleId,
        props.id,
        Math.pow(value, props.exponent) * (props.max - props.min) + props.min
      )
      break
    }

    case 'linear': {
      setKnobValue(
        props.moduleId,
        props.id,
        value * (props.max - props.min) + props.min
      )
      break
    }

    case 'option': {
      if (typeof props.options[0] === 'string') {
        setKnobValue(
          props.moduleId,
          props.id,
          Math.round(value * props.options.length)
        )
      } else {
        const option = props.options[Math.round(value * props.options.length)]

        assert(option)

        setKnobValue(props.moduleId, props.id, option.value)
      }
      break
    }
  }
}

const normalizeValue = (value: number, props: Props): number => {
  switch (props.type) {
    case 'percentage': {
      return value
    }

    case 'stepped': {
      return (value - props.min) / props.step
    }

    case 'exponential': {
      return Math.pow(
        (value - props.min) / (props.max - props.min),
        1 / props.exponent
      )
    }

    case 'linear': {
      return (value - props.min) / (props.max - props.min)
    }

    case 'option': {
      if (typeof props.options[0] === 'string') {
        return value / props.options.length
      } else {
        return (
          props.options.findIndex((opt) => value == opt.value) /
          props.options.length
        )
      }
    }
  }
}

const getHintText = (props: Props): string => {
  const knobValue = getKnobValue(props.moduleId, props.id)!

  switch (props.type) {
    case 'percentage': {
      return `${props.label ?? props.id}: ${(knobValue * 100).toFixed(1)}%`
    }

    case 'stepped': {
      const steps = (props.max - props.min) / props.step
      return `${props.label ?? props.id}: ${knobValue}${props.unit ?? ''}`
    }

    case 'exponential':
    case 'linear': {
      return `${props.label ?? props.id}: ${knobValue.toFixed(3)}${
        props.unit ?? ''
      }`
    }

    case 'option': {
      return `${props.label ?? props.id}: ${
        props.options.find(({ value }) => knobValue == value)?.label
      }`
    }
  }
}

const Knob = (props: Props) => {
  const value = getValue(props)
  const position = normalizeValue(value, props)

  const knobState = useState<{
    dragPosition: null | Vec2
    displayHint: boolean
  }>({
    dragPosition: null,
    displayHint: false,
  })

  const onDragStart = () => {
    knobState.dragPosition = { x: state.cursor.x, y: state.cursor.y }
  }

  const onDragEnd = () => {
    knobState.dragPosition = null
    knobState.displayHint = false
  }

  useEffect(() => {
    // setKnobValue(props.moduleId, props.id, value)

    document.addEventListener('mouseup', onDragEnd)
    document.addEventListener('blur', onDragEnd)

    return () => {
      document.removeEventListener('mouseup', onDragEnd)
      document.removeEventListener('blur', onDragEnd)
    }
  })

  useEffect(() => {
    if (knobState.dragPosition) {
      let newPosition = normalizeValue(getValue(props), props)
      newPosition -= (state.cursor.y - knobState.dragPosition.y) / 300
      newPosition = Math.max(0, Math.min(1, newPosition))

      knobState.dragPosition.x = state.cursor.x
      knobState.dragPosition.y = state.cursor.y
      setNormalizedKnobValue(newPosition, props)
    }
  })

  useEffect(() => {
    if (knobState.displayHint) {
      state.hint = getHintText(props)
    } else {
      state.hint = null
    }
  })

  const displayHint = () => {
    knobState.displayHint = true
  }

  const hideHint = () => {
    if (!knobState.dragPosition) {
      knobState.displayHint = false
    }
  }

  return (
    <div className={css('wrapper')}>
      <div
        className={css('knob')}
        onMouseOver={displayHint}
        onMouseOut={hideHint}
        onMouseDown={onDragStart}
        style={{
          transform: `rotate(${position * 300 - 60}deg)`,
        }}
      ></div>
      <div className={css('name')}>{props.label || props.id}</div>
    </div>
  )
}

export default Knob

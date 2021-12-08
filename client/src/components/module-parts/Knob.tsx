import { h, useState, useEffect } from 'kaiku'
import state, { getKnobValue, setKnobValue } from '../../state'
import { Vec2 } from '../../../../common/types'

import classNames from 'classnames/bind'
import styles from './Knob.css'

const css = classNames.bind(styles)

type PercentageKnob = {
  type: 'percentage'
  initial: number
}

type OptionKnob = {
  type: 'option'
  options: string[] | { label: string; value: number }[]
  initial?: number
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
  (PercentageKnob | OptionKnob | ExponentialKnob | LinearKnob)

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

const getInitialValue = (props: Props): number => {
  const knobValue = getKnobValue(props.moduleId, props.id)

  switch (props.type) {
    case 'percentage': {
      return clamp(knobValue ?? props.initial, 0, 1)
    }

    case 'exponential':
    case 'linear': {
      return clamp(knobValue ?? props.initial, props.min, props.max)
    }

    case 'option': {
      if (typeof props.options[0] === 'string') {
        return clamp(knobValue ?? props.initial ?? 0, 0, props.options.length)
      } else {
        return knobValue ?? props.initial ?? props.options[0].value
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
        setKnobValue(
          props.moduleId,
          props.id,
          props.options[Math.round(value * props.options.length)].value
        )
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

    case 'exponential':
    case 'linear': {
      return `${props.label ?? props.id}: ${knobValue.toFixed(3)}${
        props.unit ?? ''
      }`
    }

    case 'option': {
      if (typeof props.options[0] === 'string') {
        return `${props.label ?? props.id}: ${props.options[knobValue]}`
      } else {
        return `${props.label ?? props.id}: ${
          props.options.find(({ value }) => knobValue == value).label
        }`
      }
    }
  }
}

const Knob = (props: Props) => {
  const initialValue = getInitialValue(props)

  const knobState = useState<{
    position: number
    dragPosition: null | Vec2
    displayHint: boolean
  }>({
    position: normalizeValue(initialValue, props),
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
    setKnobValue(props.moduleId, props.id, initialValue)

    document.addEventListener('mouseup', onDragEnd)
    document.addEventListener('blur', onDragEnd)

    return () => {
      document.removeEventListener('mouseup', onDragEnd)
      document.removeEventListener('blur', onDragEnd)
    }
  })

  useEffect(() => {
    if (knobState.dragPosition) {
      knobState.position -= (state.cursor.y - knobState.dragPosition.y) / 300
      knobState.position = Math.max(0, Math.min(1, knobState.position))

      knobState.dragPosition.x = state.cursor.x
      knobState.dragPosition.y = state.cursor.y
      setNormalizedKnobValue(knobState.position, props)
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
    <div>
      <div
        className={css('knob')}
        onMouseOver={displayHint}
        onMouseOut={hideHint}
        onMouseDown={onDragStart}
        style={{
          transform: `rotate(${knobState.position * 300 - 60}deg)`,
        }}
      ></div>
      <div className={css('name')}>{props.label || props.id}</div>
    </div>
  )
}

export default Knob

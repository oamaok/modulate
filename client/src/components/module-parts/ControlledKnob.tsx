import { useRef, useState } from 'kaiku'
import state, { displayHint, hideHint, setHintContent } from '../../state'
import * as styles from './Knob.css'
import assert from '../../assert'
import testAttributes from '../../test-attributes'
import useDrag from '../../hooks/useDrag'

type PercentageKnob = {
  type: 'percentage'
  initial: number
}

type OptionKnob = {
  type: 'option'
  options: { label: string; value: number }[]
  initial: number
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

export type KnobsProps =
  | PercentageKnob
  | OptionKnob
  | SteppedKnob
  | ExponentialKnob
  | LinearKnob

type CommonProps = {
  size: 's' | 'm' | 'l'
  label?: string
  hideLabel?: boolean
  value?: number
  onChange: (value: number) => void

  // Used for tests
  param?: number
  moduleId?: string
}

type ControlledKnobProps = CommonProps & KnobsProps

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

const getValue = (props: ControlledKnobProps): number => {
  switch (props.type) {
    case 'percentage': {
      return clamp(props.value ?? props.initial, 0, 1)
    }

    case 'stepped':
    case 'exponential':
    case 'linear': {
      return clamp(props.value ?? props.initial, props.min, props.max)
    }

    case 'option': {
      if (typeof props.options[0] === 'string') {
        return clamp(props.value ?? props.initial ?? 0, 0, props.options.length)
      } else {
        return props.value ?? props.initial ?? props.options[0]!.value
      }
    }
  }
}

const getNormalizedKnobValue = (
  value: number,
  props: ControlledKnobProps
): number => {
  switch (props.type) {
    case 'percentage': {
      return value
    }

    case 'stepped': {
      const steps = (props.max - props.min) / props.step
      return Math.floor(value * steps) / props.step + props.min
    }

    case 'exponential': {
      return (
        Math.pow(value, props.exponent) * (props.max - props.min) + props.min
      )
    }

    case 'linear': {
      return value * (props.max - props.min) + props.min
    }

    case 'option': {
      if (typeof props.options[0] === 'string') {
        return Math.round(value * props.options.length)
      } else {
        const maxIndex = props.options.length - 1
        const index = Math.min(
          Math.round(value * props.options.length),
          maxIndex
        )
        const option = props.options[index]

        assert(option)

        return option.value
      }
    }
  }
}

const normalizeValue = (value: number, props: ControlledKnobProps): number => {
  switch (props.type) {
    case 'percentage': {
      return value
    }

    case 'stepped': {
      const steps = (props.max - props.min) / props.step
      return (value - props.min) / steps
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

const getHintText = (props: ControlledKnobProps): string => {
  const knobValue = props.value!

  switch (props.type) {
    case 'percentage': {
      return `${props.label}: ${(knobValue * 100).toFixed(1)}%`
    }

    case 'stepped': {
      return `${props.label}: ${knobValue}${props.unit ?? ''}`
    }

    case 'exponential':
    case 'linear': {
      return `${props.label}: ${knobValue.toFixed(3)}${props.unit ?? ''}`
    }

    case 'option': {
      return `${props.label}: ${props.options.find(
        ({ value }) => knobValue == value
      )?.label}`
    }
  }
}

const getClassNameForSize = (size: 's' | 'm' | 'l') => {
  switch (size) {
    case 's':
      return styles.s
    case 'm':
      return styles.m
    case 'l':
      return styles.l
  }
}

const ControlledKnob = (props: ControlledKnobProps) => {
  const { hideLabel = false } = props

  const knobRef = useRef<HTMLDivElement>()

  const knobState = useState<{
    position: number
    isDragging: boolean
  }>({
    position: props.initial,
    isDragging: false,
  })

  if (!knobState.isDragging) {
    const externallyUpdatedPosition = normalizeValue(getValue(props), props)
    knobState.position = externallyUpdatedPosition
  }

  useDrag({
    ref: knobRef,
    onDragStart(pos) {
      knobState.isDragging = true
      displayHint(getHintText({ ...props, value: getValue(props) }), pos)
    },

    onDrag: ({ deltaY }) => {
      const multiplier = state.keyboard.modifiers.shift ? 1 / 3000 : 1 / 300
      knobState.position += deltaY * multiplier
      knobState.position = Math.max(0, Math.min(1, knobState.position))

      const newValue = getNormalizedKnobValue(knobState.position, props)
      props.onChange(newValue)
      setHintContent(getHintText({ ...props, value: newValue }))
    },

    onDragEnd: () => {
      knobState.isDragging = false
      hideHint()
    },
  })

  return (
    <div class={[styles.wrapper, getClassNameForSize(props.size)]}>
      <div
        class={styles.knob}
        ref={knobRef}
        style={{
          transform: `rotate(${knobState.position * 300 - 60}deg)`,
        }}
        {...testAttributes({
          id: 'knob',
          'knob-param': props.param,
          'module-id': props.moduleId,
          value: getValue(props).toFixed(4),
        })}
      ></div>
      {props.label && !hideLabel ? (
        <div class={styles.name}>{props.label}</div>
      ) : null}
    </div>
  )
}

export default ControlledKnob

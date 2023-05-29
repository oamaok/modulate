import { h, useState, useEffect } from 'kaiku'
import state, { getKnobValue, setKnobValue } from '../../state'
import { Id, Vec2 } from '@modulate/common/types'
import css from './Slider.css'

type Props = {
  moduleId: Id
  name: string
  min: number
  max: number
  initial: number
}

const Slider = ({ moduleId, name, min, max, initial }: Props) => {
  const knobValue = getKnobValue(moduleId, name)
  const initialValue = knobValue ?? initial

  const knobState = useState<{
    position: number
    dragPosition: null | Vec2
  }>({
    position: (initialValue - min) / (max - min),
    dragPosition: null,
  })

  const onDragStart = () => {
    knobState.dragPosition = { x: state.cursor.x, y: state.cursor.y }
  }

  const onDragEnd = () => {
    knobState.dragPosition = null
    state.hint = null
  }

  useEffect(() => {
    if (!knobState.dragPosition) {
      const knobValue = getKnobValue(moduleId, name) ?? initial
      const externallyUpdatedPosition = (knobValue - min) / (max - min)
      knobState.position = externallyUpdatedPosition
    }
  })

  useEffect(() => {
    setKnobValue(moduleId, name, initialValue)

    document.addEventListener('mouseup', onDragEnd)
    document.addEventListener('blur', onDragEnd)

    return () => {
      document.removeEventListener('mouseup', onDragEnd)
      document.removeEventListener('blur', onDragEnd)
    }
  })

  useEffect(() => {
    if (knobState.dragPosition) {
      knobState.position -= (knobState.dragPosition.x - state.cursor.x) / 100
      knobState.position = Math.max(0, Math.min(1, knobState.position))

      knobState.dragPosition.x = state.cursor.x
      knobState.dragPosition.y = state.cursor.y
      const value = knobState.position * (max - min) + min
      setKnobValue(moduleId, name, value)

      displayHint(value)
    }
  })

  const displayHint = (value: number) => {
    state.hint = `${name}: ${value.toFixed(2)}`
  }

  const hideHint = () => {
    if (!knobState.dragPosition) {
      state.hint = null
    }
  }

  return (
    <div
      className={css('slider-track')}
      onMouseOver={() => displayHint(knobValue!)}
      onMouseOut={hideHint}
    >
      <div
        className={css('slider')}
        onMouseDown={onDragStart}
        style={{ transform: `translateX(${knobState.position * 100}px)` }}
      ></div>
    </div>
  )
}

export default Slider

import { useState, useEffect } from 'kaiku'
import state, {
  displayHint,
  getKnobValue,
  hideHint,
  setKnobValue,
} from '../../state'
import { Id, IndexOf, Vec2 } from '@modulate/common/types'
import * as styles from './Slider.css'
import { Module } from '@modulate/worklets/src/modules'

type Props<M extends Module, P extends M['parameters'][number]> = {
  moduleId: Id
  param: IndexOf<M['parameters'], P>
  label?: string
  min: number
  max: number
  initial: number
}

const Slider = <M extends Module, P extends M['parameters'][number]>({
  moduleId,
  param,
  label,
  min,
  max,
  initial,
}: Props<M, P>) => {
  const knobValue = getKnobValue<M, P>(moduleId, param)
  const initialValue = knobValue ?? initial

  const knobState = useState<{
    position: number
    dragPosition: null | Vec2
  }>({
    position: (initialValue - min) / (max - min),
    dragPosition: null,
  })

  const getHintText = (value: number) => `${label}: ${value.toFixed(2)}`

  const onDragStart = () => {
    knobState.dragPosition = { x: state.cursor.x, y: state.cursor.y }
  }

  const onDragEnd = () => {
    knobState.dragPosition = null
    hideHint()
  }

  useEffect(() => {
    if (!knobState.dragPosition) {
      const knobValue = getKnobValue<M, P>(moduleId, param) ?? initial
      const externallyUpdatedPosition = (knobValue - min) / (max - min)
      knobState.position = externallyUpdatedPosition
    }
  })

  useEffect(() => {
    setKnobValue<M, P>(moduleId, param, initialValue)

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
      setKnobValue<M, P>(moduleId, param, value)

      displayHint(getHintText(value), state.cursor)
    }
  })

  return (
    <div
      className={styles.sliderTrack}
      onMouseMove={() => {
        displayHint(getHintText(knobValue!), state.cursor)
      }}
      onMouseOut={hideHint}
    >
      <div
        className={styles.slider}
        onMouseDown={onDragStart}
        style={{ transform: `translateX(${knobState.position * 100}px)` }}
      ></div>
    </div>
  )
}

export default Slider

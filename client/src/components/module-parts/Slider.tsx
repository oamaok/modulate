import { h, useState, useEffect } from 'kaiku'
import state, {
  displayHint,
  getKnobValue,
  hideHint,
  setKnobValue,
} from '../../state'
import { Id, Vec2 } from '@modulate/common/types'
import css from './Slider.css'

type Props = {
  moduleId: Id
  id: string
  label?: string
  min: number
  max: number
  initial: number
}

const Slider = ({ moduleId, id, label, min, max, initial }: Props) => {
  const knobValue = getKnobValue(moduleId, id)
  const initialValue = knobValue ?? initial

  const knobState = useState<{
    position: number
    dragPosition: null | Vec2
  }>({
    position: (initialValue - min) / (max - min),
    dragPosition: null,
  })

  const getHintText = (value: number) => `${label ?? id}: ${value.toFixed(2)}`

  const onDragStart = () => {
    knobState.dragPosition = { x: state.cursor.x, y: state.cursor.y }
  }

  const onDragEnd = () => {
    knobState.dragPosition = null
    hideHint()
  }

  useEffect(() => {
    if (!knobState.dragPosition) {
      const knobValue = getKnobValue(moduleId, id) ?? initial
      const externallyUpdatedPosition = (knobValue - min) / (max - min)
      knobState.position = externallyUpdatedPosition
    }
  })

  useEffect(() => {
    setKnobValue(moduleId, id, initialValue)

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
      setKnobValue(moduleId, id, value)

      displayHint(getHintText(value), state.cursor)
    }
  })

  return (
    <div
      className={css('slider-track')}
      onMouseMove={() => {
        displayHint(getHintText(knobValue!), state.cursor)
      }}
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

import { h, useState, useEffect } from 'kaiku'
import state, { getKnobValue, setKnobValue } from '../state'
import { Id, Vec2 } from '../../../common/types'

type Props = {
  moduleId: Id
  name: string
  min: number
  max: number
  initial: number
}

const Knob = ({ moduleId, name, min, max, initial }: Props) => {
  const presetValue = getKnobValue(moduleId, name)
  const initialValue =
    typeof presetValue === 'undefined' ? initial : presetValue

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
  }

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
      knobState.position -= (state.cursor.y - knobState.dragPosition.y) / 300
      knobState.position = Math.max(0, Math.min(1, knobState.position))

      knobState.dragPosition.x = state.cursor.x
      knobState.dragPosition.y = state.cursor.y

      setKnobValue(moduleId, name, knobState.position * (max - min) + min)
    }
  })

  return (
    <div
      className="knob"
      onMouseDown={onDragStart}
      style={{
        transform: `rotate(${knobState.position * 300 - 60}deg)`,
      }}
    >
      <div className="knob-position" />
    </div>
  )
}

export default Knob

import { h, useState, useEffect } from 'kaiku'
import state, { getKnobValue, setKnobValue } from '../../state'
import { Id, Vec2 } from '../../../../common/types'

import classNames from 'classnames/bind'
import styles from './Knob.css'

const css = classNames.bind(styles)

type Props = {
  moduleId: Id
  name: string
  min: number
  max: number
  initial: number
  label?: string
}

const Knob = ({ moduleId, label, name, min, max, initial }: Props) => {
  const knobValue = getKnobValue(moduleId, name)
  const initialValue = typeof knobValue === 'undefined' ? initial : knobValue

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
    <div className={css('wrapper')}>
      <div
        className={css('knob')}
        onMouseOver={() => displayHint(knobValue!)}
        onMouseOut={hideHint}
        onMouseDown={onDragStart}
        style={{
          transform: `rotate(${knobState.position * 300 - 60}deg)`,
        }}
      ></div>
      <div className={css('name')}>{label || name}</div>
    </div>
  )
}

export default Knob

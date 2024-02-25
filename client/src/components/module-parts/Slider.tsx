import { useState, useEffect, useRef } from 'kaiku'
import state, { getKnobValue, hideHint, setKnobValue } from '../../state'
import { Id, IndexOf } from '@modulate/common/types'
import { Module } from '@modulate/worklets/src/modules'
import * as engine from '../../engine'
import * as styles from './Slider.css'
import useDrag from '../../hooks/useDrag'

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
  const sliderRef = useRef<HTMLDivElement>()
  const sliderValue = getKnobValue<M, P>(moduleId, param) ?? initial

  useEffect(() => {
    // `getValue` is called inside the effect to trigger it whenever the value changes
    engine.setParameterValue(
      moduleId,
      param,
      getKnobValue<M, P>(moduleId, param) ?? initial
    )
  })

  useEffect(() => {
    setKnobValue<M, P>(moduleId, param, sliderValue)
  })

  const sliderState = useState<{
    position: number
    isDragging: boolean
  }>({
    position: (sliderValue - min) / (max - min),
    isDragging: false,
  })

  if (!sliderState.isDragging) {
    const sliderValue = getKnobValue<M, P>(moduleId, param) ?? initial
    const externallyUpdatedPosition = (sliderValue - min) / (max - min)
    sliderState.position = externallyUpdatedPosition
  }

  useDrag({
    ref: sliderRef,
    onDragStart() {
      sliderState.isDragging = true
    },

    onDrag: ({ deltaX }) => {
      const multiplier = state.keyboard.modifiers.shift ? 1 / 1000 : 1 / 100
      sliderState.position -= deltaX * multiplier
      sliderState.position = Math.max(0, Math.min(1, sliderState.position))

      const value = sliderState.position * (max - min) + min
      setKnobValue<M, P>(moduleId, param, value)
    },

    onDragEnd: () => {
      sliderState.isDragging = false
      hideHint()
    },
  })

  return (
    <div ref={sliderRef} class={styles.sliderTrack}>
      <div
        class={styles.slider}
        style={{ transform: `translateX(${sliderState.position * 100}px)` }}
      ></div>
    </div>
  )
}

export default Slider

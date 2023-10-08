import { useState, useEffect, useRef, unwrap } from 'kaiku'
import state, { viewport, patch } from '../../state'
import { Vec2 } from '@modulate/common/types'

import ActiveCable from './ActiveCable'
import Cable from './Cable'
import css from './Cables.css'
import testAttributes from '../../test-attributes'

const Cables = () => {
  const patchState = useState<{
    dragPosition: null | Vec2
  }>({
    dragPosition: null,
  })

  const ref = useRef<HTMLDivElement>()

  const onDragStart = (evt: MouseEvent) => {
    state.contextMenu.open = false
    if (ref.current && evt.target === unwrap(ref.current as any)) {
      patchState.dragPosition = { x: state.cursor.x, y: state.cursor.y }
    }
  }

  const onContextMenu = (evt: MouseEvent) => {
    evt.preventDefault()
    state.contextMenu.open = true
    state.contextMenu.position = {
      x: state.cursor.x,
      y: state.cursor.y,
    }
  }

  const onDragEnd = () => {
    patchState.dragPosition = null
  }

  useEffect(() => {
    document.addEventListener('mouseup', onDragEnd)
    document.addEventListener('blur', onDragEnd)

    return () => {
      document.removeEventListener('mouseup', onDragEnd)
      document.removeEventListener('blur', onDragEnd)
    }
  })

  useEffect(() => {
    if (patchState.dragPosition) {
      state.viewOffset.x += state.cursor.x - patchState.dragPosition.x
      state.viewOffset.y += state.cursor.y - patchState.dragPosition.y
      patchState.dragPosition.x = state.cursor.x
      patchState.dragPosition.y = state.cursor.y
    }
  })

  return (
    <div className={css('cables')}>
      <svg
        {...testAttributes({ id: 'cables' })}
        viewBox={`0 0 ${viewport.width} ${viewport.height}`}
        onMouseDown={onDragStart}
        onContextMenu={onContextMenu}
        ref={ref}
      >
        <g
          transform={() =>
            `translate(${state.viewOffset.x} ${state.viewOffset.y})`
          }
        >
          {patch.cables.map((cable) => (
            <Cable key={cable.id} cable={cable} />
          ))}
          <ActiveCable />
        </g>
      </svg>
    </div>
  )
}

export default Cables

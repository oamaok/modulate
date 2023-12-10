import state, { viewport, patch } from '../../state'

import ActiveCable from './ActiveCable'
import Cable from './Cable'
import * as styles from './Cables.css'
import testAttributes from '../../test-attributes'
import { useRef } from 'kaiku'
import useTouchEvents, { TapType } from '../../hooks/useTouchEvents'
import useMouseDrag from '../../hooks/useMouseDrag'

const Cables = () => {
  const svgRef = useRef<SVGElement>()

  const onContextMenu = (evt: MouseEvent) => {
    evt.preventDefault()
    state.activeModule = null
    state.contextMenu.open = true
    state.contextMenu.position = {
      x: state.cursor.x,
      y: state.cursor.y,
    }
  }

  useTouchEvents({
    ref: svgRef,
    onLongPress({ x, y }) {
      state.contextMenu.open = true
      state.activeModule = null
      state.cursor = { x, y }
      state.contextMenu.position = {
        x,
        y,
      }
    },
    onDragStart() {
      state.contextMenu.open = false
      state.activeModule = null
    },
    onDrag({ deltaX, deltaY }) {
      state.viewOffset.x -= deltaX
      state.viewOffset.y -= deltaY
    },
  })

  useMouseDrag({
    ref: svgRef,
    onDragStart() {
      state.contextMenu.open = false
      state.activeModule = null
    },
    onDrag({ deltaX, deltaY }) {
      state.viewOffset.x -= deltaX
      state.viewOffset.y -= deltaY
    },
  })

  return (
    <div className={styles.cables}>
      <svg
        {...testAttributes({ id: 'cables' })}
        viewBox={`0 0 ${viewport.width} ${viewport.height}`}
        onContextMenu={onContextMenu}
        ref={svgRef}
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

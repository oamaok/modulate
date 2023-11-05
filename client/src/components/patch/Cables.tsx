import state, { viewport, patch } from '../../state'

import ActiveCable from './ActiveCable'
import Cable from './Cable'
import css from './Cables.css'
import testAttributes from '../../test-attributes'
import { useDrag } from '../../hooks'

const Cables = () => {
  const onContextMenu = (evt: MouseEvent) => {
    evt.preventDefault()
    state.contextMenu.open = true
    state.contextMenu.position = {
      x: state.cursor.x,
      y: state.cursor.y,
    }
  }

  const dragTargetRef = useDrag({
    onStart() {
      state.contextMenu.open = false
    },
    onMove({ dx, dy }) {
      state.viewOffset.x -= dx
      state.viewOffset.y -= dy
    },
  })

  return (
    <div className={css('cables')}>
      <svg
        {...testAttributes({ id: 'cables' })}
        viewBox={`0 0 ${viewport.width} ${viewport.height}`}
        onContextMenu={onContextMenu}
        onDblClick={onContextMenu}
        ref={dragTargetRef}
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

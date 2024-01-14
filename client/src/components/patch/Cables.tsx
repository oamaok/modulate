import state, {
  viewport,
  patch,
  openContextMenu,
  addModule,
  closeContextMenu,
} from '../../state'

import ActiveCable from './ActiveCable'
import Cable from './Cable'
import * as styles from './Cables.css'
import testAttributes from '../../test-attributes'
import { useRef } from 'kaiku'
import useTouchEvents from '../../hooks/useTouchEvents'
import moduleConfig, { Config, categoryLabel } from '../../module-config'
import useMouseDrag from '../../hooks/useMouseDrag'
import { ContextMenuOptions } from '../../types'
import { ModuleName } from '@modulate/worklets/src/modules'
import { groupBy } from '@modulate/common/util'

const MODULE_CATEGORIES = groupBy(
  Object.entries(moduleConfig) as [ModuleName, Config[ModuleName]][],
  ([, config]) => config.category
)

const MODULE_CONTEXT_MENU_OPTIONS: ContextMenuOptions = {
  title: 'Add a module',
  width: 240,
  items: MODULE_CATEGORIES.map(([category, modules]) => ({
    type: 'button-group',
    name: categoryLabel[category],
    items: modules.map(([moduleName]) => ({
      type: 'item',
      name: moduleName,
      action: (pos) => {
        state.activeModule = addModule(moduleName, {
          x: pos.x - state.viewOffset.x,
          y: pos.y - state.viewOffset.y,
        })
      },
    })),
  })),
}

const Cables = () => {
  const svgRef = useRef<SVGElement>()

  const onContextMenu = (evt: MouseEvent) => {
    evt.preventDefault()
    openContextMenu(state.cursor, MODULE_CONTEXT_MENU_OPTIONS)
  }

  useTouchEvents({
    ref: svgRef,
    onLongPress({ x, y }) {
      state.activeModule = null
      state.cursor = { x, y }
      openContextMenu(state.cursor, MODULE_CONTEXT_MENU_OPTIONS)
    },
    onDragStart() {
      closeContextMenu()
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
      closeContextMenu()
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

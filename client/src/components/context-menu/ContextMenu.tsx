import { useEffect, useRef } from 'kaiku'
import css from './ContextMenu.css'
import state, { addModule } from '../../state'
import moduleConfig, { Config, categoryLabel } from '../../module-config'
import testAttributes from '../../test-attributes'
import { groupBy } from '@modulate/common/util'
import { ModuleName } from '@modulate/worklets/src/modules'

type Props = {}

const CONTEXT_MENU_DISABLE_DISTANCE = 50 // px

const ContextMenu = ({}: Props) => {
  const menuRef = useRef<HTMLDivElement>()

  const onModuleClick = (moduleName: ModuleName) => {
    addModule(moduleName, {
      x: state.contextMenu.position.x - state.viewOffset.x,
      y: state.contextMenu.position.y - state.viewOffset.y,
    })

    state.contextMenu.open = false
  }

  useEffect(() => {
    const menuElement = menuRef.current
    if (state.contextMenu.open && menuElement) {
      const { height, width } = menuElement.getBoundingClientRect()
      const isCursorTooFarHorizontally =
        state.cursor.x <
          state.contextMenu.position.x - CONTEXT_MENU_DISABLE_DISTANCE ||
        state.cursor.x >
          state.contextMenu.position.x + width + CONTEXT_MENU_DISABLE_DISTANCE
      const isCursorTooFarVertically =
        state.cursor.y <
          state.contextMenu.position.y - CONTEXT_MENU_DISABLE_DISTANCE ||
        state.cursor.y >
          state.contextMenu.position.y + height + CONTEXT_MENU_DISABLE_DISTANCE

      if (isCursorTooFarHorizontally || isCursorTooFarVertically) {
        state.contextMenu.open = false
      }
    }
  })

  const getContextMenuTransform = () => {
    const rect = menuRef.current?.getBoundingClientRect()
    const width = rect?.width ?? 0
    const height = rect?.height ?? 0

    const x = Math.min(state.contextMenu.position.x, window.innerWidth - width)
    const y = Math.min(
      state.contextMenu.position.y,
      window.innerHeight - height
    )

    return `translate(${x}px, ${y}px)`
  }

  const moduleCategories = groupBy(
    Object.entries(moduleConfig) as [ModuleName, Config[ModuleName]][],
    ([, config]) => config.category
  )

  return (
    <div
      ref={menuRef}
      {...testAttributes({ id: 'context-menu' })}
      className={() => css('context-menu', { open: state.contextMenu.open })}
      style={{
        transform: getContextMenuTransform,
      }}
    >
      <div className={css('group')}>Add a module</div>
      <div className={css('items')}>
        {moduleCategories.map(([category, modules]) => (
          <div className={css('category')}>
            <div className={css('label')}>{categoryLabel[category]}</div>
            {modules.map(([moduleName]) => (
              <button
                {...testAttributes({
                  id: 'add-module',
                  'module-name': moduleName,
                })}
                className={css('item')}
                onClick={() => onModuleClick(moduleName)}
              >
                {moduleName}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export default ContextMenu

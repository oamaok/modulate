import { h, Fragment, useState, useEffect, useRef } from 'kaiku'
import css from './ContextMenu.css'
import state, { addModule } from '../../state'
import * as moduleMap from '../../moduleMap'

type Props = {}

const CONTEXT_MENU_DISABLE_DISTANCE = 50 // px

const ContextMenu = ({}: Props) => {
  const menuRef = useRef<HTMLDivElement>()
  const modules = Object.keys(moduleMap).sort()

  const onModuleClick = (moduleName: string) => {
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

  return (
    <div
      ref={menuRef}
      className={() => css('context-menu', { open: state.contextMenu.open })}
      style={{
        transform: getContextMenuTransform,
      }}
    >
      <div className={css('group')}>Add a module</div>
      <div className={css('items')}>
        {modules.map((moduleName) => (
          <button
            className={css('item')}
            onClick={() => onModuleClick(moduleName)}
          >
            {moduleName}
          </button>
        ))}
      </div>
    </div>
  )
}

export default ContextMenu

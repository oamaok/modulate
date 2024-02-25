import { useEffect, useRef } from 'kaiku'
import * as styles from './ContextMenu.css'
import state from '../../state'
import testAttributes from '../../test-attributes'

type Props = {}

const CONTEXT_MENU_DISABLE_DISTANCE = 50 // px

const ContextMenu = ({}: Props) => {
  const menuRef = useRef<HTMLDivElement>()

  const getMenuRect = () => {
    const rect = menuRef.current?.getBoundingClientRect()
    const width = rect?.width ?? 0
    const height = rect?.height ?? 0

    const x = Math.min(state.contextMenu.position.x, window.innerWidth - width)
    const y = Math.min(
      state.contextMenu.position.y,
      window.innerHeight - height
    )

    return { x, y, width, height }
  }

  useEffect(() => {
    const menuElement = menuRef.current
    if (state.contextMenu.open && menuElement) {
      const { x, y, height, width } = getMenuRect()

      const isCursorTooFarHorizontally =
        state.cursor.x < x - CONTEXT_MENU_DISABLE_DISTANCE ||
        state.cursor.x > x + width + CONTEXT_MENU_DISABLE_DISTANCE
      const isCursorTooFarVertically =
        state.cursor.y < y - CONTEXT_MENU_DISABLE_DISTANCE ||
        state.cursor.y > y + height + CONTEXT_MENU_DISABLE_DISTANCE

      if (isCursorTooFarHorizontally || isCursorTooFarVertically) {
        state.contextMenu.open = false
      }
    }
  })

  const getContextMenuTransform = () => {
    const { x, y } = getMenuRect()

    return `translate(${x}px, ${y}px)`
  }

  return (
    <div
      ref={menuRef}
      {...testAttributes({ id: 'context-menu' })}
      class={() => [
        styles.contextMenu,
        { [styles.open]: state.contextMenu.open },
      ]}
      style={{
        transform: getContextMenuTransform,
        width: state.contextMenu.options?.width + 'px',
      }}
    >
      <div class={styles.title}>{state.contextMenu.options?.title}</div>
      <div class={styles.items}>
        {state.contextMenu.options?.items.map((item) => {
          switch (item.type) {
            case 'button-group': {
              return (
                <div class={styles.buttonGroup}>
                  <div class={styles.label}>{item.name}</div>
                  {item.items.map((subItem) => (
                    <button
                      {...testAttributes({
                        id: 'context-menu-item',
                        'context-menu-item-name': subItem.name,
                      })}
                      class={styles.item}
                      onClick={() => {
                        state.contextMenu.open = false
                        subItem.action(state.contextMenu.position)
                      }}
                    >
                      {subItem.name}
                    </button>
                  ))}
                </div>
              )
            }

            case 'group': {
              return (
                <div class={styles.group}>
                  <div class={styles.label}>{item.name}</div>
                  {item.items.map((subItem) => (
                    <button
                      {...testAttributes({
                        id: 'context-menu-item',
                        'context-menu-item-name': subItem.name,
                      })}
                      class={styles.item}
                      onClick={() => {
                        state.contextMenu.open = false
                        subItem.action(state.contextMenu.position)
                      }}
                    >
                      {subItem.name}
                    </button>
                  ))}
                </div>
              )
            }

            case 'item': {
              return (
                <button
                  {...testAttributes({
                    id: 'context-menu-item',
                    'context-menu-item-name': item.name,
                  })}
                  class={styles.item}
                  onClick={() => {
                    state.contextMenu.open = false
                    item.action(state.contextMenu.position)
                  }}
                >
                  {item.name}
                </button>
              )
            }
          }
        })}
      </div>
    </div>
  )
}

export default ContextMenu

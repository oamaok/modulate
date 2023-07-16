import { h, useState, useEffect, FC } from 'kaiku'
import state, { getModulePosition } from '../../state'
import { Id, Vec2 } from '@modulate/common/types'
import css from './Module.css'
import assert from '../../assert'

type Props = {
  id: Id
  name: string
  height?: number
  width?: number
}

const Module: FC<Props> = ({
  id,
  name,
  children,
  height = 100,
  width = 200,
}) => {
  const moduleState = useState<{
    dragPosition: null | Vec2
  }>({
    dragPosition: null,
  })

  const onDragStart = () => {
    moduleState.dragPosition = { x: state.cursor.x, y: state.cursor.y }
  }

  const onDragEnd = () => {
    moduleState.dragPosition = null
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
    if (moduleState.dragPosition) {
      const module = state.patch.modules[id]
      assert(module)

      const modulePosition = module.position
      modulePosition.x += state.cursor.x - moduleState.dragPosition.x
      modulePosition.y += state.cursor.y - moduleState.dragPosition.y
      moduleState.dragPosition.x = state.cursor.x
      moduleState.dragPosition.y = state.cursor.y
    }
  })

  const modulePosition = getModulePosition(id)

  return (
    <div
      data-id="module"
      onMouseDown={() => (state.activeModule = id)}
      className={() =>
        css('module', {
          active: state.activeModule === id,
        })
      }
      style={{
        zIndex: () => (state.activeModule === id ? 10 : 1),
        width: width + 'px',
        height: height + 'px',
        transform: () =>
          `translate(${Math.round(modulePosition.x)}px, ${Math.round(
            modulePosition.y
          )}px)`,
      }}
    >
      <div className={css('module-name')} onMouseDown={onDragStart}>
        {name}
      </div>
      <div className={css('module-body')}>{children}</div>
    </div>
  )
}

export default Module

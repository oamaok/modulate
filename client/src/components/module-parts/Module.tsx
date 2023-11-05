import { FC } from 'kaiku'
import state, { getModulePosition } from '../../state'
import { Id } from '@modulate/common/types'
import css from './Module.css'
import testAttributes from '../../test-attributes'
import { ModuleName } from '@modulate/worklets/src/modules'
import { useDrag } from '../../hooks'
import moduleConfig from '../../module-config'

type Props = {
  id: Id
  type: ModuleName
  name?: string
  height?: number
  width?: number
}

const Module: FC<Props> = ({
  id,
  type,
  name,
  children,
  height = 100,
  width = 200,
}) => {
  const dragTargetRef = useDrag({
    relativeToViewOffset: true,
    onMove({ dx, dy }) {
      modulePosition.x -= dx
      modulePosition.y -= dy
    },
  })

  const modulePosition = getModulePosition(id)

  return (
    <div
      {...testAttributes({
        id: 'module',
        type,
        'module-id': id,
      })}
      data-id="module"
      onMouseDown={() => (state.activeModule = id)}
      onTouchStart={() => (state.activeModule = id)}
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
      <div
        className={css('module-name')}
        style={{
          background: moduleConfig[type].colors.primary,
        }}
        ref={dragTargetRef}
        {...testAttributes({ id: 'module-header' })}
      >
        {name ?? type}
      </div>
      <div className={css('module-body')}>{children}</div>
    </div>
  )
}

export default Module

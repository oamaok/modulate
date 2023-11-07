import { FC, useRef } from 'kaiku'
import state, { getModulePosition } from '../../state'
import { Id } from '@modulate/common/types'
import * as styles from './Module.css'
import testAttributes from '../../test-attributes'
import { ModuleName } from '@modulate/worklets/src/modules'
import { useDrag } from '../../hooks'
import moduleConfig from '../../module-config'

type Props = {
  id: Id
  type: ModuleName
  name?: string
}

const Module: FC<Props> = ({ id, type, name, children }) => {
  const headerRef = useRef<HTMLDivElement>()
  useDrag({
    ref: headerRef,
    relativeToViewOffset: true,
    onMove({ dx, dy }) {
      modulePosition.x -= dx
      modulePosition.y -= dy
    },
  })

  const modulePosition = getModulePosition(id)
  const config = moduleConfig[type]

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
      className={() => [
        styles.module,
        {
          active: state.activeModule === id,
        },
      ]}
      style={{
        zIndex: () => (state.activeModule === id ? 10 : 1),
        width: config.width + 'px',
        height: config.height + 'px',
        transform: () =>
          `translate(${Math.round(modulePosition.x)}px, ${Math.round(
            modulePosition.y
          )}px)`,
      }}
    >
      <div
        className={styles.moduleName}
        style={{
          background: config.colors.primary,
        }}
        ref={headerRef}
        {...testAttributes({ id: 'module-header' })}
      >
        {name ?? type}
      </div>
      <div className={styles.moduleBody}>{children}</div>
    </div>
  )
}

export default Module

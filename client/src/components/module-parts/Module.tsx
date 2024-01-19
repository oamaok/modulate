import { FC, useRef } from 'kaiku'
import state, {
  cloneModule,
  deleteModule,
  getModulePosition,
  openContextMenu,
  resetModuleKnobs,
} from '../../state'
import { Id } from '@modulate/common/types'
import * as styles from './Module.css'
import testAttributes from '../../test-attributes'
import { ModuleName } from '@modulate/worklets/src/modules'
import moduleConfig from '../../module-config'
import useDrag from '../../hooks/useDrag'
import useTouchEvents from '../../hooks/useTouchEvents'

type Props = {
  id: Id
  type: ModuleName
  name?: string
}

const Module: FC<Props> = ({ id, type, name, children }) => {
  const headerRef = useRef<HTMLDivElement>()

  const openModuleContextMenu = () => {
    openContextMenu(state.cursor, {
      title: `Module - ${name ?? type}`,
      width: 180,
      items: [
        {
          type: 'item',
          name: 'Reset knobs',
          action: () => resetModuleKnobs(id),
        },
        {
          type: 'item',
          name: 'Clone',
          action: () => cloneModule(id),
        },
        {
          type: 'item',
          name: 'Delete',
          action: () => deleteModule(id),
        },
      ],
    })
  }

  useDrag({
    ref: headerRef,
    relativeToViewOffset: true,
    onDrag({ deltaX, deltaY }) {
      const modulePosition = getModulePosition(id)

      modulePosition.x -= deltaX
      modulePosition.y -= deltaY
    },
  })

  useTouchEvents({
    ref: headerRef,
    onLongPress: openModuleContextMenu,
  })

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
          [styles.active]: state.activeModule === id,
        },
      ]}
      style={{
        zIndex: () => (state.activeModule === id ? 10 : 1),
        width: config.width + 'px',
        height: config.height + 'px',
        transform: () => {
          const modulePosition = getModulePosition(id)
          return `translate(${Math.round(modulePosition.x)}px, ${Math.round(
            modulePosition.y
          )}px)`
        },
      }}
    >
      <div
        className={styles.moduleName}
        style={{
          background: config.colors.primary,
        }}
        onContextMenu={openModuleContextMenu}
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

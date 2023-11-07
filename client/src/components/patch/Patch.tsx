import state from '../../state'
import * as moduleMap from '../../module-map'
import Cables from './Cables'

import * as styles from './Patch.css'
import assert from '../../assert'
import RoomCursors from '../room-cursors/RoomCursors'

const Patch = () => {
  return (
    <div className={styles.patch}>
      <Cables />
      <div
        style={{
          transform: () =>
            `translate(${state.viewOffset.x}px, ${state.viewOffset.y}px)`,
        }}
      >
        {Object.keys(state.patch.modules).map((id: string) => {
          const module = state.patch.modules[id]
          assert(module, `Patch: invalid module id (${id})`)
          const Component: any =
            moduleMap[module.name as keyof typeof moduleMap]
          return <Component key={id} id={id} />
        })}
        {state.room ? <RoomCursors /> : null}
      </div>
    </div>
  )
}

export default Patch

import state from '../../state'
import * as styles from './RoomCursors.css'
import assert from '../../assert'

const RoomCursors = () => {
  const room = state.room
  assert(room)
  return (
    <div class={styles.roomCursors}>
      {Object.values(room.users).map(({ cursor }) => (
        <div
          class={styles.cursor}
          style={{
            transform: () =>
              `translate(${cursor.x - 20}px, ${cursor.y - 20}px)`,
          }}
        >
          <svg width="64" height="64" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M 0 0 L 0 64 L 17.785047452934773 48.86401628086724 L 41.13840701993851 49.02684435961459"
              fill="white"
              stroke="gray"
              stroke-width="5"
            ></path>
          </svg>
        </div>
      ))}
    </div>
  )
}

export default RoomCursors

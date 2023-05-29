import { h } from 'kaiku'
import state from '../../state'
import css from './RoomCursors.css'
import assert from '../../assert'

const RoomCursors = () => {
  const room = state.room
  assert(room)
  return (
    <div className={css('room-cursors')}>
      {Object.values(room.users).map(({ cursor }) => (
        <div
          className={css('cursor')}
          style={{
            transform: () =>
              `translate(${state.viewOffset.x + cursor.x}px, ${
                state.viewOffset.y + cursor.y
              }px)`,
          }}
        ></div>
      ))}
    </div>
  )
}

export default RoomCursors

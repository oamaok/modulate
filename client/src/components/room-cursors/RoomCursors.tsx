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

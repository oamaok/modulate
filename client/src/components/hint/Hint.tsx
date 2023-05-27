import { h } from 'kaiku'
import state, { cursor } from '../../state'
import css from './Hint.css'

const Hint = () => {
  if (!state.hint) return null

  return (
    <div
      className={css('hint')}
      style={{
        transform: () => `translate(${cursor.x}px, ${cursor.y}px)`,
      }}
    >
      {state.hint}
    </div>
  )
}

export default Hint

import { h } from 'kaiku'
import state from '../../state'
import css from './Hint.css'

const Hint = () => {
  return (
    <div
      className={css('hint', { visible: state.hint.visible })}
      style={{
        transform: () =>
          `translate(${state.hint.position.x}px, ${state.hint.position.y}px)`,
      }}
    >
      {state.hint.content}
    </div>
  )
}

export default Hint

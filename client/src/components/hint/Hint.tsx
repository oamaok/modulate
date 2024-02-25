import state from '../../state'
import * as styles from './Hint.css'

const Hint = () => {
  return (
    <div
      class={[
        styles.hint,
        {
          [styles.visible]: state.hint.visible,
        },
      ]}
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

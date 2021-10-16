import { h } from 'kaiku'
import classNames from 'classnames/bind'
import state, { cursor } from '../../state'
import styles from './Hint.css'

const css = classNames.bind(styles)

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

import state from '../../state'
import * as styles from './Background.css'

const BACKGROUND_SIZE = 412

const Background = () => {
  const width =
    Math.ceil(state.viewport.width / BACKGROUND_SIZE + 1) * BACKGROUND_SIZE
  const height =
    Math.ceil(state.viewport.height / BACKGROUND_SIZE + 1) * BACKGROUND_SIZE

  return (
    <div
      className={styles.background}
      style={{
        width: width + 'px',
        height: height + 'px',
        transform: () => {
          let x = Math.round(state.viewOffset.x / 1.5) % BACKGROUND_SIZE
          if (x > 0) {
            x -= BACKGROUND_SIZE
          }

          let y = Math.round(state.viewOffset.y / 1.5) % BACKGROUND_SIZE
          if (y > 0) {
            y -= BACKGROUND_SIZE
          }
          return `translate(${x}px, ${y}px)`
        },
      }}
    ></div>
  )
}

export default Background

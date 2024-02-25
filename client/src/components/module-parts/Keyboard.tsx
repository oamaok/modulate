import * as styles from './Keyboard.css'

const WHITE_KEYS = ['C', 'D', 'E', 'F', 'G', 'A', 'B']
const BLACK_KEYS = ['C#', 'D#', null, 'F#', 'G#', 'A#']

type Props = {
  note: string
  onChange: (note: string) => void
}

const Keyboard = (props: Props) => {
  return (
    <div class={styles.keyboard}>
      {WHITE_KEYS.map((key, i) => (
        <button
          onClick={() => props.onChange(key)}
          class={() => [styles.whiteKey, { [styles.on]: key === props.note }]}
          style={{ left: i * 22 + 'px' }}
        ></button>
      ))}
      {BLACK_KEYS.map(
        (key, i) =>
          key && (
            <button
              onClick={() => props.onChange(key)}
              class={() => [
                styles.blackKey,
                { [styles.on]: key === props.note },
              ]}
              style={{ left: i * 22 + 10 + 'px' }}
            ></button>
          )
      )}
    </div>
  )
}

export default Keyboard

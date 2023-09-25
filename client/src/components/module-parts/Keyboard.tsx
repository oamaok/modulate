import css from './Keyboard.css'

const WHITE_KEYS = ['C', 'D', 'E', 'F', 'G', 'A', 'B']
const BLACK_KEYS = ['C#', 'D#', null, 'F#', 'G#', 'A#']

type Props = {
  note: string
  onChange: (note: string) => void
}

const Keyboard = ({ note, onChange }: Props) => {
  return (
    <div className={css('keyboard')}>
      {WHITE_KEYS.map((key, i) => (
        <button
          onClick={() => onChange(key)}
          className={css('white-key', { on: key === note })}
          style={{ left: i * 22 + 'px' }}
        ></button>
      ))}
      {BLACK_KEYS.map(
        (key, i) =>
          key && (
            <button
              onClick={() => onChange(key)}
              className={css('black-key', { on: key === note })}
              style={{ left: i * 22 + 10 + 'px' }}
            ></button>
          )
      )}
    </div>
  )
}

export default Keyboard

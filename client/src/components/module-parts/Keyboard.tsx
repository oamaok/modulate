import { h, Fragment } from 'kaiku'
import classNames from 'classnames/bind'
import styles from './Keyboard.css'

const css = classNames.bind(styles)

const WHITE_KEYS = ['C', 'D', 'E', 'F', 'G', 'A', 'B']
const BLACK_KEYS = ['C#', 'D#', null, 'F#', 'G#', 'A#']

type Props = {
  note: string
  onChange: (note: string) => void
}

const Keyboard = ({ note, onChange }: Props) => {
  return (
    <div className={css('keyboard')}>
      <svg viewbox="0 0 152 60">
        <defs>
          <g id="white-key">
            <rect fill="white" x="0" y="0" width="20" height="60" />
            <circle cx="10" cy="50" r="4" fill="#c7c7c7" />
          </g>
          <g id="white-key-active">
            <rect fill="white" x="0" y="0" width="20" height="60" />
            <circle cx="10" cy="50" r="4" fill="#e85d00" />
          </g>
          <g id="black-key">
            <path fill="#333333" d="M 0 0 H 20 V 35 l -10 3 l -10 -3 Z" />
            <circle cx="10" cy="25" r="4" fill="#c7c7c7" />
          </g>
          <g id="black-key-active">
            <path fill="#333333" d="M 0 0 H 20 V 35 l -10 3 l -10 -3 Z" />
            <circle cx="10" cy="25" r="4" fill="#e85d00" />
          </g>
        </defs>

        {WHITE_KEYS.map((key, index) => (
          <use
            href={key === note ? '#white-key-active' : '#white-key'}
            x={index * 22}
            onClick={() => onChange(key)}
          />
        ))}
        {BLACK_KEYS.map(
          (key, index) =>
            key && (
              <use
                href={key === note ? '#black-key-active' : '#black-key'}
                x={10 + index * 22}
                onClick={() => onChange(key)}
              />
            )
        )}
      </svg>
    </div>
  )
}

export default Keyboard

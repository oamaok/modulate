import { h } from 'kaiku'
import classNames from 'classnames/bind'
import styles from './Toggle.css'

const css = classNames.bind(styles)

type Props = {
  label?: string
  active: boolean
  onChange: () => void
}

const Toggle = ({ label, active, onChange }: Props) => {
  return (
    <div className={css('wrapper')}>
      {label}
      <button
        className={css('toggle', {
          active,
        })}
        onClick={onChange}
      />
    </div>
  )
}

export default Toggle

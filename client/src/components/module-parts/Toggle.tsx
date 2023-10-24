import css from './Toggle.css'

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

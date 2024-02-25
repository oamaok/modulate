import * as styles from './Toggle.css'

type Props = {
  label?: string
  active: boolean
  onChange: () => void
}

const Toggle = ({ label, active, onChange }: Props) => {
  return (
    <div class={styles.wrapper}>
      {label}
      <button
        class={[
          styles.toggle,
          {
            [styles.active]: active,
          },
        ]}
        onClick={onChange}
      />
    </div>
  )
}

export default Toggle

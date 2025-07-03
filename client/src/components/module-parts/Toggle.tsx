import * as styles from './Toggle.css'

type Props = {
  label?: string
  active: boolean
  onChange: () => void
}

const Toggle = ({ label, active, onChange }: Props) => {
  return (
    <button class={styles.wrapper} onClick={onChange}>
      {label}
      <div
        class={[
          styles.toggle,
          {
            [styles.active]: active,
          },
        ]}
      />
    </button>
  )
}

export default Toggle

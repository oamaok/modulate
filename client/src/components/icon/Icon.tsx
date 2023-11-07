import * as styles from './Icon.css'

type Props = {
  name: string
  size?: number
}

const Icon = ({ name, size }: Props) => {
  return (
    <span
      className={styles.icon}
      {...(size ? { style: { fontSize: size } } : undefined)}
    >
      {name}
    </span>
  )
}

export default Icon

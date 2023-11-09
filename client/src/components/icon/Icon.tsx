import * as styles from './Icon.css'
import * as icons from '../../icons'

type Props = {
  name: (typeof icons)[keyof typeof icons]
  size?: number
  color?: string
}

const Icon = ({ name, size = 24, color = '#ffffff' }: Props) => {
  return (
    <svg class={styles.icon} width={size} height={size}>
      <use fill={color} width="100%" height="100%" href={name} />
    </svg>
  )
}

export default Icon

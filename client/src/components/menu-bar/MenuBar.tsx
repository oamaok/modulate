import { FC } from 'kaiku'
import * as styles from './MenuBar.css'

type Props = {
  left?: true
  right?: true
  bottom?: true
  top?: true
  className?: string
}

const MenuBar: FC<Props> = ({
  children,
  className = '',
  left,
  right,
  bottom,
  top,
}) => {
  return (
    <div
      className={[styles.menuBar, className]}
      style={{
        left: left && '10px',
        right: right && '10px',
        bottom: bottom && '10px',
        top: top && '10px',
      }}
    >
      {children}
    </div>
  )
}

export const VerticalDivider = () => <div className={styles.verticalDivider} />

export default MenuBar

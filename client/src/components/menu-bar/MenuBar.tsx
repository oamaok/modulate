import { FC, h } from 'kaiku'
import css from './MenuBar.css'

type Props = {
  left?: true
  right?: true
  bottom?: true
  top?: true
}

const MenuBar: FC<Props> = ({ children, left, right, bottom, top }) => {
  return (
    <div
      className={css('menu-bar')}
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

export const VerticalDivider = () => <div className={css('vertical-divider')} />

export default MenuBar

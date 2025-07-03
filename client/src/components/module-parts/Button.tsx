import { FC } from 'kaiku'
import * as styles from './Button.css'

const Button: FC<Record<any, any>> = ({
  children,
  class: className,
  ...rest
}) => {
  return (
    <button class={[styles.button, className]} {...rest}>
      {children}
    </button>
  )
}

export default Button

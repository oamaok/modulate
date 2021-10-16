import { FC, h } from 'kaiku'
import classNames from 'classnames/bind'
import styles from './ModuleSockets.css'

const css = classNames.bind(styles)

export const ModuleOutputs: FC<{}> = ({ children }) => {
  return <div className={css('module-outputs')}>{children}</div>
}

export const ModuleInputs: FC<{}> = ({ children }) => {
  return <div className={css('module-inputs')}>{children}</div>
}

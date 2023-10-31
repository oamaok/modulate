import { FC } from 'kaiku'
import css from './ModuleSockets.css'

export const ModuleOutputs: FC<{}> = ({ children }) => {
  return <div className={css('module-outputs')}>{children}</div>
}

export const ModuleInputs: FC<{}> = ({ children }) => {
  return <div className={css('module-inputs')}>{children}</div>
}

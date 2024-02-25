import { FC } from 'kaiku'
import * as styles from './ModuleSockets.css'

export const ModuleOutputs: FC<{}> = ({ children }) => {
  return <div class={styles.moduleOutputs}>{children}</div>
}

export const ModuleInputs: FC<{}> = ({ children }) => {
  return <div class={styles.moduleInputs}>{children}</div>
}

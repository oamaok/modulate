import { FC } from 'kaiku'
import * as styles from './ModuleSockets.css'

export const ModuleOutputs: FC<{}> = ({ children }) => {
  return <div className={styles.moduleOutputs}>{children}</div>
}

export const ModuleInputs: FC<{}> = ({ children }) => {
  return <div className={styles.moduleInputs}>{children}</div>
}

import { FC } from 'kaiku'
import * as styles from './ModuleControls.css'

const ModuleControls: FC<{}> = ({ children }) => {
  return <div class={styles.moduleControls}>{children}</div>
}

export default ModuleControls

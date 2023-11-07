import state from '../../state'
import * as styles from './PatchSettings.css'
import Overlay from '../overlay/Overlay'

const PatchSettings = () => {
  return (
    <Overlay className={styles.patchSettings}>
      <h2>Patch settings</h2>
      <hr />

      <div>
        <label>Patch name</label>
        <input
          type="text"
          value={state.patchMetadata.name}
          onInput={(evt: InputEvent) => {
            state.patchMetadata.name = (evt.target as HTMLInputElement).value
          }}
        />
      </div>
    </Overlay>
  )
}

export default PatchSettings

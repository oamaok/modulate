import state from '../../state'
import css from './PatchSettings.css'
import Overlay from '../overlay/Overlay'

const PatchSettings = () => {
  return (
    <Overlay className={css('patch-settings')}>
      <h2>Patch settings</h2>
      <hr />

      <div className={css('input-group')}>
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

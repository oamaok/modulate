import { useState, useRef } from 'kaiku'
import * as api from '../../api'
import * as auth from '../../auth'
import state, { closeOverlay } from '../../state'
import css from './PatchSettings.css'
import assert from '../../assert'
import Input from '../input/Input'
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
